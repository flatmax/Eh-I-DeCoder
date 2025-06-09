import {LitElement, html, css} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import {JRPCClient} from '@flatmax/jrpc-oo';
import './CommitList.js';
import './GitMergeView.js';

export class GitHistoryView extends JRPCClient {
  static properties = {
    serverURI: { type: String },
    fromCommit: { type: String, state: true },
    toCommit: { type: String, state: true },
    commits: { type: Array, state: true },
    loading: { type: Boolean, state: true },
    loadingMore: { type: Boolean, state: true },
    error: { type: String, state: true },
    leftPanelWidth: { type: Number, state: true },
    rightPanelWidth: { type: Number, state: true },
    isDraggingLeft: { type: Boolean, state: true },
    isDraggingRight: { type: Boolean, state: true },
    page: { type: Number, state: true },
    hasMoreCommits: { type: Boolean, state: true },
    pageSize: { type: Number, state: true }
  };

  constructor() {
    super();
    this.fromCommit = '';
    this.toCommit = '';
    this.commits = [];
    this.loading = false;
    this.loadingMore = false;
    this.error = null;
    this.leftPanelWidth = 300;
    this.rightPanelWidth = 300;
    this.isDraggingLeft = false;
    this.isDraggingRight = false;
    this.page = 1;
    this.hasMoreCommits = true;
    this.pageSize = 50; // Default page size

    // Bind methods
    this.handleFromCommitSelect = this.handleFromCommitSelect.bind(this);
    this.handleToCommitSelect = this.handleToCommitSelect.bind(this);
    this.handleLeftMouseDown = this.handleLeftMouseDown.bind(this);
    this.handleRightMouseDown = this.handleRightMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleCommitListScroll = this.handleCommitListScroll.bind(this);
  }

  static styles = css`
    :host {
      display: flex;
      height: 100vh;
      overflow: hidden;
      font-family: sans-serif;
    }

    .git-history-container {
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .commit-panel {
      display: flex;
      flex-direction: column;
      background: #f8f9fa;
      border: 1px solid #e1e4e8;
      overflow: hidden;
    }

    .commit-panel-header {
      padding: 12px 16px;
      background: #f1f3f4;
      border-bottom: 1px solid #e1e4e8;
      font-weight: 600;
      font-size: 14px;
      color: #24292e;
      text-align: right;
    }

    .left-panel {
      min-width: 200px;
    }

    .right-panel {
      min-width: 200px;
    }

    .center-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 400px;
      overflow: hidden;
    }

    .resize-handle {
      width: 5px;
      background-color: #ddd;
      cursor: col-resize;
      transition: background-color 0.2s;
      z-index: 10;
      flex-shrink: 0;
    }

    .resize-handle:hover,
    .resize-handle.active {
      background-color: #2196F3;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #666;
      font-style: italic;
    }

    .error {
      padding: 16px;
      background: #fff5f5;
      border: 1px solid #fed7d7;
      border-radius: 4px;
      color: #c53030;
      margin: 16px;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #666;
      text-align: center;
      padding: 20px;
      font-style: italic;
    }

    .selected-commits {
      padding: 8px 16px;
      background: #e8f4fd;
      border-bottom: 1px solid #b8daff;
      font-size: 12px;
      color: #0366d6;
    }
    
    .loading-more {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      color: #666;
      font-style: italic;
      background: #f5f5f5;
      border-top: 1px solid #e1e4e8;
    }
    
    .loading-more-spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-top: 2px solid #0366d6;
      border-radius: 50%;
      margin-right: 8px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .notification-banner {
      background-color: #fff3cd;
      color: #856404;
      padding: 8px 16px;
      border: 1px solid #ffeeba;
      margin: 8px 16px;
      border-radius: 4px;
      text-align: center;
      width: calc(100% - 32px);
      box-sizing: border-box;
    }
    
    .notification-banner p {
      margin: 4px 0;
    }
    
    .manual-refresh-button {
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      margin-top: 8px;
      cursor: pointer;
      font-size: 14px;
    }
    
    .manual-refresh-button:hover {
      background-color: #0069d9;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    // Add global mouse event listeners for resize
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }
  
  /**
   * Handle scroll events on the commit list panels
   * Used to implement infinite scrolling/pagination
   */
  handleCommitListScroll(event) {
    // Don't trigger loading if we're already loading or there are no more commits
    if (this.loading || this.loadingMore || !this.hasMoreCommits) return;
    
    const target = event.target;
    // Check if we've scrolled close to the bottom (within 100px)
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    
    if (isNearBottom) {
      console.log('Near bottom of commit list, loading more commits');
      this.loadMoreCommits();
    }
  }
  
  /**
   * Load more commits when scrolling to the bottom
   */
  async loadMoreCommits() {
    // Set loading state
    this.loadingMore = true;
    
    try {
      // Calculate skip value for pagination (page - 1) * pageSize
      const skip = (this.page - 1) * this.pageSize;
      
      console.log(`Loading more commits (page ${this.page + 1}, skip ${skip})`);
      
      // Call backend with proper pagination parameters
      const response = await this.call['Repo.get_commit_history'](this.pageSize, null);
      const newCommits = this.extractCommitsFromResponse(response);
      
      // If we got no new commits or less than expected, mark as no more to load
      if (!newCommits || newCommits.length === 0) {
        this.hasMoreCommits = false;
        console.log('No more commits to load');
      } else {
        // Append new commits to the existing list
        this.commits = [...this.commits, ...newCommits];
        console.log(`Added ${newCommits.length} more commits`);
        
        // Increment page for next load
        this.page += 1;
        
        // If we got fewer commits than page size, no more to load
        if (newCommits.length < this.pageSize) {
          this.hasMoreCommits = false;
        }
      }
    } catch (error) {
      console.error('Error loading more commits:', error);
      // Don't show error in UI for pagination, just log it
    } finally {
      this.loadingMore = false;
      this.requestUpdate();
    }
  }

  // Override setupDone to load commits when JRPC connection is ready
  setupDone() {
    super.setupDone?.();
    console.log('GitHistoryView: JRPC connection ready, loading commits');
    // Use setTimeout to ensure RPC methods are fully registered
    setTimeout(() => this.loadCommits(), 500);
  }
  
  // Also handle remoteIsUp event
  remoteIsUp() {
    if (super.remoteIsUp) super.remoteIsUp();
    console.log('GitHistoryView: Remote is up');
    // Delay loading commits to ensure RPC methods are available
    setTimeout(() => this.loadCommits(), 500);
  }

  async loadCommits() {
    // Check if JRPC connection is ready
    if (!this.call) {
      console.log('GitHistoryView: JRPC not ready yet, will retry when connection is established');
      return;
    }

    this.loading = true;
    this.error = null;
    // Reset pagination state when loading commits from scratch
    this.page = 1;
    this.hasMoreCommits = true;
    
    // Define all possible method names for getting git history
    const methodsList = [
      'Repo.get_commit_history', 
      'Git.get_history', 
      'Git.get_commits', 
      'Repo.get_commits', 
      'Git.log',
      'Git.history'
    ];
    
    // Find available method
    let methodToCall = null;
    for (const method of methodsList) {
      if (this.call[method]) {
        methodToCall = method;
        console.log(`Found git history method: ${methodToCall}`);
        break;
      }
    }
    
    // If no method is found
    if (!methodToCall) {
      console.error('No git history method found. Available methods:', Object.keys(this.call));
      this.error = 'Could not find git history method in API';
      this.loading = false;
      return;
    }

    try {
      console.log(`GitHistoryView: Calling ${methodToCall} with pageSize=${this.pageSize}`);
      
      // Call the backend method with proper parameters (max_count, branch)
      const response = await this.call[methodToCall](this.pageSize, null);
      
      console.log('GitHistoryView: Received response type:', typeof response);
      
      this.commits = this.extractCommitsFromResponse(response);
      console.log(`GitHistoryView: Extracted ${this.commits.length} commits:`, 
        this.commits.map(c => `${c.hash?.substring(0, 7)}: ${c.message?.substring(0, 20)}...`));
      
      if (this.commits.length > 0) {
        console.log('First commit:', this.commits[0]);
        
        // Set initial commits if we have any
        this.toCommit = this.commits[0].hash; // HEAD
        
        // Make sure we have at least 2 commits and handle edge cases
        if (this.commits.length > 1) {
          console.log('Second commit:', this.commits[1]);
          this.fromCommit = this.commits[1].hash;
        } else {
          // Single commit case - use it for both from/to
          console.log('Only one commit found, using it for both from/to');
          this.fromCommit = this.commits[0].hash;
          // Force hasMoreCommits to false in single commit case
          this.hasMoreCommits = false;
        }
        
        // In the case of a single commit, we'll compare the commit to itself
        // This is expected behavior for repositories with only one commit
        if (this.commits.length === 1) {
          console.log('Repository has only one commit - showing self comparison');
          // In single commit case, both fromCommit and toCommit point to the same commit
          // The UI will show the contents of that single commit
        }
      } else {
        console.log('No commits extracted from response');
      }
      
      // If we got fewer commits than expected, there might not be more to load
      if (this.commits.length < this.pageSize) {
        this.hasMoreCommits = false;
        console.log('No more commits to load (received fewer than page size)');
      }
      
    } catch (error) {
      console.error('Error loading commits:', error);
      this.error = `Failed to load commit history: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  extractCommitsFromResponse(response) {
    // Handle different response formats
    if (!response) {
      console.log('Response was null or undefined');
      return [];
    }
    
    console.log('Raw response type:', typeof response);
    
    // Handle git log command output (string with multiple lines)
    if (typeof response === 'string' && response.includes('|')) {
      try {
        console.log('Detected git log command output format');
        // Process git log command output format: "%H|%an|%ad|%s"
        const lines = response.trim().split('\n');
        const commits = lines.map(line => {
          const [hash, author, dateStr, ...messageParts] = line.split('|');
          const message = messageParts.join('|'); // Rejoin message parts if it contained '|'
          return {
            hash,
            author,
            date: dateStr,
            message: message || '(no message)'
          };
        }).filter(commit => commit.hash && commit.hash.length > 0);
        
        console.log(`Parsed ${commits.length} commits from git log output`);
        return commits;
      } catch (e) {
        console.error('Failed to parse git log output:', e);
      }
    }
    
    // Handle direct array responses
    if (Array.isArray(response)) {
      console.log(`Response is an array with ${response.length} items`);
      return response;
    }
    
    // Handle string responses that might be JSON
    if (typeof response === 'string') {
      try {
        const parsedResponse = JSON.parse(response);
        console.log('Parsed string response into object');
        // Recursively call with parsed object
        return this.extractCommitsFromResponse(parsedResponse);
      } catch (e) {
        console.log('Failed to parse string response as JSON');
      }
    }
    
    // Handle UUID-wrapped responses and other object formats
    if (typeof response === 'object') {
      const keys = Object.keys(response);
      console.log(`Response is an object with keys: ${keys.join(', ')}`);
      
      // Check if response itself is a commit-like object
      if (response.hash && response.author && response.message) {
        console.log('Response appears to be a single commit object');
        return [response]; // Return as array with single commit
      }
      
      // Handle UUID-wrapped responses
      if (keys.length === 1 && Array.isArray(response[keys[0]])) {
        console.log(`Found array under key ${keys[0]} with ${response[keys[0]].length} items`);
        return response[keys[0]];
      }
      
      // Common response patterns
      for (const propName of ['data', 'results', 'commits', 'history', 'log']) {
        if (response[propName] && Array.isArray(response[propName])) {
          console.log(`Found array in ${propName} property with ${response[propName].length} items`);
          return response[propName];
        }
      }
      
      // Check if response is structured as {success: true, data: [...]}
      if (response.success === true && response.data) {
        if (Array.isArray(response.data)) {
          console.log(`Found array in successful response data with ${response.data.length} items`);
          return response.data;
        } else if (typeof response.data === 'object') {
          // Try to extract from nested data object
          return this.extractCommitsFromResponse(response.data);
        }
      }
      
      // Last resort: look for any array property
      for (const key of keys) {
        if (Array.isArray(response[key]) && response[key].length > 0) {
          console.log(`Found array in property ${key} with ${response[key].length} items`);
          return response[key];
        }
      }
    }
    
    console.log('Could not extract commits from response');
    return [];
  }

  handleFromCommitSelect(event) {
    this.fromCommit = event.detail.commitHash;
    this.requestUpdate();
  }

  handleToCommitSelect(event) {
    this.toCommit = event.detail.commitHash;
    this.requestUpdate();
  }

  handleLeftMouseDown(event) {
    if (event.button !== 0) return;
    this.isDraggingLeft = true;
    event.preventDefault();
  }

  handleRightMouseDown(event) {
    if (event.button !== 0) return;
    this.isDraggingRight = true;
    event.preventDefault();
  }

  handleMouseMove(event) {
    if (!this.isDraggingLeft && !this.isDraggingRight) return;

    const containerRect = this.getBoundingClientRect();
    
    if (this.isDraggingLeft) {
      const newWidth = Math.max(200, Math.min(600, event.clientX - containerRect.left));
      this.leftPanelWidth = newWidth;
    }
    
    if (this.isDraggingRight) {
      const newWidth = Math.max(200, Math.min(600, containerRect.right - event.clientX));
      this.rightPanelWidth = newWidth;
    }
    
    this.requestUpdate();
  }

  handleMouseUp() {
    this.isDraggingLeft = false;
    this.isDraggingRight = false;
    this.requestUpdate();
  }

  renderEmptyState() {
    if (this.commits.length === 0) {
      return html`
        <div class="empty-state">
          <p>No commits found in this repository.</p>
          <p>Make your first commit to see history.</p>
        </div>
      `;
    }
    
    return null;
  }
  
  renderSingleCommitWarning() {
    if (this.commits.length === 1) {
      const commit = this.commits[0];
      return html`
        <div class="notification-banner">
          <p><strong>Only one commit available: ${commit.hash?.substring(0, 7) || 'Unknown'}</strong></p>
          <p>${commit.message || 'No message'} (${commit.author || 'Unknown author'})</p>
          <p>This is showing the contents of the initial commit. Make more commits to see change comparisons.</p>
          <button @click=${this.loadGitLogManually} class="manual-refresh-button">
            Refresh Git History
          </button>
        </div>
      `;
    }
    return null;
  }
  
  async loadGitLogManually() {
    console.log('Manually refreshing git history');
    this.loading = true;
    
    try {
      // Try to get git log directly from command line
      const response = await this.call['Execute.run_command']('git log --format="%H|%an|%ad|%s" --date=iso');
      const commits = this.extractCommitsFromResponse(response);
      
      if (commits.length > 0) {
        this.commits = commits;
        console.log(`Loaded ${commits.length} commits manually`);
        
        // Set initial commits
        this.toCommit = this.commits[0].hash;
        if (this.commits.length > 1) {
          this.fromCommit = this.commits[1].hash;
        } else {
          this.fromCommit = this.commits[0].hash;
        }
        this.requestUpdate();
      } else {
        console.log('No commits found in manual refresh');
      }
    } catch (error) {
      console.error('Error loading git log manually:', error);
    } finally {
      this.loading = false;
    }
  }

  renderSelectedCommits() {
    if (!this.fromCommit || !this.toCommit) return '';
    
    const fromCommitObj = this.commits.find(c => c.hash === this.fromCommit);
    const toCommitObj = this.commits.find(c => c.hash === this.toCommit);
    
    return html`
      <div class="selected-commits">
        Comparing: ${fromCommitObj?.hash?.substring(0, 7) || 'Unknown'} → ${toCommitObj?.hash?.substring(0, 7) || 'Unknown'}
      </div>
    `;
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading commit history...</div>`;
    }

    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }
    
    // Debug output for commits
    console.log(`Rendering with ${this.commits?.length || 0} commits`);
    console.log('From commit:', this.fromCommit);
    console.log('To commit:', this.toCommit);

    const emptyState = this.renderEmptyState();
    if (emptyState) {
      return emptyState;
    }
    
    // Make sure we have required properties
    if (!this.fromCommit || !this.toCommit) {
      console.error('Missing from or to commit hash');
      return html`<div class="error">Missing commit references. Check console for details.</div>`;
    }
    
    // Show warning for single commit, but still render UI
    const singleCommitWarning = this.renderSingleCommitWarning();

    return html`
      <div class="git-history-container">
        <!-- Left Panel: From Commits -->
        <div class="commit-panel left-panel" style="width: ${this.leftPanelWidth}px;">
          <div class="commit-panel-header">From Commit (Older)</div>
          <commit-list
            .commits=${this.commits}
            .selectedCommit=${this.fromCommit}
            .serverURI=${this.serverURI}
            @commit-select=${this.handleFromCommitSelect}
            @scroll=${this.handleCommitListScroll}
          ></commit-list>
          ${this.loadingMore ? html`
            <div class="loading-more">
              <div class="loading-more-spinner"></div>
              Loading more commits...
            </div>
          ` : ''}
        </div>

        <!-- Left Resize Handle -->
        <div 
          class="resize-handle ${this.isDraggingLeft ? 'active' : ''}"
          @mousedown=${this.handleLeftMouseDown}
        ></div>

        <!-- Center Panel: Git Merge View -->
        <div class="center-panel">
          ${singleCommitWarning}
          ${this.renderSelectedCommits()}
          <git-merge-view
            .serverURI=${this.serverURI}
            .fromCommit=${this.fromCommit}
            .toCommit=${this.toCommit}
            .gitHistoryMode=${true}
          ></git-merge-view>
        </div>

        <!-- Right Resize Handle -->
        <div 
          class="resize-handle ${this.isDraggingRight ? 'active' : ''}"
          @mousedown=${this.handleRightMouseDown}
        ></div>

        <!-- Right Panel: To Commits -->
        <div class="commit-panel right-panel" style="width: ${this.rightPanelWidth}px;">
          <div class="commit-panel-header">To Commit (Newer)</div>
          <commit-list
            .commits=${this.commits}
            .selectedCommit=${this.toCommit}
            .serverURI=${this.serverURI}
            @commit-select=${this.handleToCommitSelect}
            @scroll=${this.handleCommitListScroll}
          ></commit-list>
          ${this.loadingMore ? html`
            <div class="loading-more">
              <div class="loading-more-spinner"></div>
              Loading more commits...
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('git-history-view', GitHistoryView);
