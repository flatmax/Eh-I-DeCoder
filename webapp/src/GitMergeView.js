import {LitElement, html} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {GitMergeStyles} from './git-merge/GitMergeStyles.js';
import {GitMergeDataManager} from './git-merge/GitMergeDataManager.js';
import {GitMergeViewManager} from './git-merge/GitMergeViewManager.js';
import {extractResponseData} from './Utils.js';

export class GitMergeView extends JRPCClient {
  static properties = {
    fromCommit: { type: String },
    toCommit: { type: String },
    serverURI: { type: String },
    gitHistoryMode: { type: Boolean },
    changedFiles: { type: Array, state: true },
    selectedFile: { type: String, state: true },
    fromContent: { type: String, state: true },
    toContent: { type: String, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true },
    unifiedView: { type: Boolean, state: true },
    // Interactive rebase properties
    rebaseMode: { type: Boolean, state: true },
    rebasePlan: { type: Array, state: true },
    rebaseInProgress: { type: Boolean, state: true },
    hasConflicts: { type: Boolean, state: true },
    conflictFiles: { type: Array, state: true },
    currentRebaseStep: { type: Number, state: true },
    // Rebase todo file editing
    rebaseTodoMode: { type: Boolean, state: true },
    rebaseTodoContent: { type: String, state: true },
    rebaseStatus: { type: Object, state: true },
    // Rebase completion state
    rebaseCompleting: { type: Boolean, state: true },
    rebaseMessage: { type: String, state: true }
  };

  constructor() {
    super();
    this.fromCommit = '';
    this.toCommit = '';
    this.gitHistoryMode = true;
    this.changedFiles = [];
    this.selectedFile = '';
    this.fromContent = '';
    this.toContent = '';
    this.loading = false;
    this.error = null;
    this.unifiedView = false;
    this.rebaseMode = false;
    this.rebasePlan = [];
    this.rebaseInProgress = false;
    this.hasConflicts = false;
    this.conflictFiles = [];
    this.currentRebaseStep = 0;
    this.rebaseTodoMode = false;
    this.rebaseTodoContent = '';
    this.rebaseStatus = null;
    this.rebaseCompleting = false;
    this.rebaseMessage = '';
    
    // Initialize managers
    this.dataManager = new GitMergeDataManager(this);
    this.viewManager = new GitMergeViewManager(this);
    
    // Periodic rebase status checking - but don't auto-continue
    this.rebaseCheckInterval = null;
  }

  static styles = GitMergeStyles.styles;

  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    this.viewManager.initialize();
    
    // Start periodic rebase status checking (but without auto-continue)
    this.startRebaseStatusChecking();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.viewManager.cleanup();
    this.stopRebaseStatusChecking();
  }

  startRebaseStatusChecking() {
    // Check immediately
    this.checkRebaseStatus();
    
    // Then check every 5 seconds (less frequent)
    this.rebaseCheckInterval = setInterval(() => {
      this.checkRebaseStatus();
    }, 5000);
  }

  stopRebaseStatusChecking() {
    if (this.rebaseCheckInterval) {
      clearInterval(this.rebaseCheckInterval);
      this.rebaseCheckInterval = null;
    }
  }

  setupDone() {
    super.setupDone?.();
    // Check for existing rebase state first
    this.checkRebaseStatus();
    
    if (this.fromCommit && this.toCommit && !this.rebaseTodoMode && !this.rebaseCompleting) {
      this.dataManager.loadChangedFiles();
    }
  }

  async checkRebaseStatus() {
    if (!this.call || !this.call['Repo.get_rebase_status']) {
      return;
    }

    try {
      const response = await this.call['Repo.get_rebase_status']();
      const data = extractResponseData(response);
      
      console.log('GitMergeView: Rebase status check result:', data);
      
      if (data && data.in_rebase) {
        // We're in a rebase
        if (!this.rebaseStatus || !this.rebaseStatus.in_rebase) {
          console.log('GitMergeView: Detected new rebase in progress');
        }
        
        this.rebaseStatus = data;
        
        if (data.rebase_type === 'interactive') {
          // Check if we have todo content that needs editing
          if (data.has_todo_content && data.todo_content && data.todo_content.trim()) {
            // We're in an interactive rebase with a todo file that has content
            if (!this.rebaseTodoMode) {
              console.log('GitMergeView: Switching to rebase todo mode');
              console.log('GitMergeView: Todo content:', data.todo_content);
              
              this.rebaseTodoMode = true;
              this.rebaseTodoContent = data.todo_content;
              this.selectedFile = 'git-rebase-todo';
              this.fromContent = ''; // No "from" content for todo file
              this.toContent = data.todo_content; // Show todo content in editor
              
              // Clear any existing file data since we're now in rebase mode
              this.changedFiles = [];
              this.rebaseInProgress = true;
              this.rebaseCompleting = false;
              
              // Force unified view for rebase todo editing
              this.unifiedView = true;
              
              console.log('GitMergeView: Found active rebase, loading todo file');
              this.requestUpdate();
            }
          } else if (!data.has_todo_content || !data.todo_content || !data.todo_content.trim()) {
            // Interactive rebase without todo content
            if (this.rebaseTodoMode) {
              console.log('GitMergeView: Exiting rebase todo mode, checking for conflicts');
              this.rebaseTodoMode = false;
              this.rebaseInProgress = true;
              
              // Check for conflicts
              await this.checkForRebaseConflicts();
            } else if (!this.rebaseCompleting && !this.hasConflicts) {
              // Rebase is in progress but no todo content and no conflicts
              // This likely means the rebase needs user action
              console.log('GitMergeView: Rebase waiting for user action');
              this.rebaseCompleting = true;
              this.rebaseInProgress = true;
              
              // Set a message based on what Git is telling us
              this.rebaseMessage = "Rebase is paused and waiting for user action. Use the controls below to continue.";
              
              // DON'T automatically try to continue - let user decide
            }
          }
        }
      } else {
        // No rebase in progress
        if (this.rebaseStatus && this.rebaseStatus.in_rebase) {
          console.log('GitMergeView: Rebase completed or aborted');
          this.resetRebaseState();
        }
        this.rebaseStatus = data;
      }
    } catch (error) {
      console.error('GitMergeView: Error checking rebase status:', error);
    }
  }

  async checkForRebaseConflicts() {
    // Use git status to check for conflicts
    try {
      const statusResponse = await this.call['Repo.get_status']();
      const statusData = extractResponseData(statusResponse);
      
      if (statusData && statusData.modified_files) {
        // Check if any files have conflict markers or are in conflicted state
        // For now, we'll assume any modified files during rebase are conflicts
        if (statusData.modified_files.length > 0) {
          this.hasConflicts = true;
          this.conflictFiles = statusData.modified_files;
          this.rebaseCompleting = false;
          
          if (this.conflictFiles.length > 0) {
            this.selectedFile = this.conflictFiles[0];
            await this.dataManager.loadConflictContent();
          }
        }
      }
    } catch (error) {
      console.error('GitMergeView: Error checking for conflicts:', error);
    }
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    
    if (changedProperties.has('fromCommit') || changedProperties.has('toCommit')) {
      if (this.fromCommit && this.toCommit && this.call && !this.rebaseTodoMode && !this.rebaseCompleting) {
        this.dataManager.loadChangedFiles();
      }
    }
    
    if (changedProperties.has('selectedFile') || 
        changedProperties.has('fromContent') || 
        changedProperties.has('toContent') ||
        changedProperties.has('rebaseTodoMode')) {
      if (this.selectedFile && (this.fromContent !== undefined || this.toContent !== undefined)) {
        setTimeout(() => this.viewManager.updateMergeView(), 100);
      }
    }
  }

  async selectFile(filePath) {
    if (filePath === this.selectedFile) return;
    this.selectedFile = filePath;
    
    if (this.hasConflicts && this.conflictFiles.includes(filePath)) {
      await this.dataManager.loadConflictContent();
    } else {
      await this.dataManager.loadFileContents();
    }
  }

  toggleViewMode() {
    // Don't allow view mode toggle in rebase todo mode
    if (this.rebaseTodoMode) return;
    
    this.unifiedView = !this.unifiedView;
    setTimeout(() => this.viewManager.updateMergeView(), 50);
  }

  goToNextChunk() {
    this.viewManager.goToNextChunk();
  }

  goToPreviousChunk() {
    this.viewManager.goToPreviousChunk();
  }

  // Interactive rebase methods
  async startInteractiveRebase() {
    if (!this.fromCommit || !this.toCommit) {
      this.error = 'Both commits must be selected for rebase';
      return;
    }

    if (!this.call || !this.call['Repo.start_interactive_rebase']) {
      this.error = 'JRPC not ready for interactive rebase';
      return;
    }

    try {
      this.loading = true;
      this.error = null;
      
      console.log('GitMergeView: Starting interactive rebase from', this.fromCommit, 'to', this.toCommit);
      const response = await this.call['Repo.start_interactive_rebase'](this.fromCommit, this.toCommit);
      console.log('GitMergeView: Interactive rebase response:', response);
      
      // Extract the actual data from the UUID-wrapped response
      const data = extractResponseData(response);
      console.log('GitMergeView: Extracted data:', data);
      
      if (data && (data.success === true || (data.success === undefined && data.commits))) {
        this.rebaseMode = true;
        this.rebasePlan = data.commits || [];
        this.rebaseInProgress = false;
        this.currentRebaseStep = 0;
        console.log('GitMergeView: Rebase plan loaded with', this.rebasePlan.length, 'commits');
      } else if (data && data.success === false) {
        this.error = data.error || 'Failed to start interactive rebase';
        console.error('GitMergeView: Rebase failed with error:', data.error);
      } else {
        this.error = 'Unexpected response format from interactive rebase';
        console.error('GitMergeView: Unexpected response format:', data);
      }
    } catch (error) {
      console.error('GitMergeView: Error starting interactive rebase:', error);
      this.error = `Failed to start rebase: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  updateRebaseAction(commitIndex, action) {
    if (this.rebasePlan[commitIndex]) {
      this.rebasePlan[commitIndex].action = action;
      this.requestUpdate();
    }
  }

  updateCommitMessage(commitIndex, message) {
    if (this.rebasePlan[commitIndex]) {
      this.rebasePlan[commitIndex].message = message;
      this.requestUpdate();
    }
  }

  moveCommit(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    
    const commits = [...this.rebasePlan];
    const [movedCommit] = commits.splice(fromIndex, 1);
    commits.splice(toIndex, 0, movedCommit);
    this.rebasePlan = commits;
  }

  async executeRebase() {
    if (!this.rebasePlan.length) return;

    if (!this.call || !this.call['Repo.execute_rebase']) {
      this.error = 'JRPC not ready for rebase execution';
      return;
    }

    try {
      this.loading = true;
      this.rebaseInProgress = true;
      this.error = null;
      
      console.log('GitMergeView: Executing rebase with plan:', this.rebasePlan);
      const response = await this.call['Repo.execute_rebase'](this.rebasePlan);
      console.log('GitMergeView: Execute rebase response:', response);
      
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        if (data.conflicts && data.conflicts.length > 0) {
          this.hasConflicts = true;
          this.conflictFiles = data.conflicts;
          this.currentRebaseStep = data.currentStep || 0;
          
          // Load first conflict file
          if (this.conflictFiles.length > 0) {
            this.selectedFile = this.conflictFiles[0];
            await this.dataManager.loadConflictContent();
          }
        } else {
          // Rebase completed successfully
          this.completeRebase();
        }
      } else {
        this.error = data?.error || 'Rebase execution failed';
        this.rebaseInProgress = false;
      }
    } catch (error) {
      console.error('GitMergeView: Error executing rebase:', error);
      this.error = `Rebase execution failed: ${error.message}`;
      this.rebaseInProgress = false;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  async saveRebaseTodo() {
    if (!this.rebaseTodoMode || !this.call || !this.call['Repo.save_rebase_todo']) {
      return;
    }

    try {
      this.loading = true;
      
      // Get current content from the editor
      const todoContent = this.viewManager.getCurrentContent();
      
      console.log('GitMergeView: Saving rebase todo content:', todoContent);
      
      const response = await this.call['Repo.save_rebase_todo'](todoContent);
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        console.log('GitMergeView: Rebase todo file saved successfully');
        
        // Exit todo mode immediately
        this.rebaseTodoMode = false;
        this.rebaseInProgress = true;
        this.rebaseCompleting = true;
        this.rebaseMessage = "Todo file saved. Rebase will continue automatically.";
        
        console.log('GitMergeView: Exiting todo mode, rebase will continue automatically');
        
      } else {
        this.error = data?.error || 'Failed to save rebase todo file';
      }
    } catch (error) {
      console.error('GitMergeView: Error saving rebase todo:', error);
      this.error = `Failed to save rebase todo: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  async resolveConflict(resolution) {
    if (!this.selectedFile || !this.hasConflicts) return;

    if (!this.call || !this.call['Repo.resolve_conflict']) {
      this.error = 'JRPC not ready for conflict resolution';
      return;
    }

    try {
      this.loading = true;
      
      let resolvedContent = '';
      if (resolution === 'ours') {
        resolvedContent = this.fromContent;
      } else if (resolution === 'theirs') {
        resolvedContent = this.toContent;
      } else if (resolution === 'manual') {
        // Get current content from editor
        resolvedContent = this.viewManager.getCurrentContent();
      }
      
      const response = await this.call['Repo.resolve_conflict'](this.selectedFile, resolvedContent);
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        // Remove from conflict files
        this.conflictFiles = this.conflictFiles.filter(f => f !== this.selectedFile);
        
        // If no more conflicts, continue rebase
        if (this.conflictFiles.length === 0) {
          await this.continueRebase();
        } else {
          // Move to next conflict file
          this.selectedFile = this.conflictFiles[0];
          await this.dataManager.loadConflictContent();
        }
      } else {
        this.error = data?.error || 'Failed to resolve conflict';
      }
    } catch (error) {
      console.error('GitMergeView: Error resolving conflict:', error);
      this.error = `Failed to resolve conflict: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  // Manual continue rebase - called by user action
  async continueRebase() {
    if (!this.call || !this.call['Repo.continue_rebase']) {
      this.error = 'JRPC not ready to continue rebase';
      return;
    }

    try {
      this.loading = true;
      this.error = null; // Clear any previous errors
      
      console.log('GitMergeView: User manually continuing rebase');
      const response = await this.call['Repo.continue_rebase']();
      const data = extractResponseData(response);
      
      console.log('GitMergeView: Continue rebase response:', data);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        if (data.conflicts && data.conflicts.length > 0) {
          this.hasConflicts = true;
          this.conflictFiles = data.conflicts;
          this.currentRebaseStep = data.currentStep || this.currentRebaseStep + 1;
          this.rebaseCompleting = false;
          
          if (this.conflictFiles.length > 0) {
            this.selectedFile = this.conflictFiles[0];
            await this.dataManager.loadConflictContent();
          }
        } else {
          // Rebase completed
          this.completeRebase();
        }
      } else {
        // Show the error to the user so they know what to do
        this.error = data?.error || 'Failed to continue rebase';
        this.rebaseMessage = data?.error || 'Failed to continue rebase';
        
        // Check if we're still in rebase state
        const statusCheck = await this.call['Repo.get_rebase_status']();
        const statusData = extractResponseData(statusCheck);
        
        if (!statusData || !statusData.in_rebase) {
          // Rebase is actually complete
          console.log('GitMergeView: Rebase appears to be complete');
          this.completeRebase();
        }
      }
    } catch (error) {
      console.error('GitMergeView: Error continuing rebase:', error);
      this.error = `Failed to continue rebase: ${error.message}`;
      this.rebaseMessage = `Failed to continue rebase: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  // Add methods for commit and commit --amend
  async commitChanges() {
    if (!this.call || !this.call['Repo.commit_staged_changes']) {
      this.error = 'JRPC not ready to commit changes';
      return;
    }

    try {
      this.loading = true;
      this.error = null;
      
      const response = await this.call['Repo.commit_staged_changes']();
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        this.rebaseMessage = "Changes committed. You can now continue the rebase.";
      } else {
        this.error = data?.error || 'Failed to commit changes';
      }
    } catch (error) {
      console.error('GitMergeView: Error committing changes:', error);
      this.error = `Failed to commit changes: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  async commitAmend() {
    if (!this.call || !this.call['Repo.commit_amend']) {
      this.error = 'JRPC not ready to amend commit';
      return;
    }

    try {
      this.loading = true;
      this.error = null;
      
      const response = await this.call['Repo.commit_amend']();
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        this.rebaseMessage = "Commit amended. You can now continue the rebase.";
      } else {
        this.error = data?.error || 'Failed to amend commit';
      }
    } catch (error) {
      console.error('GitMergeView: Error amending commit:', error);
      this.error = `Failed to amend commit: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  async abortRebase() {
    if (!this.call || !this.call['Repo.abort_rebase']) {
      this.error = 'JRPC not ready to abort rebase';
      return;
    }

    try {
      this.loading = true;
      
      const response = await this.call['Repo.abort_rebase']();
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        this.resetRebaseState();
        console.log('GitMergeView: Rebase aborted successfully');
      } else {
        this.error = data?.error || 'Failed to abort rebase';
      }
    } catch (error) {
      console.error('GitMergeView: Error aborting rebase:', error);
      this.error = `Failed to abort rebase: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  completeRebase() {
    this.resetRebaseState();
    
    // Emit event to refresh git history
    this.dispatchEvent(new CustomEvent('rebase-completed', {
      detail: { fromCommit: this.fromCommit, toCommit: this.toCommit },
      bubbles: true
    }));
    
    console.log('GitMergeView: Rebase completed successfully!');
  }

  resetRebaseState() {
    this.rebaseMode = false;
    this.rebasePlan = [];
    this.rebaseInProgress = false;
    this.hasConflicts = false;
    this.conflictFiles = [];
    this.currentRebaseStep = 0;
    this.rebaseTodoMode = false;
    this.rebaseTodoContent = '';
    this.rebaseStatus = null;
    this.rebaseCompleting = false;
    this.rebaseMessage = '';
    this.unifiedView = false; // Reset to default view mode
  }

  getSelectedText() {
    if (!this.viewManager?.mergeViewManager?.mergeView) {
      return '';
    }
    
    try {
      if (this.unifiedView) {
        const view = this.viewManager.mergeViewManager.mergeView;
        const selection = view.state.selection.main;
        if (selection.empty) return '';
        return view.state.doc.sliceString(selection.from, selection.to);
      } else {
        const mergeView = this.viewManager.mergeViewManager.mergeView;
        
        // Check left pane (a)
        if (mergeView.a) {
          const selectionA = mergeView.a.state.selection.main;
          if (!selectionA.empty) {
            return mergeView.a.state.doc.sliceString(selectionA.from, selectionA.to);
          }
        }
        
        // Check right pane (b)
        if (mergeView.b) {
          const selectionB = mergeView.b.state.selection.main;
          if (!selectionB.empty) {
            return mergeView.b.state.doc.sliceString(selectionB.from, selectionB.to);
          }
        }
      }
      
      return '';
    } catch (error) {
      console.error('GitMergeView: Error getting selected text:', error);
      return '';
    }
  }

  renderHeader() {
    return html`
      <div class="git-merge-header">
        <div class="commit-info">
          ${this.rebaseTodoMode ? html`
            <span class="rebase-todo-indicator">🔄 Editing Rebase Todo File</span>
          ` : this.rebaseCompleting ? html`
            <span class="rebase-indicator">🔄 Rebase Paused - User Action Required</span>
          ` : this.rebaseInProgress ? html`
            <span class="rebase-indicator">🔄 Rebase in Progress${this.hasConflicts ? ' - Resolving Conflicts' : ''}</span>
          ` : html`
            <span>From: <span class="commit-hash">${this.fromCommit?.substring(0, 7) || 'None'}</span></span>
            <span>→</span>
            <span>To: <span class="commit-hash">${this.toCommit?.substring(0, 7) || 'None'}</span></span>
            ${this.gitHistoryMode ? html`<span class="read-only-indicator">(Read-only)</span>` : ''}
          `}
        </div>
        
        <div class="header-controls">
          ${this.renderRebaseControls()}
          ${!this.rebaseTodoMode && !this.rebaseCompleting ? html`
            <button class="view-toggle-button" @click=${this.toggleViewMode}>
              ${this.unifiedView ? 'Side-by-Side' : 'Unified'}
            </button>
            <button class="nav-button" title="Previous Change" @click=${this.goToPreviousChunk}>
              <span class="nav-icon">▲</span>
            </button>
            <button class="nav-button" title="Next Change" @click=${this.goToNextChunk}>
              <span class="nav-icon">▼</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderRebaseControls() {
    if (this.rebaseTodoMode) {
      return html`
        <button class="save-todo-button" @click=${this.saveRebaseTodo} ?disabled=${this.loading}>
          ${this.loading ? 'Saving...' : 'Save & Continue Rebase'}
        </button>
        <button class="abort-button" @click=${this.abortRebase} ?disabled=${this.loading}>
          Abort Rebase
        </button>
      `;
    }

    if (!this.gitHistoryMode || !this.fromCommit || !this.toCommit) return '';

    if (this.rebaseCompleting) {
      return html`
        <button class="continue-button" @click=${this.continueRebase} ?disabled=${this.loading}>
          ${this.loading ? 'Continuing...' : 'Continue Rebase'}
        </button>
        <button class="commit-button" @click=${this.commitChanges} ?disabled=${this.loading}>
          Commit Changes
        </button>
        <button class="commit-amend-button" @click=${this.commitAmend} ?disabled=${this.loading}>
          Commit --amend
        </button>
        <button class="abort-button" @click=${this.abortRebase} ?disabled=${this.loading}>
          Abort Rebase
        </button>
      `;
    }

    if (this.rebaseInProgress) {
      return html`
        <button class="abort-button" @click=${this.abortRebase} ?disabled=${this.loading}>
          Abort Rebase
        </button>
      `;
    }

    if (this.rebaseMode) {
      return html`
        <button class="execute-button" @click=${this.executeRebase} ?disabled=${this.loading}>
          Execute Rebase
        </button>
        <button class="cancel-button" @click=${this.resetRebaseState}>
          Cancel
        </button>
      `;
    }

    return html`
      <button class="rebase-button" @click=${this.startInteractiveRebase} ?disabled=${this.loading}>
        Interactive Rebase
      </button>
    `;
  }

  renderConflictControls() {
    if (!this.hasConflicts) return '';
    
    return html`
      <div class="conflict-controls">
        <div class="conflict-info">
          Conflict in ${this.selectedFile} (${this.conflictFiles.indexOf(this.selectedFile) + 1}/${this.conflictFiles.length})
        </div>
        <div class="conflict-buttons">
          <button class="conflict-resolve-button ours" @click=${() => this.resolveConflict('ours')}>
            Accept Ours (Current)
          </button>
          <button class="conflict-resolve-button theirs" @click=${() => this.resolveConflict('theirs')}>
            Accept Theirs (Incoming)
          </button>
          <button class="conflict-resolve-button manual" @click=${() => this.resolveConflict('manual')}>
            Use Manual Resolution
          </button>
        </div>
      </div>
    `;
  }

  renderRebaseTodoHelp() {
    if (!this.rebaseTodoMode) return '';

    return html`
      <div class="re base-todo-help">
        <h4>Interactive Rebase Instructions</h4>
        <p>Edit the rebase todo file below. Available commands:</p>
        <ul>
          <li><strong>pick</strong> - use commit as-is</li>
          <li><strong>drop</strong> - remove commit</li>
          <li><strong>squash</strong> - combine with previous commit</li>
          <li><strong>edit</strong> - stop for amending</li>
          <li><strong>reword</strong> - stop to edit commit message</li>
        </ul>
        <p>Reorder lines to reorder commits. Click "Save & Continue Rebase" when ready.</p>
      </div>
    `;
  }

  renderRebaseMessage() {
    if (!this.rebaseCompleting || !this.rebaseMessage) return '';

    return html`
      <div class="rebase-message">
        <h4>Rebase Status</h4>
        <p>${this.rebaseMessage}</p>
        ${this.error ? html`
          <div class="rebase-error">
            <strong>Git says:</strong>
            <pre>${this.error}</pre>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderRebasePlan() {
    if (!this.rebaseMode || !this.rebasePlan.length) return '';

    return html`
      <div class="rebase-plan">
        <div class="rebase-plan-header">
          <h3>Interactive Rebase Plan</h3>
          <p>Drag to reorder commits, change actions, and edit messages:</p>
        </div>
        <div class="rebase-commits">
          ${this.rebasePlan.map((commit, index) => html`
            <div class="rebase-commit" draggable="true" 
                 @dragstart=${(e) => this.handleDragStart(e, index)}
                 @dragover=${this.handleDragOver}
                 @drop=${(e) => this.handleDrop(e, index)}>
              <select class="rebase-action" 
                      .value=${commit.action || 'pick'}
                      @change=${(e) => this.updateRebaseAction(index, e.target.value)}>
                <option value="pick">pick</option>
                <option value="drop">drop</option>
                ${index > 0 ? html`<option value="squash">squash</option>` : ''}
                <option value="edit">edit</option>
              </select>
              <span class="commit-hash">${commit.hash?.substring(0, 7)}</span>
              <input class="commit-message" 
                     .value=${commit.message || ''}
                     @input=${(e) => this.updateCommitMessage(index, e.target.value)}
                     placeholder="Commit message">
            </div>
          `)}
        </div>
      </div>
    `;
  }

  handleDragStart(e, index) {
    e.dataTransfer.setData('text/plain', index.toString());
  }

  handleDragOver(e) {
    e.preventDefault();
  }

  handleDrop(e, toIndex) {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    this.moveCommit(fromIndex, toIndex);
  }

  renderFileTabs() {
    if (this.rebaseTodoMode) {
      return html`
        <div class="file-tabs">
          <button class="file-tab active rebase-todo">
            📝 git-rebase-todo
          </button>
        </div>
      `;
    }

    if (!this.changedFiles || this.changedFiles.length === 0) return '';
    
    return html`
      <div class="file-tabs">
        ${this.changedFiles.map(file => html`
          <button 
            class="file-tab ${file === this.selectedFile ? 'active' : ''} ${this.conflictFiles.includes(file) ? 'conflict' : ''}"
            @click=${() => this.selectFile(file)}
          >
            ${file}
            ${this.conflictFiles.includes(file) ? html`<span class="conflict-indicator">⚠</span>` : ''}
          </button>
        `)}
      </div>
    `;
  }

  renderContent() {
    if (this.loading) {
      return html`<div class="loading">Loading file changes...</div>`;
    }
    
    if (this.error && !this.rebaseCompleting) {
      return html`<div class="error">${this.error}</div>`;
    }
    
    if (this.rebaseTodoMode) {
      return html`
        <div class="merge-content">
          ${this.renderRebaseTodoHelp()}
          ${this.renderFileTabs()}
          <div class="merge-container"></div>
        </div>
      `;
    }
    
    if (this.rebaseCompleting) {
      return html`
        <div class="rebase-completing">
          <h3>🔄 Rebase Paused</h3>
          ${this.renderRebaseMessage()}
          <p>The rebase is paused and waiting for your action. Use the buttons above to:</p>
          <ul>
            <li><strong>Continue Rebase</strong> - Continue with the rebase process</li>
            <li><strong>Commit Changes</strong> - Create a new commit with staged changes</li>
            <li><strong>Commit --amend</strong> - Amend the previous commit with staged changes</li>
            <li><strong>Abort Rebase</strong> - Cancel the rebase and return to original state</li>
          </ul>
        </div>
      `;
    }
    
    if (this.rebaseMode && !this.rebaseInProgress) {
      return this.renderRebasePlan();
    }
    
    if (!this.fromCommit || !this.toCommit) {
      return html`<div class="no-changes">Select commits to view changes</div>`;
    }
    
    if (this.changedFiles.length === 0) {
      return html`<div class="no-changes">No changes between selected commits</div>`;
    }
    
    return html`
      <div class="merge-content">
        ${this.hasConflicts ? this.renderConflictControls() : ''}
        ${this.renderFileTabs()}
        <div class="merge-container"></div>
      </div>
    `;
  }

  render() {
    return html`
      ${this.renderHeader()}
      ${this.renderContent()}
    `;
  }
}

customElements.define('git-merge-view', GitMergeView);
