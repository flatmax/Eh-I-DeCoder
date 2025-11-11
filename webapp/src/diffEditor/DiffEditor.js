import {html, LitElement} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {FileContentLoader} from './FileContentLoader.js';
import {DiffEditorStyles} from './DiffEditorStyles.js';
import {LanguageDetector} from './LanguageDetector.js';
import {NavigationManager} from './NavigationManager.js';
import {FileManager} from './FileManager.js';
import {LSPManager} from '../lsp/LSPManager.js';
import {EventHelper} from '../utils/EventHelper.js';
import {FileContentService} from '../services/FileContentService.js';
import './MonacoDiffEditor.js';
import './NavigationHistoryGraph.js';

export class DiffEditor extends JRPCClient {
  static properties = {
    serverURI: { type: String },
    lspPort: { type: Number },
    currentFile: { type: String, state: true },
    isLoading: { type: Boolean, state: true },
    headContent: { type: String, state: true },
    workingContent: { type: String, state: true },
    isSaving: { type: Boolean, state: true },
    isConnected: { type: Boolean, state: true },
    leftFilePath: { type: String, state: true },
    rightFilePath: { type: String, state: true },
    comparisonMode: { type: Boolean, state: true }
  };

  static styles = DiffEditorStyles.styles;

  constructor() {
    super();
    this.currentFile = null;
    this.lspPort = null;
    this.isLoading = false;
    this.headContent = '';
    this.workingContent = '';
    this.fileLoader = null;
    this.isSaving = false;
    this.languageDetector = new LanguageDetector();
    this.navigationManager = new NavigationManager(this);
    this.fileManager = new FileManager(this);
    this.lspManager = new LSPManager(this);
    this.isConnected = false;
    this.leftFilePath = null;
    this.rightFilePath = null;
    this.comparisonMode = false;
    
    // Bind event handlers
    this._boundHandleLoadFileToLeft = this.handleLoadFileToLeft.bind(this);
    this._boundHandleLoadFileToRight = this.handleLoadFileToRight.bind(this);
  }

  async connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    // Set up event listeners
    this.addEventListener('open-file', this.handleOpenFile.bind(this));
    this.addEventListener('navigate-to-history', this.navigationManager.handleNavigateToHistory.bind(this.navigationManager));
    
    // Listen for load-to-left and load-to-right events
    window.addEventListener('load-file-to-left', this._boundHandleLoadFileToLeft);
    window.addEventListener('load-file-to-right', this._boundHandleLoadFileToRight);
    
    // Initialize LSP if port is available
    if (this.lspPort) {
      console.log(`DiffEditor: Initializing LSP with port ${this.lspPort}`);
      this.lspManager.initialize(this.lspPort);
    }
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    
    // Initialize LSP when lspPort becomes available
    if (changedProperties.has('lspPort') && this.lspPort && !this.lspManager.isConnected) {
      console.log(`DiffEditor: LSP port updated to ${this.lspPort}, initializing LSP`);
      this.lspManager.initialize(this.lspPort);
    }
  }

  /**
   * Called when JRPC connection is established and ready
   */
  setupDone() {
    console.log('DiffEditor::setupDone - Connection ready');
    this.isConnected = true;
    this.fileLoader = new FileContentLoader(this);
    this.fileManager.setFileLoader(this.fileLoader);
  }
  
  /**
   * Called when remote is up but not yet ready
   */
  remoteIsUp() {
    console.log('DiffEditor::remoteIsUp - Remote connected');
    // Don't initialize file loader yet - wait for setupDone
  }
  
  /**
   * Called when remote disconnects
   */
  remoteDisconnected() {
    console.log('DiffEditor::remoteDisconnected');
    this.isConnected = false;
    this.fileLoader = null;
  }

  render() {
    return html`
      <div class="diff-editor-container">
        <div class="diff-header-container">
          <div class="diff-header-left">
            ${this.comparisonMode ? html`
              <div class="file-path-container">
                <div class="file-directory">${this.leftFilePath ? this.getDirectory(this.leftFilePath) : ''}</div>
                <div class="file-name">${this.leftFilePath ? this.getFilename(this.leftFilePath) : 'No file'}</div>
              </div>
            ` : this.currentFile ? html`
              <div class="file-path-container">
                <div class="file-directory">${this.getDirectory(this.currentFile)}</div>
                <div class="file-name">${this.getFilename(this.currentFile)}</div>
              </div>
            ` : html`
              <h3>No file open</h3>
            `}
            <span class="label head-label">${this.comparisonMode ? 'Left' : 'HEAD'}</span>
          </div>
          <div class="diff-header-center">
            ${this.comparisonMode ? html`
              <div class="comparison-mode-indicator">
                <span>Comparison Mode</span>
                <button class="exit-comparison-btn" @click=${this.exitComparisonMode}>Exit</button>
              </div>
            ` : html`
              <navigation-history-graph></navigation-history-graph>
            `}
          </div>
          <div class="diff-header-right">
            ${this.comparisonMode ? html`
              <div class="file-path-container right-file">
                <div class="file-directory">${this.rightFilePath ? this.getDirectory(this.rightFilePath) : ''}</div>
                <div class="file-name">${this.rightFilePath ? this.getFilename(this.rightFilePath) : 'No file'}</div>
              </div>
            ` : ''}
            ${this.isSaving ? html`
              <span class="label save-indicator">Saving...</span>
            ` : ''}
            <span class="label working-label">${this.comparisonMode ? 'Right' : 'Working Copy'}</span>
          </div>
        </div>
        ${this._renderContent()}
      </div>
    `;
  }

  getDirectory(filePath) {
    const parts = filePath.split('/');
    if (parts.length > 1) {
      return parts.slice(0, -1).join('/') + '/';
    }
    return '';
  }

  getFilename(filePath) {
    return filePath.split('/').pop() || filePath;
  }

  _renderContent() {
    return html`
      <div class="diff-content">
        ${this.isLoading ? html`
          <div class="loading">Loading...</div>
        ` : (this.currentFile || this.comparisonMode) ? html`
          <monaco-diff-editor
            .originalContent=${this.headContent}
            .modifiedContent=${this.workingContent}
            .filePath=${this.comparisonMode ? this.rightFilePath : this.currentFile}
            .language=${this.comparisonMode ? 
              this.languageDetector.getLanguageFromFile(this.rightFilePath || '') : 
              this.languageDetector.getLanguageFromFile(this.currentFile)}
            theme="vs-dark"
            @save-file=${this.handleSaveFile}
            @request-find-in-files=${this.handleRequestFindInFiles}
            @cursor-position-changed=${this.navigationManager.handleCursorPositionChanged.bind(this.navigationManager)}
            @navigation-back=${this.navigationManager.handleNavigationBack.bind(this.navigationManager)}
            @navigation-forward=${this.navigationManager.handleNavigationForward.bind(this.navigationManager)}
            @navigation-track-previous=${this.navigationManager.handleNavigationTrackPrevious.bind(this.navigationManager)}
            @navigation-track-next=${this.navigationManager.handleNavigationTrackNext.bind(this.navigationManager)}
            @content-changed=${this.handleContentChanged}
          ></monaco-diff-editor>
        ` : html`
          <div class="no-file">Open a file to start editing</div>
        `}
      </div>
    `;
  }

  handleOpenFile(event) {
    const filePath = event.detail.filePath;
    const lineNumber = event.detail.lineNumber || null;
    if (filePath && this.isConnected) {
      this.exitComparisonMode();
      this.fileManager.loadFileContent(filePath, lineNumber);
    }
  }

  async handleLoadFileToLeft(event) {
    const filePath = event.detail.filePath;
    if (!filePath || !this.isConnected) return;

    console.log('Loading file to left:', filePath);
    
    // Enter comparison mode
    this.comparisonMode = true;
    this.leftFilePath = filePath;
    
    // Load the file content for the left side
    try {
      const content = await FileContentService.loadFile(this, filePath, 'working');
      this.headContent = content;
      
      // If right side is not set, clear it
      if (!this.rightFilePath) {
        this.workingContent = '';
      }
    } catch (error) {
      console.error('Error loading file to left:', error);
    }
  }

  async handleLoadFileToRight(event) {
    const filePath = event.detail.filePath;
    if (!filePath || !this.isConnected) return;

    console.log('Loading file to right:', filePath);
    
    // Enter comparison mode
    this.comparisonMode = true;
    this.rightFilePath = filePath;
    
    // Load the file content for the right side
    try {
      const content = await FileContentService.loadFile(this, filePath, 'working');
      this.workingContent = content;
      
      // If left side is not set, clear it
      if (!this.leftFilePath) {
        this.headContent = '';
      }
    } catch (error) {
      console.error('Error loading file to right:', error);
    }
  }

  exitComparisonMode() {
    this.comparisonMode = false;
    this.leftFilePath = null;
    this.rightFilePath = null;
    this.headContent = '';
    this.workingContent = '';
  }

  handleContentChanged(event) {
    // Handle content changes for LSP
    if (this.lspManager.isConnected && this.currentFile && !this.comparisonMode) {
      const uri = `file://${this.currentFile}`;
      const content = event.detail.content;
      const version = event.detail.version || 1;
      
      // Update LSP with the new content
      this.lspManager.updateDocument(uri, content, version);
    }
  }

  async handleSaveFile(event) {
    if (this.comparisonMode) {
      console.warn('Cannot save in comparison mode');
      alert('Cannot save files in comparison mode. Exit comparison mode first.');
      return;
    }

    if (!this.currentFile) {
      console.error('No file currently open to save');
      return;
    }

    if (!this.isConnected) {
      console.warn('Cannot save file - not connected');
      alert('Cannot save file - not connected to server');
      return;
    }

    const content = event.detail.content;
    this.isSaving = true;

    try {
      console.log(`Saving changes to file: ${this.currentFile}`);
      await FileContentService.saveFile(this, this.currentFile, content);
      
      console.log(`File ${this.currentFile} saved successfully`);
      // Update the working content to reflect the saved state
      this.workingContent = content;
      
      // Show save indicator briefly
      setTimeout(() => {
        this.isSaving = false;
      }, 1000);
    } catch (error) {
      console.error(`Error saving file ${this.currentFile}:`, error);
      alert(`Failed to save file: ${error.message}`);
      this.isSaving = false;
    }
  }

  handleRequestFindInFiles(event) {
    // Get the selected text from the event
    const selectedText = event.detail.selectedText || '';
    
    // Re-dispatch the event so it bubbles up to MainWindow using EventHelper
    EventHelper.dispatchRequestFindInFiles(this, selectedText);
  }

  getCurrentCursorPosition() {
    const monacoEditor = this.shadowRoot.querySelector('monaco-diff-editor');
    if (monacoEditor) {
      return monacoEditor.getCurrentPosition();
    }
    return { lineNumber: 1, column: 1 };
  }

  // Public API method - delegates to fileManager
  async loadFileContent(filePath, lineNumber = null, characterNumber = null) {
    if (!this.isConnected) {
      console.warn('Cannot load file - not connected');
      return;
    }

    // Exit comparison mode when loading a file normally
    this.exitComparisonMode();

    // If a file is currently open in the LSP, notify the server that it's being closed.
    if (this.lspManager.isConnected && this.currentFile) {
      const oldUri = `file://${this.currentFile}`;
      this.lspManager.closeDocument(oldUri);
    }

    const result = await this.fileManager.loadFileContent(filePath, lineNumber, characterNumber);
    
    // Open the new document in the LSP server.
    if (this.lspManager.isConnected && this.currentFile) {
      const uri = `file://${this.currentFile}`;
      const languageId = this.lspManager.getLanguageIdFromFile(this.currentFile);
      this.lspManager.openDocument(uri, languageId, this.workingContent);
    }
    
    return result;
  }

  async reloadIfCurrentFile(data) {
    if (this.isConnected && !this.comparisonMode) {
      await this.fileManager.reloadIfCurrentFile(data);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Remove window event listeners
    window.removeEventListener('load-file-to-left', this._boundHandleLoadFileToLeft);
    window.removeEventListener('load-file-to-right', this._boundHandleLoadFileToRight);
    
    // Clean up LSP connection
    if (this.lspManager) {
      this.lspManager.destroy();
    }
  }
}

customElements.define('diff-editor', DiffEditor);
