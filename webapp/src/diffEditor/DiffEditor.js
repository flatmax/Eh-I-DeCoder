import {html, LitElement} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {FileContentLoader} from './FileContentLoader.js';
import {DiffEditorStyles} from './DiffEditorStyles.js';
import {LanguageDetector} from './LanguageDetector.js';
import {NavigationManager} from './NavigationManager.js';
import {FileManager} from './FileManager.js';
import {LSPManager} from '../lsp/LSPManager.js';
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
    isSaving: { type: Boolean, state: true }
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
  }

  async connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    // Set up event listeners
    this.addEventListener('open-file', this.handleOpenFile.bind(this));
    this.addEventListener('navigate-to-history', this.navigationManager.handleNavigateToHistory.bind(this.navigationManager));
    
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

  async remoteIsUp() {
    console.log('DiffEditor: Remote is up');
    this.fileLoader = new FileContentLoader(this);
    this.fileManager.setFileLoader(this.fileLoader);
  }

  async setupDone() {
    console.log('DiffEditor: Setup done');
  }

  render() {
    return html`
      <div class="diff-editor-container">
        <div class="diff-header-container">
          <div class="diff-header-left">
            ${this.currentFile ? html`
              <div class="file-path-container">
                <div class="file-directory">${this.getDirectory(this.currentFile)}</div>
                <div class="file-name">${this.getFilename(this.currentFile)}</div>
              </div>
            ` : html`
              <h3>No file open</h3>
            `}
            <span class="label head-label">HEAD</span>
          </div>
          <div class="diff-header-center">
            <navigation-history-graph></navigation-history-graph>
          </div>
          <div class="diff-header-right">
            ${this.isSaving ? html`
              <span class="label save-indicator">Saving...</span>
            ` : ''}
            <span class="label working-label">Working Copy</span>
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
        ` : this.currentFile ? html`
          <monaco-diff-editor
            .originalContent=${this.headContent}
            .modifiedContent=${this.workingContent}
            .filePath=${this.currentFile}
            .language=${this.languageDetector.getLanguageFromFile(this.currentFile)}
            theme="vs-dark"
            @save-file=${this.handleSaveFile}
            @request-find-in-files=${this.handleRequestFindInFiles}
            @cursor-position-changed=${this.navigationManager.handleCursorPositionChanged.bind(this.navigationManager)}
            @navigation-back=${this.navigationManager.handleNavigationBack.bind(this.navigationManager)}
            @navigation-forward=${this.navigationManager.handleNavigationForward.bind(this.navigationManager)}
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
    if (filePath) {
      this.fileManager.loadFileContent(filePath, lineNumber);
    }
  }

  handleContentChanged(event) {
    // Handle content changes for LSP
    if (this.lspManager.isConnected && this.currentFile) {
      const uri = `file://${this.currentFile}`;
      const content = event.detail.content;
      const version = event.detail.version || 1;
      
      // Update LSP with the new content
      this.lspManager.updateDocument(uri, content, version);
    }
  }

  async handleSaveFile(event) {
    if (!this.currentFile) {
      console.error('No file currently open to save');
      return;
    }

    const content = event.detail.content;
    this.isSaving = true;

    try {
      console.log(`Saving changes to file: ${this.currentFile}`);
      const response = await this.call['Repo.save_file_content'](this.currentFile, content);
      
      if (response && response.error) {
        console.error(`Error saving file: ${response.error}`);
        alert(`Failed to save file: ${response.error}`);
      } else {
        console.log(`File ${this.currentFile} saved successfully`);
        // Update the working content to reflect the saved state
        this.workingContent = content;
        
        // Show save indicator briefly
        setTimeout(() => {
          this.isSaving = false;
        }, 1000);
      }
    } catch (error) {
      console.error(`Error saving file ${this.currentFile}:`, error);
      alert(`Failed to save file: ${error.message}`);
      this.isSaving = false;
    }
  }

  handleRequestFindInFiles(event) {
    // Get the selected text from the event
    const selectedText = event.detail.selectedText || '';
    
    // Re-dispatch the event so it bubbles up to MainWindow
    this.dispatchEvent(new CustomEvent('request-find-in-files', {
      detail: { selectedText },
      bubbles: true,
      composed: true
    }));
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
    await this.fileManager.reloadIfCurrentFile(data);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Clean up LSP connection
    if (this.lspManager) {
      this.lspManager.destroy();
    }
  }
}

customElements.define('diff-editor', DiffEditor);
