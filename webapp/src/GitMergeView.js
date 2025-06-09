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
    currentRebaseStep: { type: Number, state: true }
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
    
    // Initialize managers
    this.dataManager = new GitMergeDataManager(this);
    this.viewManager = new GitMergeViewManager(this);
  }

  static styles = GitMergeStyles.styles;

  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    this.viewManager.initialize();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.viewManager.cleanup();
  }

  setupDone() {
    super.setupDone?.();
    if (this.fromCommit && this.toCommit) {
      this.dataManager.loadChangedFiles();
    }
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    
    if (changedProperties.has('fromCommit') || changedProperties.has('toCommit')) {
      if (this.fromCommit && this.toCommit && this.call) {
        this.dataManager.loadChangedFiles();
      }
    }
    
    if (changedProperties.has('selectedFile') || 
        changedProperties.has('fromContent') || 
        changedProperties.has('toContent')) {
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

  async continueRebase() {
    if (!this.call || !this.call['Repo.continue_rebase']) {
      this.error = 'JRPC not ready to continue rebase';
      return;
    }

    try {
      this.loading = true;
      
      const response = await this.call['Repo.continue_rebase']();
      const data = extractResponseData(response);
      
      if (data && (data.success === true || (data.success === undefined && !data.error))) {
        if (data.conflicts && data.conflicts.length > 0) {
          this.hasConflicts = true;
          this.conflictFiles = data.conflicts;
          this.currentRebaseStep = data.currentStep || this.currentRebaseStep + 1;
          
          if (this.conflictFiles.length > 0) {
            this.selectedFile = this.conflictFiles[0];
            await this.dataManager.loadConflictContent();
          }
        } else {
          // Rebase completed
          this.completeRebase();
        }
      } else {
        this.error = data?.error || 'Failed to continue rebase';
      }
    } catch (error) {
      console.error('GitMergeView: Error continuing rebase:', error);
      this.error = `Failed to continue rebase: ${error.message}`;
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
    
    alert('Rebase completed successfully!');
  }

  resetRebaseState() {
    this.rebaseMode = false;
    this.rebasePlan = [];
    this.rebaseInProgress = false;
    this.hasConflicts = false;
    this.conflictFiles = [];
    this.currentRebaseStep = 0;
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
          <span>From: <span class="commit-hash">${this.fromCommit?.substring(0, 7) || 'None'}</span></span>
          <span>→</span>
          <span>To: <span class="commit-hash">${this.toCommit?.substring(0, 7) || 'None'}</span></span>
          ${this.gitHistoryMode ? html`<span class="read-only-indicator">(Read-only)</span>` : ''}
          ${this.rebaseInProgress ? html`<span class="rebase-indicator">Rebase in progress (${this.currentRebaseStep}/${this.rebasePlan.length})</span>` : ''}
        </div>
        
        <div class="header-controls">
          ${this.renderRebaseControls()}
          <button class="view-toggle-button" @click=${this.toggleViewMode}>
            ${this.unifiedView ? 'Side-by-Side' : 'Unified'}
          </button>
          <button class="nav-button" title="Previous Change" @click=${this.goToPreviousChunk}>
            <span class="nav-icon">▲</span>
          </button>
          <button class="nav-button" title="Next Change" @click=${this.goToNextChunk}>
            <span class="nav-icon">▼</span>
          </button>
        </div>
      </div>
    `;
  }

  renderRebaseControls() {
    if (!this.gitHistoryMode || !this.fromCommit || !this.toCommit) return '';

    if (this.rebaseInProgress) {
      return html`
        <button class="abort-button" @click=${this.abortRebase}>
          Abort Rebase
        </button>
      `;
    }

    if (this.rebaseMode) {
      return html`
        <button class="execute-button" @click=${this.executeRebase}>
          Execute Rebase
        </button>
        <button class="cancel-button" @click=${this.resetRebaseState}>
          Cancel
        </button>
      `;
    }

    return html`
      <button class="rebase-button" @click=${this.startInteractiveRebase}>
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
    
    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
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
