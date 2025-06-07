export class GitStatusManager {
  constructor() {
    this.gitStatus = {};
    this.modifiedFiles = [];
    this.stagedFiles = [];
    this.untrackedFiles = [];
  }

  loadGitStatus(statusResponse) {
    try {
      console.log('Processing git status data');
      console.log('Raw status response:', statusResponse);
      
      let status = this.extractStatusFromResponse(statusResponse);
      
      console.log('Processed status:', status);
      this.gitStatus = status;
      
      // Extract file arrays for easier access
      this.modifiedFiles = status.modified_files || [];
      this.stagedFiles = status.staged_files || [];
      this.untrackedFiles = status.untracked_files || [];
      
      console.log('Git status loaded:', {
        branch: status.branch,
        isDirty: status.is_dirty,
        modified: this.modifiedFiles.length,
        staged: this.stagedFiles.length,
        untracked: this.untrackedFiles.length,
        raw: status
      });
      
      return true;
    } catch (error) {
      console.error('Error loading Git status:', error);
      throw new Error(`Failed to load Git status: ${error.message}`);
    }
  }

  extractStatusFromResponse(statusResponse) {
    let status = {};
    
    if (statusResponse && typeof statusResponse === 'object') {
      // Check if this is a direct response with known properties
      if ('branch' in statusResponse || 'is_dirty' in statusResponse) {
        status = statusResponse;
      }
      // Check if this is a wrapped response with a UUID key
      else {
        const keys = Object.keys(statusResponse);
        for (const key of keys) {
          if (statusResponse[key] && typeof statusResponse[key] === 'object') {
            status = statusResponse[key];
            break;
          }
        }
      }
    }
    
    return status;
  }

  getFileGitStatus(filePath) {
    if (this.stagedFiles.includes(filePath)) {
      return 'staged';
    } else if (this.modifiedFiles.includes(filePath)) {
      return 'modified';
    } else if (this.untrackedFiles.includes(filePath)) {
      return 'untracked';
    }
    return 'clean';
  }

  getGitStatusSymbol(status) {
    switch (status) {
      case 'modified': return 'M';
      case 'staged': return 'S';
      case 'untracked': return '?';
      default: return '';
    }
  }

  getModifiedFilePaths() {
    return [...this.modifiedFiles, ...this.stagedFiles];
  }

  getBranchInfo() {
    return {
      branch: this.gitStatus.branch,
      isDirty: this.gitStatus.is_dirty
    };
  }
}
