import {html, LitElement} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {LineHighlight} from './editor/LineHighlight.js';
import {MergeViewManager} from './editor/MergeViewManager.js';
import {FileContentLoader} from './editor/FileContentLoader.js';
import {ChangeTracker} from './editor/ChangeTracker.js';
import {mergeEditorStyles} from './editor/MergeEditorStyles.js';

export class MergeEditor extends JRPCClient {
  static properties = {
    filePath: { type: String },
    headContent: { type: String, state: true },
    workingContent: { type: String, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true },
    serverURI: { type: String },
    hasUnsavedChanges: { type: Boolean, state: true },
    unifiedView: { type: Boolean, state: true },
    currentFilePath: { type: String, state: true }
  };
  
  constructor() {
    super();
    this.filePath = '';
    this.headContent = '';
    this.workingContent = '';
    this.loading = false;
    this.error = null;
    this.hasUnsavedChanges = false;
    this.unifiedView = false;
    this.currentFilePath = '';
    
    this.lineHighlight = null;
    this.mergeViewManager = null;
    this.fileContentLoader = null;
    this.changeTracker = null;
    
    this.toggleViewMode = this.toggleViewMode.bind(this);
    this.onChangeTracked = this.onChangeTracked.bind(this);
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    this.lineHighlight = new LineHighlight(this.shadowRoot);
    this.mergeViewManager = new MergeViewManager(this.shadowRoot, this.filePath);
    this.fileContentLoader = new FileContentLoader(this);
    this.changeTracker = new ChangeTracker(this.onChangeTracked);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    this.mergeViewManager?.destroy();
    this.changeTracker?.cleanup();
  }

  onChangeTracked(hasChanges) {
    this.hasUnsavedChanges = hasChanges;
    this.requestUpdate();
  }
  
  getCurrentContent() {
    if (!this.mergeViewManager) return this.workingContent;
    return this.mergeViewManager.getCurrentContent(this.unifiedView) || this.workingContent;
  }
  
  scrollToLine(lineNumber) {
    if (!this.mergeViewManager || !lineNumber) return;
    
    const view = this.mergeViewManager.scrollToLine(lineNumber, this.unifiedView);
    if (view) {
      this.lineHighlight.scrollToLine(view, lineNumber);
    }
  }
  
  toggleViewMode() {
    this.unifiedView = !this.unifiedView;
    this.updateMergeView();
  }

  goToNextChunk() {
    this.mergeViewManager?.goToNextChunk(this.unifiedView);
  }
  
  goToPreviousChunk() {
    this.mergeViewManager?.goToPreviousChunk(this.unifiedView);
  }
  
  async saveChanges() {
    if (!this.filePath || !this.hasUnsavedChanges) return;
    
    try {
      const content = this.getCurrentContent();
      await this.fileContentLoader.saveFileContent(this.filePath, content);
      this.changeTracker.resetChangeTracking(content);
    } catch (error) {
      console.error('Error saving file:', error);
      this.error = `Failed to save file: ${error.message}`;
      this.requestUpdate();
    }
  }

  async loadFileContent(filePath, lineNumber = null) {
    if (!filePath) return;
    
    if (filePath === this.currentFilePath && this.mergeViewManager?.mergeView) {
      console.log(`File ${filePath} already loaded`);
      if (lineNumber !== null) {
        console.log(`Scrolling to line ${lineNumber}`);
        setTimeout(() => this.scrollToLine(lineNumber), 50);
      }
      return;
    }
    
    try {
      this.loading = true;
      this.error = null;
      this.filePath = filePath;
      this.currentFilePath = filePath;
      
      const { headContent, workingContent } = await this.fileContentLoader.loadFileContent(filePath);
      this.headContent = headContent;
      this.workingContent = workingContent;
      
      this.changeTracker.resetChangeTracking(this.workingContent);
      this.mergeViewManager.filePath = filePath;
      this.updateMergeView();
      
      if (lineNumber !== null) {
        setTimeout(() => this.scrollToLine(lineNumber), 300);
      }
      
    } catch (error) {
      console.error('Error loading file content:', error);
      this.error = `Failed to load file content: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }
  
  updateMergeView() {
    const container = this.shadowRoot.querySelector('.merge-container');
    if (!container || !this.mergeViewManager) return;
    
    if (!this.headContent && !this.workingContent) return;
    
    try {
      this.mergeViewManager.createMergeView(
        container, 
        this.headContent, 
        this.workingContent, 
        this.unifiedView, 
        this
      );

      this.changeTracker.setupChangeDetection(() => this.getCurrentContent());
      
    } catch (error) {
      console.error('Error creating MergeView:', error);
      this.error = `Failed to create merge view: ${error.message}`;
      this.requestUpdate();
    }
  }
  
  updated(changedProperties) {
    super.updated(changedProperties);
    
    if (changedProperties.has('headContent') || changedProperties.has('workingContent')) {
      if (this.headContent || this.workingContent) {
        setTimeout(() => this.updateMergeView(), 100);
      }
    }
    
    this.updateComplete.then(() => {
      const buttons = this.shadowRoot.querySelectorAll('.nav-button');
      if (buttons) {
        const prevButton = buttons[0];
        const nextButton = buttons[1];
        if (prevButton) prevButton.title = "Previous Change (Alt+p)";
        if (nextButton) nextButton.title = "Next Change (Alt+n)";
      }
    });
  }

  renderHeader() {
    return html`
      <div class="merge-header">
        <div class="header-left">
          ${!this.unifiedView 
            ? html`<span class="label head-label">HEAD</span>`
            : html`<span class="label unified-label">Unified View</span>`
          }
        </div>
        <div class="header-center">
          <h3>${this.filePath} ${this.hasUnsavedChanges ? html`<span class="unsaved-indicator">*</span>` : ''}</h3>
        </div>
        <div class="header-buttons">
          <button class="view-toggle-button" title="${this.unifiedView ? 'Switch to Side-by-Side View' : 'Switch to Unified View'}" @click=${this.toggleViewMode}>
            ${this.unifiedView ? 'Side-by-Side' : 'Unified'}
          </button>
          <button class="nav-button" title="Previous Change (Alt+p)" @click=${this.goToPreviousChunk}>
            <span class="nav-icon">▲</span>
          </button>
          <button class="nav-button" title="Next Change (Alt+n)" @click=${this.goToNextChunk}>
            <span class="nav-icon">▼</span>
          </button>
        </div>
        <div class="header-right">
          ${!this.unifiedView ? html`<span class="label working-label">Working Directory</span>` : ''}
        </div>
      </div>
    `;
  }

  renderContent() {
    if (this.loading) return html`<div class="loading">Loading file content...</div>`;
    if (this.error) return html`<div class="error">${this.error}</div>`;
    if (!this.filePath) return html`<div class="no-file">Select a file from the Repository tab to view changes</div>`;
    return html`<div class="merge-container"></div>`;
  }
  
  render() {
    return html`
      <div class="merge-editor-container">
        ${this.renderHeader()}
        ${this.renderContent()}
        ${this.hasUnsavedChanges ? 
          html`<md-fab class="save-button" aria-label="Save changes" @click=${this.saveChanges}>
                 <md-icon>save</md-icon>
               </md-fab>` : 
          ''
        }
      </div>
    `;
  }
  
  static styles = mergeEditorStyles;
}

customElements.define('merge-editor', MergeEditor);
