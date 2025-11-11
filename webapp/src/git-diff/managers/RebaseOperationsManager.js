import {extractResponseData} from '../../Utils.js';

export class RebaseOperationsManager {
  constructor(gitDiffView) {
    this.view = gitDiffView;
  }

  async startInteractiveRebase() {
    if (!this.view.fromCommit || !this.view.toCommit) {
      this.view.error = 'Both commits must be selected for rebase';
      return;
    }

    if (!this.view.call || !this.view.call['Repo.start_interactive_rebase']) {
      this.view.error = 'JRPC not ready for interactive rebase';
      return;
    }

    try {
      this.view.loading = true;
      this.view.error = null;
      
      console.log('GitDiffView: Starting interactive rebase from', this.view.fromCommit, 'to', this.view.toCommit);
      const response = await this.view.call['Repo.start_interactive_rebase'](this.view.fromCommit, this.view.toCommit);
      console.log('GitDiffView: Interactive rebase response:', response);
      
      const data = extractResponseData(response);
      console.log('GitDiffView: Extracted data:', data);
      
      if (data && (data.success === true || (data.success === undefined && data.commits))) {
        // Batch update rebase state
        this.view.updateRebaseState({
          rebaseMode: true,
          rebasePlan: data.commits || [],
          rebaseInProgress: false,
          currentRebaseStep: 0
        });
        console.log('GitDiffView: Rebase plan loaded with', this.view.rebasePlan.length, 'commits');
      } else if (data && data.success === false) {
        this.view.error = data.error || 'Failed to start interactive rebase';
        console.error('GitDiffView: Rebase failed with error:', data.error);
      } else {
        this.view.error = 'Unexpected response format from interactive rebase';
        console.error('GitDiffView: Unexpected response format:', data);
      }
    } catch (error) {
      console.error('GitDiffView: Error starting interactive rebase:', error);
      this.view.error = `Failed to start rebase: ${error.message}`;
    } finally {
      this.view.loading = false;
      this.view.requestUpdate();
    }
  }

  async executeRebase() {
    if (!this.view.rebasePlan.length) return;

    if (!this.view.call || !this.view.call['Repo.execute_rebase']) {
      this.view.error = 'JRPC not ready for rebase execution';
      return;
    }

    try {
      this.view.loading = true;
      this.view.rebaseInProgress = true;
      this.view.error = null;
      
      console.log('GitDiffView: Executing rebase with plan:', this.view.rebasePlan);
      const response = await this.view.call['Repo.execute_rebase'](this.view.rebasePlan);
      console.log('GitDiffView: Execute rebase response:', response);
      
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        if (data.conflicts && data.conflicts.length > 0) {
          // Batch update conflict state
          this.view.updateRebaseState({
            hasConflicts: true,
            conflictFiles: data.conflicts,
            currentRebaseStep: data.currentStep || 0
          });
          
          if (this.view.conflictFiles.length > 0) {
            this.view.selectedFile = this.view.conflictFiles[0];
            await this.view.dataManager.loadConflictContent();
          }
        } else {
          this.completeRebase();
        }
      } else {
        this.view.error = data?.error || 'Rebase execution failed';
        this.view.rebaseInProgress = false;
      }
    } catch (error) {
      console.error('GitDiffView: Error executing rebase:', error);
      this.view.error = `Rebase execution failed: ${error.message}`;
      this.view.rebaseInProgress = false;
    } finally {
      this.view.loading = false;
      this.view.requestUpdate();
    }
  }

  async continueRebase() {
    if (!this.view.call || !this.view.call['Repo.continue_rebase']) {
      this.view.error = 'JRPC not ready to continue rebase';
      return;
    }

    try {
      this.view.loading = true;
      this.view.error = null;
      
      console.log('GitDiffView: User manually continuing rebase');
      const response = await this.view.call['Repo.continue_rebase']();
      const data = extractResponseData(response);
      
      console.log('GitDiffView: Continue rebase response:', data);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        if (data.conflicts && data.conflicts.length > 0) {
          // Batch update conflict state
          this.view.updateRebaseState({
            hasConflicts: true,
            conflictFiles: data.conflicts,
            currentRebaseStep: data.currentStep || this.view.currentRebaseStep + 1,
            rebaseCompleting: false
          });
          
          if (this.view.conflictFiles.length > 0) {
            this.view.selectedFile = this.view.conflictFiles[0];
            await this.view.dataManager.loadConflictContent();
          }
        } else {
          this.completeRebase();
        }
      } else {
        this.view.error = data?.error || 'Failed to continue rebase';
        this.view.rebaseMessage = data?.error || 'Failed to continue rebase';
        
        const statusCheck = await this.view.call['Repo.get_rebase_status']();
        const statusData = extractResponseData(statusCheck);
        
        if (!statusData || !statusData.in_rebase) {
          console.log('GitDiffView: Rebase appears to be complete');
          this.completeRebase();
        }
      }
    } catch (error) {
      console.error('GitDiffView: Error continuing rebase:', error);
      this.view.error = `Failed to continue rebase: ${error.message}`;
      this.view.re

Message = `Failed to continue rebase: ${error.message}`;
    } finally {
      this.view.loading = false;
      this.view.requestUpdate();
    }
  }

  async abortRebase() {
    if (!this.view.call || !this.view.call['Repo.abort_rebase']) {
      this.view.error = 'JRPC not ready to abort rebase';
      return;
    }

    try {
      this.view.loading = true;
      
      const response = await this.view.call['Repo.abort_rebase']();
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        this.view.resetRebaseState();
        console.log('GitDiffView: Rebase aborted successfully');
      } else {
        this.view.error = data?.error || 'Failed to abort rebase';
      }
    } catch (error) {
      console.error('GitDiffView: Error aborting rebase:', error);
      this.view.error = `Failed to abort rebase: ${error.message}`;
    } finally {
      this.view.loading = false;
      this.view.requestUpdate();
    }
  }

  completeRebase() {
    this.view.resetRebaseState();
    
    this.view.dispatchEvent(new CustomEvent('rebase-complete', {
      detail: { message: 'Rebase completed successfully' }
    }));
  }
}
