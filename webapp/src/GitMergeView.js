import {LitElement, html} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {GitMergeStyles} from './git-merge/GitMergeStyles.js';
import {GitMergeDataManager} from './git-merge/GitMergeDataManager.js';
import {GitMergeViewManager} from './git-merge/GitMergeViewManager.js';

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
    unifiedView: { type: Boolean, state: true }
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
    console.log('GitMergeView: JRPC connection ready');
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
    await this.dataManager.loadFileContents();
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

  renderHeader() {
    return html`
      <div class="git-merge-header">
        <div class="commit-info">
          <span>From: <span class="commit-hash">${this.fromCommit?.substring(0, 7) || 'None'}</span></span>
          <span>→</span>
          <span>To: <span class="commit-hash">${this.toCommit?.substring(0, 7) || 'None'}</span></span>
        </div>
        
        <div class="header-controls">
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

  renderFileTabs() {
    if (!this.changedFiles || this.changedFiles.length === 0) return '';
    
    return html`
      <div class="file-tabs">
        ${this.changedFiles.map(file => html`
          <button 
            class="file-tab ${file === this.selectedFile ? 'active' : ''}"
            @click=${() => this.selectFile(file)}
          >
            ${file}
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
    
    if (!this.fromCommit || !this.toCommit) {
      return html`<div class="no-changes">Select commits to view changes</div>`;
    }
    
    if (this.changedFiles.length === 0) {
      return html`<div class="no-changes">No changes between selected commits</div>`;
    }
    
    return html`
      <div class="merge-content">
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
