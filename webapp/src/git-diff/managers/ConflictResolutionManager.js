import {extractResponseData} from '../../Utils.js';

export class ConflictResolutionManager {
  constructor(gitDiffView) {
    this.view = gitDiffView;
  }

  async resolveConflict(resolution) {
    if (!this.view.selectedFile || !this.view.hasConflicts) return;

    if (!this.view.call || !this.view.call['Repo.resolve_conflict']) {
      this.view.error = 'JRPC not ready for conflict resolution';
      return;
    }

    try {
      this.view.loading = true;
      
      let resolvedContent = '';
      if (resolution === 'ours') {
        resolvedContent = this.view.fromContent;
      } else if (resolution === 'theirs') {
        resolvedContent = this.view.toContent;
      } else if (resolution === 'manual') {
        resolvedContent = this.view.viewManager.getCurrentContent();
      }
      
      const response = await this.view.call['Repo.resolve_conflict'](this.view.selectedFile, resolvedContent);
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        this.view.conflictFiles = this.view.conflictFiles.filter(f => f !== this.view.selectedFile);
        
        if (this.view.conflictFiles.length === 0) {
          await this.view.rebaseManager.continueRebase();
        } else {
          this.view.selectedFile = this.view.conflictFiles[0];
          await this.view.dataManager.loadConflictContent();
        }
      } else {
        this.view.error = data?.error || 'Failed to resolve conflict';
      }
    } catch (error) {
      console.error('GitDiffView: Error resolving conflict:', error);
      this.view.error = `Failed to resolve conflict: ${error.message}`;
    } finally {
      this.view.loading = false;
      this.view.requestUpdate();
    }
  }
}
