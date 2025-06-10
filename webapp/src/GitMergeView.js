import {LitElement, html} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {GitMergeStyles} from './git-merge/GitMergeStyles.js';
import {GitMergeDataManager} from './git-merge/GitMergeDataManager.js';
import {GitMergeViewManager} from './git-merge/GitMergeViewManager.js';
import {GitMergeRebaseManager} from './git-merge/GitMergeRebaseManager.js';
import {GitMergeRenderer} from './git-merge/GitMergeRenderer.js';
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
    this.rebaseManager = new GitMergeRebaseManager(this);
    this.renderer = new GitMergeRenderer(this);
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
    this.rebaseManager.checkRebaseStatus();
    
    if (this.fromCommit && this.toCommit && !this.rebaseTodoMode && !this.rebaseCompleting) {
      this.dataManager.loadChangedFiles();
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

  async refreshRebaseStatus() {
    await this.rebaseManager.checkRebaseStatus();
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
        
        if (mergeView.a) {
          const selectionA = mergeView.a.state.selection.main;
          if (!selectionA.empty) {
            return mergeView.a.state.doc.sliceString(selectionA.from, selectionA.to);
          }
        }
        
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

  render() {
    return this.renderer.render();
  }
}

customElements.define('git-merge-view', GitMergeView);
