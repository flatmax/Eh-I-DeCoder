export class BranchManager {
  constructor(gitHistoryView) {
    this.view = gitHistoryView;
  }

  async loadBranches() {
    if (!this.view.isConnected || !this.view.call) {
      console.warn('Cannot load branches - not connected');
      return;
    }

    try {
      console.log('GitHistoryView: Loading branches...');
      
      // Try different possible method names
      const methodsList = ['Repo.get_branches', 'Git.get_branches', 'Git.branches', 'Repo.list_branches'];
      let methodToCall = null;
      
      for (const method of methodsList) {
        if (this.view.call[method]) {
          methodToCall = method;
          console.log(`Found git branches method: ${methodToCall}`);
          break;
        }
      }
      
      if (!methodToCall) {
        console.warn('No git branches method found. Branch selection will not be available.');
        return;
      }

      const response = await this.view.call[methodToCall]();
      const branches = this.extractBranchesFromResponse(response);
      
      console.log(`GitHistoryView: Loaded ${branches.length} branches`);
      this.view.branches = branches;
      
    } catch (error) {
      console.error('Error loading branches:', error);
      // Don't show error to user - branch selection is optional
    }
  }

  extractBranchesFromResponse(response) {
    if (!response) return [];
    
    // Handle direct array response
    if (Array.isArray(response)) {
      return response;
    }
    
    // Handle wrapped response
    if (typeof response === 'object') {
      const keys = Object.keys(response);
      
      // Check for common property names
      for (const propName of ['branches', 'data', 'results', 'list']) {
        if (response[propName] && Array.isArray(response[propName])) {
          return response[propName];
        }
      }
      
      // Check for UUID-wrapped response
      if (keys.length === 1 && Array.isArray(response[keys[0]])) {
        return response[keys[0]];
      }
    }
    
    return [];
  }

  async resolveBranchToCommit(branchName) {
    if (!this.view.isConnected || !this.view.call) {
      console.warn('Cannot resolve branch - not connected');
      return null;
    }

    try {
      // Try to find a method to resolve branch to commit
      const methodsList = ['Repo.get_branch_commit', 'Git.rev_parse', 'Repo.resolve_ref'];
      let methodToCall = null;
      
      for (const method of methodsList) {
        if (this.view.call[method]) {
          methodToCall = method;
          break;
        }
      }
      
      if (!methodToCall) {
        console.warn('No method found to resolve branch to commit');
        return null;
      }

      const response = await this.view.call[methodToCall](branchName);
      
      // Extract commit hash from response
      if (typeof response === 'string') {
        return response.trim();
      } else if (response && typeof response === 'object') {
        // Check for common property names
        for (const prop of ['commit', 'hash', 'sha', 'oid']) {
          if (response[prop]) {
            return response[prop];
          }
        }
        // Check for UUID-wrapped response
        const keys = Object.keys(response);
        if (keys.length === 1 && typeof response[keys[0]] === 'string') {
          return response[keys[0]].trim();
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error resolving branch to commit:', error);
      return null;
    }
  }

  async handleFromBranchSelect(branch) {
    if (!branch || !branch.name) return;
    
    // Check if this branch's commit is allowed
    if (this.view.toCommit && branch.commit && !this.view.selectionValidator.isCommitAllowedForFrom(branch.commit)) {
      console.log('Cannot select branch newer than the "to" commit');
      return;
    }
    
    this.view.fromBranch = branch.name;
    this.view.fromCommit = branch.commit || await this.resolveBranchToCommit(branch.name);
    this.view.requestUpdate();
  }

  async handleToBranchSelect(branch) {
    if (!branch || !branch.name) return;
    
    // Check if this branch's commit is allowed
    if (this.view.fromCommit && branch.commit && !this.view.selectionValidator.isCommitAllowedForTo(branch.commit)) {
      console.log('Cannot select branch older than the "from" commit');
      return;
    }
    
    this.view.toBranch = branch.name;
    this.view.toCommit = branch.commit || await this.resolveBranchToCommit(branch.name);
    
    // If the current fromCommit is now newer than the new toCommit, clear it
    if (this.view.fromCommit && !this.view.selectionValidator.isCommitAllowedForFrom(this.view.fromCommit)) {
      this.view.fromCommit = '';
      this.view.fromBranch = '';
    }
    
    this.view.requestUpdate();
  }

  getDisabledBranchesForFrom() {
    if (!this.view.toCommit) return new Set();
    
    const disabledBranches = new Set();
    
    for (const branch of this.view.branches) {
      if (branch.commit && !this.view.selectionValidator.isCommitAllowedForFrom(branch.commit)) {
        disabledBranches.add(branch.name);
      }
    }
    
    return disabledBranches;
  }

  getDisabledBranchesForTo() {
    if (!this.view.fromCommit) return new Set();
    
    const disabledBranches = new Set();
    
    for (const branch of this.view.branches) {
      if (branch.commit && !this.view.selectionValidator.isCommitAllowedForTo(branch.commit)) {
        disabledBranches.add(branch.name);
      }
    }
    
    return disabledBranches;
  }
}
