export class CommitDataManager {
  constructor(gitHistoryView) {
    this.view = gitHistoryView;
  }

  async loadCommits() {
    if (!this.view.call) {
      console.log('GitHistoryView: JRPC not ready yet, will retry when connection is established');
      return;
    }

    this.view.loading = true;
    this.view.error = null;
    this.view.page = 1;
    this.view.hasMoreCommits = true;
    this.view.totalCommitsLoaded = 0;
    
    const methodsList = [
      'Repo.get_commit_history', 
      'Git.get_history', 
      'Git.get_commits', 
      'Repo.get_commits', 
      'Git.log',
      'Git.history'
    ];
    
    let methodToCall = null;
    for (const method of methodsList) {
      if (this.view.call[method]) {
        methodToCall = method;
        console.log(`Found git history method: ${methodToCall}`);
        break;
      }
    }
    
    if (!methodToCall) {
      console.error('No git history method found. Available methods:', Object.keys(this.view.call));
      this.view.error = 'Could not find git history method in API';
      this.view.loading = false;
      return;
    }

    try {
      console.log(`GitHistoryView: Calling ${methodToCall} with pageSize=${this.view.pageSize}, skip=0`);
      
      const response = await this.view.call[methodToCall](this.view.pageSize, null, 0);
      
      this.view.commits = this.extractCommitsFromResponse(response);
      this.view.totalCommitsLoaded = this.view.commits.length;
      console.log(`GitHistoryView: Extracted ${this.view.commits.length} commits`);
      
      if (this.view.commits.length > 0) {
        this.view.toCommit = this.view.commits[0].hash;
        
        if (this.view.commits.length > 1) {
          this.view.fromCommit = this.view.commits[1].hash;
        } else {
          this.view.fromCommit = this.view.commits[0].hash;
          this.view.hasMoreCommits = false;
        }
      }
      
      if (this.view.commits.length < this.view.pageSize) {
        this.view.hasMoreCommits = false;
      }
      
    } catch (error) {
      console.error('Error loading commits:', error);
      this.view.error = `Failed to load commit history: ${error.message}`;
    } finally {
      this.view.loading = false;
      this.view.requestUpdate();
    }
  }

  async loadMoreCommits() {
    this.view.loadingMore = true;
    
    try {
      const skip = this.view.totalCommitsLoaded;
      const response = await this.view.call['Repo.get_commit_history'](this.view.pageSize, null, skip);
      const newCommits = this.extractCommitsFromResponse(response);
      
      if (!newCommits || newCommits.length === 0) {
        this.view.hasMoreCommits = false;
      } else {
        const existingHashes = new Set(this.view.commits.map(c => c.hash));
        const uniqueNewCommits = newCommits.filter(c => !existingHashes.has(c.hash));
        
        if (uniqueNewCommits.length === 0) {
          this.view.hasMoreCommits = false;
        } else {
          this.view.commits = [...this.view.commits, ...uniqueNewCommits];
          this.view.totalCommitsLoaded += uniqueNewCommits.length;
          this.view.page += 1;
          
          if (newCommits.length < this.view.pageSize) {
            this.view.hasMoreCommits = false;
          }
        }
      }
    } catch (error) {
      console.error('Error loading more commits:', error);
    } finally {
      this.view.loadingMore = false;
      this.view.requestUpdate();
    }
  }

  handleScroll(event) {
    if (this.view.loading || this.view.loadingMore || !this.view.hasMoreCommits) return;
    
    const { distanceFromBottom } = event.detail;
    
    if (distanceFromBottom < 100) {
      this.loadMoreCommits();
    }
  }

  async loadGitLogManually() {
    this.view.loading = true;
    
    try {
      const response = await this.view.call['Execute.run_command']('git log --format="%H|%an|%ad|%s" --date=iso');
      const commits = this.extractCommitsFromResponse(response);
      
      if (commits.length > 0) {
        this.view.commits = commits;
        this.view.totalCommitsLoaded = commits.length;
        
        this.view.toCommit = this.view.commits[0].hash;
        if (this.view.commits.length > 1) {
          this.view.fromCommit = this.view.commits[1].hash;
        } else {
          this.view.fromCommit = this.view.commits[0].hash;
        }
        this.view.requestUpdate();
      }
    } catch (error) {
      console.error('Error loading git log manually:', error);
    } finally {
      this.view.loading = false;
    }
  }

  sortCommitsByDate(commits) {
    return commits.sort((a, b) => {
      // Parse dates and sort newest first
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      // If dates are invalid, fall back to string comparison
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return b.date.localeCompare(a.date);
      }
      
      return dateB.getTime() - dateA.getTime();
    });
  }

  extractCommitsFromResponse(response) {
    if (!response) return [];
    
    let commits = [];
    
    if (typeof response === 'string' && response.includes('|')) {
      try {
        const lines = response.trim().split('\n');
        commits = lines.map(line => {
          const [hash, author, dateStr, ...messageParts] = line.split('|');
          const message = messageParts.join('|');
          return {
            hash,
            author,
            date: dateStr,
            message: message || '(no message)'
          };
        }).filter(commit => commit.hash && commit.hash.length > 0);
        
        return this.sortCommitsByDate(commits);
      } catch (e) {
        console.error('Failed to parse git log output:', e);
      }
    }
    
    if (Array.isArray(response)) {
      return this.sortCommitsByDate(response);
    }
    
    if (typeof response === 'string') {
      try {
        const parsedResponse = JSON.parse(response);
        return this.extractCommitsFromResponse(parsedResponse);
      } catch (e) {
        console.log('Failed to parse string response as JSON');
      }
    }
    
    if (typeof response === 'object') {
      const keys = Object.keys(response);
      
      if (response.hash && response.author && response.message) {
        return [response];
      }
      
      if (keys.length === 1 && Array.isArray(response[keys[0]])) {
        return this.sortCommitsByDate(response[keys[0]]);
      }
      
      for (const propName of ['data', 'results', 'commits', 'history', 'log']) {
        if (response[propName] && Array.isArray(response[propName])) {
          return this.sortCommitsByDate(response[propName]);
        }
      }
      
      if (response.success === true && response.data) {
        if (Array.isArray(response.data)) {
          return this.sortCommitsByDate(response.data);
        } else if (typeof response.data === 'object') {
          return this.extractCommitsFromResponse(response.data);
        }
      }
      
      for (const key of keys) {
        if (Array.isArray(response[key]) && response[key].length > 0) {
          return this.sortCommitsByDate(response[key]);
        }
      }
    }
    
    return [];
  }
}
