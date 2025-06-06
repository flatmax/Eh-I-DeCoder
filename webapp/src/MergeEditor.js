import {html, css, LitElement} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {EditorView, keymap} from '@codemirror/view';
import {extractResponseData} from './Utils.js';
import {EditorState} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {MergeView, unifiedMergeView, goToNextChunk, goToPreviousChunk} from '@codemirror/merge';
import {search} from '@codemirror/search';
import {diffTheme, commonEditorTheme} from './editor/EditorThemes.js';
import {createCommonKeymap} from './editor/EditorKeymap.js';
import {getLanguageExtension} from './editor/LanguageExtensions.js';
import {LineHighlight} from './editor/LineHighlight.js';

export class MergeEditor extends JRPCClient {
  static properties = {
    filePath: { type: String },
    headContent: { type: String, state: true },
    workingContent: { type: String, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true },
    serverURI: { type: String },
    hasUnsavedChanges: { type: Boolean, state: true },
    originalContent: { type: String, state: true },
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
    this.mergeView = null;
    this.hasUnsavedChanges = false;
    this.originalContent = '';
    this.unifiedView = false;
    this.currentFilePath = '';
    this.lineHighlight = null;
    
    // Bind methods to this instance
    this.checkForChanges = this.checkForChanges.bind(this);
    this.toggleViewMode = this.toggleViewMode.bind(this);
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    this.lineHighlight = new LineHighlight(this.shadowRoot);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.mergeView) {
      this.mergeView.destroy();
      this.mergeView = null;
    }
    
    // Clean up interval
    if (this.changeDetectionInterval) {
      clearInterval(this.changeDetectionInterval);
      this.changeDetectionInterval = null;
    }
  }
  
  // Get current content from the active editor
  getCurrentContent() {
    if (!this.mergeView) return this.workingContent;
    
    if (this.unifiedView) {
      return this.mergeView.state.doc.toString();
    } else if (this.mergeView.b) {
      return this.mergeView.b.state.doc.toString();
    }
    return this.workingContent;
  }
  
  /**
   * Scrolls to a specific line in the editor
   * @param {number} lineNumber - The line number to scroll to
   */
  scrollToLine(lineNumber) {
    if (!this.mergeView || !lineNumber) return;
    
    // Determine which view to use based on mode
    const view = this.unifiedView ? this.mergeView : this.mergeView.b;
    if (!view) return;
    
    this.lineHighlight.scrollToLine(view, lineNumber);
  }
  
  // Reset unsaved changes flag
  resetChangeTracking() {
    this.hasUnsavedChanges = false;
    this.originalContent = this.getCurrentContent();
    this.requestUpdate();
  }
  
  // Toggle between unified and side-by-side view
  toggleViewMode() {
    this.unifiedView = !this.unifiedView;
    this.updateMergeView();
  }

  // Navigate to next chunk in the diff view and center it
  goToNextChunk() {
    if (!this.mergeView) return;
    
    if (!this.unifiedView && this.mergeView.b) {
      const view = this.mergeView.b;
      goToNextChunk(view);
      this._centerActiveSelection(view);
    } else if (this.unifiedView) {
      const view = this.mergeView;
      goToNextChunk(view);
      this._centerActiveSelection(view);
    }
  }
  
  // Navigate to previous chunk in the diff view and center it
  goToPreviousChunk() {
    if (!this.mergeView) return;
    
    if (!this.unifiedView && this.mergeView.b) {
      const view = this.mergeView.b;
      goToPreviousChunk(view);
      this._centerActiveSelection(view);
    } else if (this.unifiedView) {
      const view = this.mergeView;
      goToPreviousChunk(view);
      this._centerActiveSelection(view);
    }
  }
  
  // Helper method to center the current selection/cursor in view
  _centerActiveSelection(view) {
    const selection = view.state.selection.main;
    view.dispatch({
      effects: EditorView.scrollIntoView(selection, {
        y: "center"
      })
    });
  }
  
  // Set up polling for changes
  setupChangeDetection() {
    // Clean up any existing interval
    if (this.changeDetectionInterval) {
      clearInterval(this.changeDetectionInterval);
    }
    
    // Check for changes every second
    this.changeDetectionInterval = setInterval(this.checkForChanges, 1000);
  }
  
  // Check if content has changed from original
  checkForChanges() {
    if (!this.mergeView || !this.mergeView.b) return;
    
    const currentContent = this.getCurrentContent();
    
    if (currentContent !== this.originalContent) {
      this.hasUnsavedChanges = true;
      this.requestUpdate();
    }
  }
  
  async saveChanges() {
    if (!this.filePath || !this.hasUnsavedChanges) return;
    
    try {
      // Get the current content from the editor
      const content = this.getCurrentContent();
      
      // Save the file via the Repo API
      console.log(`Saving changes to file: ${this.filePath}`);
      const response = await this.call['Repo.save_file_content'](this.filePath, content);
      
      // Check response
      if (response.error) {
        console.error('Error saving file:', response.error);
        this.error = `Failed to save file: ${response.error}`;
        this.requestUpdate();
        return;
      }
      
      // Update tracking state
      this.resetChangeTracking();
      console.log('File saved successfully');
      
    } catch (error) {
      console.error('Error saving file:', error);
      this.error = `Failed to save file: ${error.message}`;
      this.requestUpdate();
    }
  }

  async loadFileContent(filePath, lineNumber = null) {
    if (!filePath) return;
    
    // Check if this is the same file that's already loaded
    if (filePath === this.currentFilePath && this.mergeView) {
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
      
      console.log(`Loading file content for: ${filePath}`);
      
      // Get HEAD version and working directory version
      const headResponse = await this.call['Repo.get_file_content'](filePath, 'HEAD');
      const workingResponse = await this.call['Repo.get_file_content'](filePath, 'working');
      
      // Extract content from responses (handle UUID wrapper)
      this.headContent = this.extractContent(headResponse);
      this.workingContent = this.extractContent(workingResponse);
      
      // Reset change tracking whenever we load a new file
      this.hasUnsavedChanges = false;
      this.originalContent = this.workingContent;
      
      console.log('File content loaded:', {
        filePath,
        headLength: this.headContent.length,
        workingLength: this.workingContent.length
      });
      
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
  
  extractContent(response) {
    return extractResponseData(response, '');
  }
  
  updateMergeView() {
    const container = this.shadowRoot.querySelector('.merge-container');
    if (!container) return;
    
    // Destroy existing merge view
    if (this.mergeView) {
      this.mergeView.destroy();
      this.mergeView = null;
    }
    
    // Clear container
    container.innerHTML = '';
    
    if (!this.headContent && !this.workingContent) return;
    
    try {
      // Create search configuration with panel at top
      const searchConfig = search({
        top: true // This places the search panel at the top instead of bottom
      });
      
      // Common keyboard shortcuts
      const commonKeymap = createCommonKeymap(this);
      
      if (this.unifiedView) {
        // Create unified view (single editor with the unifiedMergeView extension)
        this.mergeView = new EditorView({
          doc: this.workingContent,
          extensions: [
            basicSetup,
            searchConfig,
            getLanguageExtension(this.filePath),
            ...commonEditorTheme,
            keymap.of(commonKeymap),
            unifiedMergeView({
              original: this.headContent,
              highlightChanges: true,
              gutter: true,
              mergeControls: true
            })
          ],
          parent: container,
          root: this.shadowRoot
        });
      } else {
        // Create side-by-side MergeView
        this.mergeView = new MergeView({
          a: {
            doc: this.headContent,
            extensions: [
              basicSetup,
              searchConfig,
              getLanguageExtension(this.filePath),
              EditorState.readOnly.of(true), // Make left pane read-only
              ...commonEditorTheme
            ]
          },
          b: {
            doc: this.workingContent,
            extensions: [
              basicSetup,
              searchConfig,
              getLanguageExtension(this.filePath),
              ...commonEditorTheme,
              keymap.of(commonKeymap)
            ]
          },
          // Enhanced merge view options
          revertControls: true,
          highlightChanges: true,
          gutter: true,
          lineNumbers: true,
          parent: container,
          root: this.shadowRoot
        });
      }
      
      console.log(`MergeView created successfully (mode: ${this.unifiedView ? 'unified' : 'side-by-side'})`);

      // Store original content for comparison
      this.originalContent = this.workingContent;
      
      // Set up polling for changes
      this.setupChangeDetection();
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
