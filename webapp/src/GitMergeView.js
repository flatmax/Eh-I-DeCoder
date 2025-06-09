import {LitElement, html, css} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {LineHighlight} from './editor/LineHighlight.js';
import {MergeViewManager} from './editor/MergeViewManager.js';
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
    
    this.lineHighlight = null;
    this.mergeViewManager = null;
    
    this.toggleViewMode = this.toggleViewMode.bind(this);
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .git-merge-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e1e4e8;
      flex-shrink: 0;
    }

    .commit-info {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 12px;
      color: #586069;
    }

    .commit-hash {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      background: #f1f8ff;
      padding: 2px 6px;
      border-radius: 3px;
      color: #0366d6;
      font-weight: 600;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .view-toggle-button {
      background: #f1f8ff;
      border: 1px solid #c8e1ff;
      color: #0366d6;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    }

    .view-toggle-button:hover {
      background: #e1f5fe;
    }

    .file-tabs {
      display: flex;
      overflow-x: auto;
      background: #f6f8fa;
      border-bottom: 1px solid #e1e4e8;
      flex-shrink: 0;
    }

    .file-tab {
      padding: 8px 16px;
      border: none;
      background: none;
      cursor: pointer;
      font-size: 12px;
      color: #586069;
      border-bottom: 2px solid transparent;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .file-tab:hover {
      background: #f1f3f4;
      color: #24292e;
    }

    .file-tab.active {
      color: #0366d6;
      border-bottom-color: #0366d6;
      background: white;
    }

    .merge-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .merge-container {
      flex: 1;
      overflow: hidden;
    }

    .loading, .error, .no-changes {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #586069;
      font-style: italic;
      text-align: center;
      padding: 20px;
    }

    .error {
      color: #d73a49;
      background: #fff5f5;
      border: 1px solid #fed7d7;
      border-radius: 4px;
      margin: 16px;
    }

    .nav-button {
      background: #f1f8ff;
      border: 1px solid #c8e1ff;
      color: #0366d6;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .nav-button:hover {
      background: #e1f5fe;
    }

    .nav-icon {
      font-size: 10px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    this.lineHighlight = new LineHighlight(this.shadowRoot);
    this.mergeViewManager = new MergeViewManager(this.shadowRoot, '');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.mergeViewManager?.destroy();
  }

  // Override setupDone to handle JRPC connection ready
  setupDone() {
    super.setupDone?.();
    console.log('GitMergeView: JRPC connection ready');
    // Load changed files if we have commits
    if (this.fromCommit && this.toCommit) {
      this.loadChangedFiles();
    }
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    
    if (changedProperties.has('fromCommit') || changedProperties.has('toCommit')) {
      if (this.fromCommit && this.toCommit && this.call) {
        this.loadChangedFiles();
      }
    }
    
    if (changedProperties.has('selectedFile') || 
        changedProperties.has('fromContent') || 
        changedProperties.has('toContent')) {
      if (this.selectedFile && (this.fromContent !== undefined || this.toContent !== undefined)) {
        setTimeout(() => this.updateMergeView(), 100);
      }
    }
  }

  async loadChangedFiles() {
    if (!this.fromCommit || !this.toCommit) return;
    
    // Check if JRPC connection is ready
    if (!this.call || !this.call['Repo.get_changed_files']) {
      console.log('GitMergeView: JRPC not ready yet for loadChangedFiles');
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    try {
      console.log('GitMergeView: Loading changed files between', this.fromCommit, 'and', this.toCommit);
      // Get list of changed files between commits
      const response = await this.call['Repo.get_changed_files'](this.fromCommit, this.toCommit);
      console.log('GitMergeView: Changed files response:', response);
      
      this.changedFiles = extractResponseData(response, [], true);
      
      // Select first file if available
      if (this.changedFiles.length > 0) {
        this.selectedFile = this.changedFiles[0];
        await this.loadFileContents();
      } else {
        this.selectedFile = '';
        this.fromContent = '';
        this.toContent = '';
      }
      
    } catch (error) {
      console.error('Error loading changed files:', error);
      this.error = `Failed to load changed files: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  async loadFileContents() {
    if (!this.selectedFile || !this.fromCommit || !this.toCommit) return;
    
    // Check if JRPC connection is ready
    if (!this.call || !this.call['Repo.get_file_content']) {
      console.log('GitMergeView: JRPC not ready yet for loadFileContents');
      return;
    }
    
    try {
      console.log('GitMergeView: Loading file contents for', this.selectedFile);
      // Load file content from both commits
      const [fromResponse, toResponse] = await Promise.all([
        this.call['Repo.get_file_content'](this.selectedFile, this.fromCommit),
        this.call['Repo.get_file_content'](this.selectedFile, this.toCommit)
      ]);
      
      this.fromContent = extractResponseData(fromResponse, '');
      this.toContent = extractResponseData(toResponse, '');
      console.log('GitMergeView: Loaded file contents, from length:', this.fromContent.length, 'to length:', this.toContent.length);
      
    } catch (error) {
      console.error('Error loading file contents:', error);
      this.error = `Failed to load file contents: ${error.message}`;
      this.requestUpdate();
    }
  }

  async selectFile(filePath) {
    if (filePath === this.selectedFile) return;
    
    this.selectedFile = filePath;
    await this.loadFileContents();
  }

  toggleViewMode() {
    this.unifiedView = !this.unifiedView;
    setTimeout(() => this.updateMergeView(), 50);
  }

  updateMergeView() {
    const container = this.shadowRoot.querySelector('.merge-container');
    if (!container || !this.mergeViewManager) return;
    
    try {
      this.mergeViewManager.filePath = this.selectedFile;
      this.mergeViewManager.createMergeView(
        container,
        this.fromContent || '',
        this.toContent || '',
        this.unifiedView,
        this
      );
    } catch (error) {
      console.error('Error creating MergeView:', error);
      this.error = `Failed to create merge view: ${error.message}`;
      this.requestUpdate();
    }
  }

  goToNextChunk() {
    this.mergeViewManager?.goToNextChunk(this.unifiedView);
  }

  goToPreviousChunk() {
    this.mergeViewManager?.goToPreviousChunk(this.unifiedView);
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
