import {extractResponseData} from '../../Utils.js';

export class CommitOperationsManager {
  constructor(gitDiffView) {
    this.view = gitDiffView;
  }

  async commitChanges() {
    if (!this.view.call || !this.view.call['Repo.commit_staged_changes']) {
      this.view.error = 'JRPC not ready to commit changes';
      return;
    }

    try {
      this.view.loading = true;
      this.view.error = null;
      
      const response = await this.view.call['Repo.commit_staged_changes']();
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        this.view.rebaseMessage = "Changes committed. You can now continue the rebase.";
      } else {
        this.view.error = data?.error || 'Failed to commit changes';
      }
    } catch (error) {
      console.error('GitDiffView: Error committing changes:', error);
      this.view.error = `Failed to commit changes: ${error.message}`;
    } finally {
      this.view.loading = false;
      this.view.requestUpdate();
    }
  }

  async commitAmend() {
    if (!this.view.call || !this.view.call['Repo.commit_amend']) {
      this.view.error = 'JRPC not ready to amend commit';
      return;
    }

    try {
      this.view.loading = true;
      this.view.error = null;
      
      const response = await this.view.call['Repo.commit_amend']();
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        this.view.rebaseMessage = "Commit amended. You can now continue the rebase.";
      } else {
        this.view.error = data?.error || 'Failed to amend commit';
      }
    } catch (error) {
      console.error('GitDiffView: Error amending commit:', error);
      this.view.error = `Failed to amend commit: ${error.message}`;
    } finally {
      this.view.loading = false;
      this.view.requestUpdate();
    }
  }
}
