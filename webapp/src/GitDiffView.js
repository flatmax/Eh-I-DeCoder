import {LitElement, html} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {GitDiffStyles} from './git-diff/GitDiffStyles.js';
import {GitDiffDataManager} from './git-diff/GitDiffDataManager.js';
import {GitDiffViewManager} from './git-diff/GitDiffViewManager.js';
import {GitDiffRebaseManager} from './git-diff/GitDiffRebaseManager.js';
import {GitDiffRenderer} from './git-diff/GitDiffRenderer.js';
import {extractResponseData} from './Utils.js';
import './diffEditor/MonacoDiffEditor.js';
import {LanguageDetector} from './diffEditor/LanguageDetector.js';

export class GitDiffView extends JRPCClient {
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
    rebaseStatus: { type: Object, state: true },
    // Rebase completion state
    rebaseCompleting: { type: Boolean, state: true },
    rebaseMessage: { type: String, state: true },
    // Git editor mode - unified handling for all Git editor files
    gitEditorMode: { type: Boolean, state: true },
    gitEditorFile: { type: Object, state: true },
    // Git status information
    gitStatus: { type: Object, state: true },
    // Raw git status display
    rawGitStatus: { type: String, state: true },
    showRawGitStatus: { type: Boolean, state: true }
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
    this.rebaseStatus = null;
    this.rebaseCompleting = false;
    this.rebaseMessage = '';
    this.gitEditorMode = false;
    this.gitEditorFile = null;
    this.gitStatus = null;
    this.rawGitStatus = null;
    this.showRawGitStatus = false;
    
    // Initialize managers
    this.dataManager = new GitDiffDataManager(this);
    this.viewManager = new GitDiffViewManager(this);
    this.rebaseManager = new GitDiffRebaseManager(this);
    this.renderer = new GitDiffRenderer(this);
    this.languageDetector = new LanguageDetector();
  }

  static styles = GitDiffStyles.styles;

  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.viewManager.cleanup();
  }

  setupDone() {
    super.setupDone?.();
    this.rebaseManager.checkRebaseStatus();
    
    if (this.fromCommit && this.toCommit && !this.gitEditorMode && !this.rebaseCompleting) {
      this.dataManager.loadChangedFiles();
    }
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    
    if (changedProperties.has('fromCommit') || changedProperties.has('toCommit')) {
      if (this.fromCommit && this.toCommit && this.call && !this.gitEditorMode && !this.rebaseCompleting) {
        this.dataManager.loadChangedFiles();
      }
    }
    
    if (changedProperties.has('selectedFile') || 
        changedProperties.has('fromContent') || 
        changedProperties.has('toContent') ||
        changedProperties.has('gitEditorMode')) {
      if (this.selectedFile && (this.fromContent !== undefined || this.toContent !== undefined)) {
        setTimeout(() => this.viewManager.updateDiffView(), 100);
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
    if (this.gitEditorMode) return;
    
    this.unifiedView = !this.unifiedView;
    setTimeout(() => this.viewManager.updateDiffView(), 50);
  }

  toggleRawGitStatus() {
    this.showRawGitStatus = !this.showRawGitStatus;
    
    // If showing and we don't have raw status, refresh it
    if (this.showRawGitStatus && !this.rawGitStatus) {
      this.rebaseManager.loadRawGitStatus();
    }
  }

  async refreshRawGitStatus() {
    await this.rebaseManager.loadRawGitStatus();
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

  handleContentChanged(event) {
    if (this.onContentChange) {
      this.onContentChange();
    }
  }

  handleSaveFile(event) {
    // For git editor mode, save the file
    if (this.gitEditorMode) {
      this.rebaseManager.saveGitEditorFile();
    }
  }

  handleFindInFiles(event) {
    this.dispatchEvent(new CustomEvent('request-find-in-files', {
      detail: event.detail,
      bubbles: true,
      composed: true
    }));
  }

  getLanguageFromFile(filePath) {
    return this.languageDetector.getLanguageFromFile(filePath || '');
  }

  getSelectedText() {
    const monacoEditor = this.shadowRoot?.querySelector('monaco-diff-editor');
    if (!monacoEditor) {
      return '';
    }
    
    return monacoEditor.getSelectedText() || '';
  }

  render() {
    return this.renderer.render();
  }
}

customElements.define('git-diff-view', GitDiffView);
