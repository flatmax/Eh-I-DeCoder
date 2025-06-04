import {html, css, LitElement} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {EditorView, keymap} from '@codemirror/view';
import {EditorState, EditorSelection} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {MergeView, unifiedMergeView, goToNextChunk, goToPreviousChunk} from '@codemirror/merge';
import {defaultKeymap, indentWithTab} from '@codemirror/commands';
import {oneDark} from '@codemirror/theme-one-dark';
import {search, searchKeymap} from '@codemirror/search';
import {javascript} from '@codemirror/lang-javascript';
import {python} from '@codemirror/lang-python';
import {html as htmlLang} from '@codemirror/lang-html';
import {css as cssLang} from '@codemirror/lang-css';
import {json} from '@codemirror/lang-json';
import {markdown} from '@codemirror/lang-markdown';
import {cpp} from '@codemirror/lang-cpp';

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
    unifiedView: { type: Boolean, state: true }
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
    
    // Bind methods to this instance
    this.checkForChanges = this.checkForChanges.bind(this);
    this.toggleViewMode = this.toggleViewMode.bind(this);
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
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
      
      // Center the current cursor position
      this._centerActiveSelection(view);
    } else if (this.unifiedView) {
      const view = this.mergeView;
      goToNextChunk(view);
      
      // Center the current cursor position
      this._centerActiveSelection(view);
    }
  }
  
  // Navigate to previous chunk in the diff view and center it
  goToPreviousChunk() {
    if (!this.mergeView) return;
    
    if (!this.unifiedView && this.mergeView.b) {
      const view = this.mergeView.b;
      goToPreviousChunk(view);
      
      // Center the current cursor position
      this._centerActiveSelection(view);
    } else if (this.unifiedView) {
      const view = this.mergeView;
      goToPreviousChunk(view);
      
      // Center the current cursor position
      this._centerActiveSelection(view);
    }
  }
  
  // Helper method to center the current selection/cursor in view
  _centerActiveSelection(view) {
    const selection = view.state.selection.main;
    // Use scrollIntoView with 'center' alignment option
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
  
  remoteIsUp() {
    console.log('MergeEditor::remoteIsUp');
  }
  
  async loadFileContent(filePath) {
    if (!filePath) return;
    
    try {
      this.loading = true;
      this.error = null;
      this.filePath = filePath;
      
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
      
    } catch (error) {
      console.error('Error loading file content:', error);
      this.error = `Failed to load file content: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }
  
  extractContent(response) {
    if (typeof response === 'string') {
      return response;
    } else if (typeof response === 'object' && !Array.isArray(response)) {
      // Handle UUID wrapper
      const keys = Object.keys(response);
      if (keys.length > 0) {
        const content = response[keys[0]];
        return typeof content === 'string' ? content : content?.content || '';
      }
    }
    return '';
  }
  
  getLanguageExtension(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return javascript();
      case 'py':
        return python();
      case 'html':
      case 'htm':
        return htmlLang();
      case 'css':
        return cssLang();
      case 'json':
        return json();
      case 'md':
      case 'markdown':
        return markdown();
      case 'c':
      case 'h':
      case 'cpp':
      case 'hpp':
        return cpp();
      default:
        return [];
    }
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
      // Create CSS theme specifically for diff highlighting
      const diffTheme = EditorView.theme({
        // Styles for inserted content (in right editor)
        ".cm-diff-insert": {
          backgroundColor: "rgba(0, 255, 0, 0.15)",
        },
        ".cm-diff-insert-line": {
          backgroundColor: "rgba(0, 255, 0, 0.1)",
          borderLeft: "3px solid rgba(0, 200, 0, 0.8)",
        },
        
        // Styles for deleted content (in left editor)
        ".cm-diff-delete": {
          backgroundColor: "rgba(255, 0, 0, 0.15)",
        },
        ".cm-diff-delete-line": {
          backgroundColor: "rgba(255, 0, 0, 0.1)",
          borderLeft: "3px solid rgba(200, 0, 0, 0.8)",
        },
        
        // Styles for modified chunks
        ".cm-diff-chunk": {
          backgroundColor: "rgba(180, 180, 255, 0.1)",
        },
        
        // Gap styles
        ".cm-merge-gap": {
          backgroundColor: "#f5f5f5",
          borderLeft: "1px solid #ddd",
          borderRight: "1px solid #ddd",
        },
      });
      
      // Create search configuration with panel at top
      const searchConfig = search({
        top: true // This places the search panel at the top instead of bottom
      });
      
      // Common keyboard shortcuts
      const commonKeymap = [
        // Save shortcut (Mod = Ctrl on Windows/Linux, Cmd on Mac)
        {
          key: "Mod-s",
          run: () => {
            this.saveChanges();
            return true; // Prevent other keymap handlers
          }
        },
        ...searchKeymap, // Add search keyboard shortcuts
        // Next chunk navigation (Alt+n)
        {
          key: "Alt-n",
          run: () => {
            this.goToNextChunk();
            return true;
          }
        },
        // Previous chunk navigation (Alt+p)
        {
          key: "Alt-p",
          run: () => {
            this.goToPreviousChunk();
            return true;
          }
        },
        indentWithTab,
        ...defaultKeymap
      ];
      
      const commonEditorTheme = [
        oneDark,
        diffTheme,
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }
        })
      ];
      
      if (this.unifiedView) {
        // Create unified view (single editor with the unifiedMergeView extension)
        this.mergeView = new EditorView({
          doc: this.workingContent,
          extensions: [
            basicSetup,
            searchConfig,
            this.getLanguageExtension(this.filePath),
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
              this.getLanguageExtension(this.filePath),
              EditorState.readOnly.of(true), // Make left pane read-only
              ...commonEditorTheme
            ]
          },
          b: {
            doc: this.workingContent,
            extensions: [
              basicSetup,
              searchConfig,
              this.getLanguageExtension(this.filePath),
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

  .merge-labels {
    display: flex;
    justify-content: space-between;
    width: 100%;
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

  /* === BEGIN CodeMirror Base and MergeView Styles === */

  /* Styles for MergeView layout (ensure side-by-side) */
  /* CodeMirror's MergeView typically sets display:flex inline, but good to be sure */
  .merge-container :global(.cm-merge-view) {
    display: flex !important; /* Ensure flex display */
    flex-direction: row !important; /* Ensure side-by-side */
    height: 100%;
    width: 100%;
  }

  .merge-container :global(.cm-merge-view > .cm-editorPane) { /* Panes holding each editor */
    flex-grow: 1;
    flex-basis: 0;
    overflow: hidden; /* Important */
    height: 100%;
    position: relative; /* CM might need this */
  }

  .merge-container :global(.cm-merge-view > .cm-gutter) { /* The gutter between panes */
    flex-grow: 0;
    flex-shrink: 0;
    /* You might need to style width, borders, background for the gutter here if not showing */
    /* Example:
    width: 10px;
    border-left: 1px solid #ccc;
    border-right: 1px solid #ccc;
    background-color: #f0f0f0;
    */
  }

  /* Essential styles from EditorView.baseTheme (these are illustrative, get the full set) */
  .merge-container :global(.cm-editor) {
    position: relative !important;
    box-sizing: border-box !important;
    display: flex !important; /* CRITICAL for internal layout */
    flex-direction: column !important; /* CRITICAL for internal layout */
    height: 100%; /* Your theme already sets this for '&', which is .cm-editor */
  }

  .merge-container :global(.cm-scroller) {
    flex-grow: 1 !important;
    overflow: auto !important;
    box-sizing: border-box !important;
    position: relative !important; /* Often needed */
    outline: none !important;
    font-family: Monaco, Menlo, "Ubuntu Mono", monospace; /* Your theme */
  }

  .merge-container :global(.cm-content) {
    box-sizing: border-box !important;
    position: relative !important; /* Crucial for positioning lines, selections */
    /* Add other .cm-content styles from baseTheme if needed */
  }

  .merge-container :global(.cm-line) {
     /* Add .cm-line styles from baseTheme if needed */
  }

  /* Add other necessary base styles: .cm-gutters, .cm-lineNumbers, .cm-activeLine, etc. */
  /* The more complete these base styles are, the better CM will render. */

  /* === END CodeMirror Base and MergeView Styles === */


  /* Enhanced CodeMirror diff and merge view styling */
  .merge-container :global(.cm-merge-view .cm-merge-gap) {
    background: #f5f5f5;
    border-left: 1px solid #ddd;
    border-right: 1px solid #ddd;
    position: relative;
  }
  
  /* Controls in the gap */
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
  
  /* Chunk styling */
  .merge-container :global(.cm-diff-chunk) {
    background: rgba(180, 180, 255, 0.1);
  }
  
  /* Line styling */
  .merge-container :global(.cm-diff-insert-line) {
    background: rgba(0, 255, 0, 0.1);
    border-left: 3px solid rgba(0, 200, 0, 0.8);
  }
  
  .merge-container :global(.cm-diff-delete-line) {
    background: rgba(255, 0, 0, 0.1);
    border-left: 3px solid rgba(200, 0, 0, 0.8);
  }
  
  /* Character-level diff styling */
  .merge-container :global(.cm-diff-insert) {
    background: rgba(0, 255, 0, 0.15);
    border-radius: 2px;
  }
  
  .merge-container :global(.cm-diff-delete) {
    background: rgba(255, 0, 0, 0.15);
    border-radius: 2px;
  }
  
  /* Match the dark theme for better contrast */
  .merge-container.theme-dark :global(.cm-diff-insert) {
    background: rgba(0, 255, 0, 0.2);
  }
  
  .merge-container.theme-dark :global(.cm-diff-delete) {
    background: rgba(255, 0, 0, 0.2);
  }
`;
}
