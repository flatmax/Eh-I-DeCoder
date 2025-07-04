import {extractResponseData} from '../Utils.js';

export class GitDiffRebaseManager {
  constructor(GitDiffView) {
    this.view = GitDiffView;
  }

  async checkRebaseStatus() {
    if (!this.view.call || !this.view.call['Repo.get_rebase_status']) {
      return;
    }

    try {
      const response = await this.view.call['Repo.get_rebase_status']();
      const data = extractResponseData(response);
      
      console.log('GitDiffView: Rebase status check result:', data);
      
      if (data && data.in_rebase) {
        if (!this.view.rebaseStatus || !this.view.rebaseStatus.in_rebase) {
          console.log('GitDiffView: Detected new rebase in progress');
        }
        
        this.view.rebaseStatus = data;
        
        // Load git status when rebase is detected
        await this.loadGitStatus();
        
        if (data.rebase_type === 'interactive') {
          // Check for conflicts first
          if (data.has_todo_content && data.todo_content && data.todo_content.trim()) {
            // We have todo content - switch to git editor mode for rebase todo
            await this.handleGitEditorFile({
              primary_file: {
                type: 'rebase_todo',
                file: 'git-rebase-todo',
                content: data.todo_content,
                description: 'Interactive Rebase Todo File',
                instructions: 'Edit the rebase plan. Available commands: pick, drop, squash, edit, reword'
              }
            });
          } else {
            // No todo content - check for conflicts or completion
            await this.checkForRebaseConflicts();
            if (!this.view.hasConflicts) {
              console.log('GitDiffView: Rebase waiting for user action');
              // Batch update rebase state
              this.view.updateRebaseState({
                rebaseCompleting: true,
                rebaseInProgress: true,
                rebaseMessage: "Rebase is paused and waiting for user action. Use the controls below to continue.",
                showRawGitStatus: true
              });
            }
          }
        }
      } else {
        if (this.view.rebaseStatus && this.view.rebaseStatus.in_rebase) {
          console.log('GitDiffView: Rebase completed or aborted');
          this.resetRebaseState();
        }
        this.view.rebaseStatus = data;
      }

      // Check for Git editor files regardless of rebase status
      if (data && data.editor_status && data.editor_status.waiting_for_editor) {
        await this.handleGitEditorFile(data.editor_status);
      } else if (this.view.gitEditorMode && !this.view.rebaseCompleting) {
        // Exit git editor mode if no longer waiting
        this.exitGitEditorMode();
      }
      
    } catch (error) {
      console.error('GitDiffView: Error checking rebase status:', error);
    }
  }

  async loadGitStatus() {
    if (!this.view.call || !this.view.call['Repo.get_status']) {
      return;
    }

    try {
      console.log('GitDiffView: Loading git status');
      const response = await this.view.call['Repo.get_status']();
      const statusData = extractResponseData(response);
      
      if (statusData && !statusData.error) {
        this.view.gitStatus = statusData;
        console.log('GitDiffView: Git status loaded:', statusData);
      } else {
        console.error('GitDiffView: Error loading git status:', statusData?.error);
        this.view.gitStatus = null;
      }
    } catch (error) {
      console.error('GitDiffView: Error loading git status:', error);
      this.view.gitStatus = null;
    }

    // Also load raw git status for terminal-like output
    await this.loadRawGitStatus();
  }

  async loadRawGitStatus() {
    if (!this.view.call || !this.view.call['Repo.get_raw_git_status']) {
      return;
    }

    try {
      console.log('GitDiffView: Loading raw git status');
      const response = await this.view.call['Repo.get_raw_git_status']();
      const statusData = extractResponseData(response);
      
      if (statusData && statusData.success && statusData.raw_status) {
        this.view.rawGitStatus = statusData.raw_status;
        console.log('GitDiffView: Raw git status loaded:', statusData.raw_status);
      } else {
        console.error('GitDiffView: Error loading raw git status:', statusData?.error);
        this.view.rawGitStatus = null;
      }
    } catch (error) {
      console.error('GitDiffView: Error loading raw git status:', error);
      this.view.rawGitStatus = null;
    }
  }

  async handleGitEditorFile(editorStatus) {
    const primaryFile = editorStatus.primary_file;
    
    if (!primaryFile) return;
    
    console.log('GitDiffView: Git is waiting for editor file:', primaryFile);
    
    // Switch to git editor mode with batched updates
    if (!this.view.gitEditorMode || this.view.gitEditorFile?.type !== primaryFile.type) {
      this.view.updateRebaseState({
        gitEditorMode: true,
        gitEditorFile: primaryFile,
        selectedFile: primaryFile.file,
        fromContent: '',
        toContent: primaryFile.content,
        unifiedView: true,
        rebaseCompleting: false,
        hasConflicts: false,
        conflictFiles: [],
        changedFiles: [],
        rebaseInProgress: true,
        showRawGitStatus: true
      });
      
      console.log(`GitDiffView: Switched to Git editor mode for ${primaryFile.type}: ${primaryFile.file}`);
    }
  }

  exitGitEditorMode() {
    if (this.view.gitEditorMode) {
      console.log('GitDiffView: Exiting Git editor mode');
      this.view.updateRebaseState({
        gitEditorMode: false,
        gitEditorFile: null
      });
      
      // Return to normal diff view if we have commits selected
      if (this.view.fromCommit && this.view.toCommit) {
        this.view.dataManager.loadChangedFiles();
      }
    }
  }

  async saveGitEditorFile() {
    if (!this.view.gitEditorMode || !this.view.gitEditorFile) {
      return;
    }

    if (!this.view.call || !this.view.call['Repo.save_git_editor_file']) {
      this.view.error = 'JRPC not ready for saving Git editor file';
      return;
    }

    try {
      this.view.loading = true;
      
      const content = this.view.viewManager.getCurrentContent();
      const fileType = this.view.gitEditorFile.type;
      
      console.log('GitDiffView: Saving Git editor file:', fileType, 'content length:', content.length);
      
      const response = await this.view.call['Repo.save_git_editor_file'](fileType, content);
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        console.log('GitDiffView: Git editor file saved successfully');
        
        // Exit git editor mode
        this.exitGitEditorMode();
        
        // Check status again to see what Git wants next
        setTimeout(() => this.checkRebaseStatus(), 500);
        
      } else {
        this.view.error = data?.error || 'Failed to save Git editor file';
      }
    } catch (error) {
      console.error('GitDiffView: Error saving Git editor file:', error);
      this.view.error = `Failed to save Git editor file: ${error.message}`;
    } finally {
      this.view.loading = false;
      this.view.requestUpdate();
    }
  }

  async checkForRebaseConflicts() {
    try {
      const statusResponse = await this.view.call['Repo.get_status']();
      const statusData = extractResponseData(statusResponse);
      
      if (statusData && statusData.modified_files) {
        if (statusData.modified_files.length > 0) {
          // Batch update conflict state
          this.view.updateRebaseState({
            hasConflicts: true,
            conflictFiles: statusData.modified_files,
            rebaseCompleting: false
          });
          
          if (this.view.conflictFiles.length > 0) {
            this.view.selectedFile = this.view.conflictFiles[0];
            await this.view.dataManager.loadConflictContent();
          }
        }
      }
    } catch (error) {
      console.error('GitDiffView: Error checking for conflicts:', error);
    }
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

  updateRebaseAction(commitIndex, action) {
    if (this.view.rebasePlan[commitIndex]) {
      this.view.rebasePlan[commitIndex].action = action;
      this.view.requestUpdate();
    }
  }

  updateCommitMessage(commitIndex, message) {
    if (this.view.rebasePlan[commitIndex]) {
      this.view.rebasePlan[commitIndex].message = message;
      this.view.requestUpdate();
    }
  }

  moveCommit(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    
    const commits = [...this.view.rebasePlan];
    const [movedCommit] = commits.splice(fromIndex, 1);
    commits.splice(toIndex, 0, movedCommit);
    this.view.rebasePlan = commits;
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
          await this.continueRebase();
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
      this.view.rebaseMessage = `Failed to continue rebase: ${error.message}`;
    } finally {
      this.view.loading = false;
      this.view.requestUpdate();
    }
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
        this.resetRebaseState();
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
    this.resetRebaseState();
    
    this.view.dispatchEvent(new CustomEvent('rebase-complete', {
      detail: { message: 'Rebase completed successfully' }
    }));
  }

  resetRebaseState() {
    // Use the optimized resetRebaseState method from GitDiffView
    this.view.resetRebaseState();
  }
}
