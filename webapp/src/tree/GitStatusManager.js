export class GitStatusManager {
  constructor() {
    this.gitStatus = {};
    this.modifiedFiles = [];
    this.stagedFiles = [];
    this.untrackedFiles = [];
    this.lineDiffs = {};
  }

  loadGitStatus(statusResponse) {
    try {
      let status = this.extractStatusFromResponse(statusResponse);
      
      this.gitStatus = status;
      
      // Extract file arrays for easier access
      this.modifiedFiles = status.modified_files || [];
      this.stagedFiles = status.staged_files || [];
      this.untrackedFiles = status.untracked_files || [];
      
      return true;
    } catch (error) {
      console.error('Error loading Git status:', error);
      throw new Error(`Failed to load Git status: ${error.message}`);
    }
  }

  loadLineDiffs(lineDiffsResponse) {
    try {
      let diffs = this.extractStatusFromResponse(lineDiffsResponse);
      this.lineDiffs = diffs || {};
      return true;
    } catch (error) {
      console.error('Error loading line diffs:', error);
      this.lineDiffs = {};
      return false;
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

  getLineDiff(filePath) {
    return this.lineDiffs[filePath] || null;
  }

  getLineDeltaDisplay(filePath) {
    const diff = this.lineDiffs[filePath];
    if (!diff) return null;
    
    const delta = diff.delta;
    if (delta === 0) return null;
    
    return {
      delta: delta,
      display: delta > 0 ? `+${delta}` : `${delta}`,
      isPositive: delta > 0
    };
  }

  getChangedFilePaths() {
    // Get all files that have changes (modified, staged, or untracked)
    return [...new Set([...this.modifiedFiles, ...this.stagedFiles, ...this.untrackedFiles])];
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
