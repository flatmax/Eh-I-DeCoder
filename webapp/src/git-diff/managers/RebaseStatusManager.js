import {extractResponseData} from '../../Utils.js';

export class RebaseStatusManager {
  constructor(gitDiffView) {
    this.view = gitDiffView;
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
          this.view.resetRebaseState();
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
}
