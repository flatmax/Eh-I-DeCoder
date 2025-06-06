import {html, css, LitElement} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {LineHighlight} from './editor/LineHighlight.js';
import {MergeViewManager} from './editor/MergeViewManager.js';
import {FileContentLoader} from './editor/FileContentLoader.js';
import {ChangeTracker} from './editor/ChangeTracker.js';

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
    
    // Initialize managers
    this.lineHighlight = null;
    this.mergeViewManager = null;
    this.fileContentLoader = null;
    this.changeTracker = null;
    
    // Bind methods to this instance
    this.toggleViewMode = this.toggleViewMode.bind(this);
    this.onChangeTracked = this.onChangeTracked.bind(this);
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    // Initialize managers
    this.lineHighlight = new LineHighlight(this.shadowRoot);
    this.mergeViewManager = new MergeViewManager(this.shadowRoot, this.filePath);
    this.fileContentLoader = new FileContentLoader(this);
    this.changeTracker = new ChangeTracker(this.onChangeTracked);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Clean up managers
    if (this.mergeViewManager) {
      this.mergeViewManager.destroy();
    }
    if (this.changeTracker) {
      this.changeTracker.cleanup();
    }
  }

  onChangeTracked(hasChanges) {
    this.hasUnsavedChanges = hasChanges;
    this.requestUpdate();
  }
  
  // Get current content from the active editor
  getCurrentContent() {
    if (!this.mergeViewManager) return this.workingContent;
    return this.mergeViewManager.getCurrentContent(this.unifiedView) || this.workingContent;
  }
  
  /**
   * Scrolls to a specific line in the editor
   * @param {number} lineNumber - The line number to scroll to
   */
  scrollToLine(lineNumber) {
    if (!this.mergeViewManager || !lineNumber) return;
    
    const view = this.mergeViewManager.scrollToLine(lineNumber, this.unifiedView);
    if (view) {
      this.lineHighlight.scrollToLine(view, lineNumber);
    }
  }
  
  // Toggle between unified and side-by-side view
  toggleViewMode() {
    this.unifiedView = !this.unifiedView;
    this.updateMergeView();
  }

  // Navigate to next chunk in the diff view and center it
  goToNextChunk() {
    if (this.mergeViewManager) {
      this.mergeViewManager.goToNextChunk(this.unifiedView);
    }
  }
  
  // Navigate to previous chunk in the diff view and center it
  goToPreviousChunk() {
    if (this.mergeViewManager) {
      this.mergeViewManager.goToPreviousChunk(this.unifiedView);
    }
  }
  
  async saveChanges() {
    if (!this.filePath || !this.hasUnsavedChanges) return;
    
    try {
      // Get the current content from the editor
      const content = this.getCurrentContent();
      
      // Save the file via the FileContentLoader
      await this.fileContentLoader.saveFileContent(this.filePath, content);
      
      // Update tracking state
      this.changeTracker.resetChangeTracking(content);
      
    } catch (error) {
      console.error('Error saving file:', error);
      this.error = `Failed to save file: ${error.message}`;
      this.requestUpdate();
    }
  }

  async loadFileContent(filePath, lineNumber = null) {
    if (!filePath) return;
    
    // Check if this is the same file that's already loaded
    if (filePath === this.currentFilePath && this.mergeViewManager?.mergeView) {
      console.log(`File ${filePath} already loaded`);
      // If a line number is provided, just scroll to that line
      if (lineNumber !== null) {
        console.log(`Scrolling to line ${lineNumber}`);
        setTimeout(() => this.scrollToLine(lineNumber), 50);
      } else {
        console.log(`Same file clicked, preserving current view state`);
      }
      return;
    }
    
    try {
      this.loading = true;
      this.error = null;
      this.filePath = filePath;
      this.currentFilePath = filePath;
      
      // Load file content
      const { headContent, workingContent } = await this.fileContentLoader.loadFileContent(filePath);
      this.headContent = headContent;
      this.workingContent = workingContent;
      
      // Reset change tracking whenever we load a new file
      this.changeTracker.resetChangeTracking(this.workingContent);
      
      // Update merge view manager with new file path
      this.mergeViewManager.filePath = filePath;
      
      // Update the merge view
      this.updateMergeView();
      
      // If a line number was specified, scroll to it after a delay to ensure the editor is ready
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

      // Set up change tracking
      this.changeTracker.setupChangeDetection(() => this.getCurrentContent());
      
    } catch (error) {
      console.error('Error creating MergeView:', error);
      this.error = `Failed to create merge view: ${error.message}`;
      this.requestUpdate();
    }
  }
  
  updated(changedProperties) {
    super.updated(changedProperties);
    
    // Update merge view when content changes
    if (changedProperties.has('headContent') || changedProperties.has('workingContent')) {
      if (this.headContent || this.workingContent) {
        // Delay to ensure DOM is ready
        setTimeout(() => this.updateMergeView(), 100);
      }
    }
    
    // Force refresh of button tooltips
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
  
  render() {
    return html`
      <div class="merge-editor-container">
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
        
        ${this.loading ? 
          html`<div class="loading">Loading file content...</div>` : 
          this.error ? 
            html`<div class="error">${this.error}</div>` :
            this.filePath ?
              html`<div class="merge-container"></div>` :
              html`<div class="no-file">Select a file from the Repository tab to view changes</div>`
        }
        
        ${this.hasUnsavedChanges ? 
          html`<md-fab class="save-button" aria-label="Save changes" @click=${this.saveChanges}>
                 <md-icon>save</md-icon>
               </md-fab>` : 
          ''
        }
      </div>
    `;
  }
  
  static styles = css`
  :host {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    position: relative;
  }

  .merge-editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .save-button {
    position: absolute;
    bottom: 24px;
    right: 24px;
    z-index: 10;
    --md-fab-container-color: #1976d2;
    --md-fab-icon-color: white;
    --md-sys-color-primary: #1976d2;
  }

  .merge-header {
    padding: 12px;
    border-bottom: 1px solid #ddd;
    background: #f8f9fa;
    display: grid;
    grid-template-columns: 1fr auto auto 1fr;
    align-items: center;
    gap: 16px;
  }
  
  .header-left {
    justify-self: start;
  }
  
  .header-center {
    text-align: center;
  }
  
  .header-buttons {
    justify-self: start;
    display: flex;
    gap: 8px;
  }
  
  .header-right {
    justify-self: end;
  }
  
  .view-toggle-button {
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-right: 8px;
  }
  
  .view-toggle-button:hover {
    background: #e0e0e0;
  }
  
  .view-toggle-button:active {
    background: #d0d0d0;
  }

  .nav-button {
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .nav-button:hover {
    background: #e0e0e0;
  }
  
  .nav-button:active {
    background: #d0d0d0;
  }
  
  .nav-icon {
    font-size: 12px;
    color: #444;
  }

  .merge-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .label {
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 500;
  }

  .head-label {
    background: #e3f2fd;
    color: #1976d2;
  }

  .working-label {
    background: #fff3e0;
    color: #f57c00;
  }
  
  .unified-label {
    background: linear-gradient(to right, #e3f2fd, #fff3e0);
    color: #333;
  }
  
  .unsaved-indicator {
    color: #f44336;
    font-weight: bold;
    margin-left: 5px;
  }

  .merge-container {
    flex: 1;
    overflow: auto;
    position: relative;
  }

  .loading, .error, .no-file {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #666;
    font-style: italic;
  }

  .error {
    color: #d32f2f;
  }

  /* CodeMirror styling */
  .merge-container :global(.cm-merge-view) {
    display: flex !important;
    flex-direction: row !important;
    height: 100%;
    width: 100%;
  }

  .merge-container :global(.cm-merge-view > .cm-editorPane) {
    flex-grow: 1;
    flex-basis: 0;
    overflow: hidden;
    height: 100%;
    position: relative;
  }

  .merge-container :global(.cm-editor) {
    position: relative !important;
    box-sizing: border-box !important;
    display: flex !important;
    flex-direction: column !important;
    height: 100%;
  }

  .merge-container :global(.cm-scroller) {
    flex-grow: 1 !important;
    overflow: auto !important;
    box-sizing: border-box !important;
    position: relative !important;
    outline: none !important;
    font-family: Monaco, Menlo, "Ubuntu Mono", monospace;
  }

  .merge-container :global(.cm-content) {
    box-sizing: border-box !important;
    position: relative !important;
  }

  .merge-container :global(.cm-merge-view .cm-merge-gap) {
    background: #f5f5f5;
    border-left: 1px solid #ddd;
    border-right: 1px solid #ddd;
    position: relative;
  }
  
  .merge-container :global(.cm-merge-view .cm-merge-gap .cm-merge-controls) {
    position: sticky;
    top: 30px;
    padding: 5px;
    background: #f0f0f0;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 2px;
  }
  
  .merge-container :global(.cm-merge-view .cm-merge-controls button) {
    margin: 2px 0;
    padding: 2px 4px;
    font-size: 11px;
    border: 1px solid #ccc;
    border-radius: 3px;
    background: white;
    cursor: pointer;
  }
  
  .merge-container :global(.cm-merge-view .cm-merge-controls button:hover) {
    background: #e6e6e6;
  }
  
  .merge-container :global(.cm-diff-chunk) {
    background: rgba(180, 180, 255, 0.1);
  }
  
  .merge-container :global(.cm-diff-insert-line) {
    background: rgba(0, 255, 0, 0.1);
    border-left: 3px solid rgba(0, 200, 0, 0.8);
  }
  
  .merge-container :global(.cm-diff-delete-line) {
    background: rgba(255, 0, 0, 0.1);
    border-left: 3px solid rgba(200, 0, 0, 0.8);
  }
  
  .merge-container :global(.cm-diff-insert) {
    background: rgba(0, 255, 0, 0.15);
    border-radius: 2px;
  }
  
  .merge-container :global(.cm-diff-delete) {
    background: rgba(255, 0, 0, 0.15);
    border-radius: 2px;
  }
`;
}

customElements.define('merge-editor', MergeEditor);
