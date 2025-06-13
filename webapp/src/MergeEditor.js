import {html, LitElement, css} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {basicSetup, EditorView} from 'codemirror';
import {EditorState} from '@codemirror/state';
import {javascript} from '@codemirror/lang-javascript';
import {python} from '@codemirror/lang-python';
import {html as htmlLang} from '@codemirror/lang-html';
import {css as cssLang} from '@codemirror/lang-css';
import {json} from '@codemirror/lang-json';
import {markdown} from '@codemirror/lang-markdown';
import {oneDark} from '@codemirror/theme-one-dark';
import {FileContentLoader} from './editor/FileContentLoader.js';
import {languageClient} from './editor/LanguageClient.js';
import {createLanguageClientExtension} from './editor/LanguageClientExtension.js';
import {extractResponseData} from './Utils.js';

export class MergeEditor extends JRPCClient {
  static properties = {
    serverURI: { type: String },
    currentFile: { type: String, state: true },
    isLoading: { type: Boolean, state: true },
    hasChanges: { type: Boolean, state: true },
    languageClientConnected: { type: Boolean, state: true }
  };

  constructor() {
    super();
    this.currentFile = null;
    this.isLoading = false;
    this.hasChanges = false;
    this.languageClientConnected = false;
    this.editorView = null;
    this.fileLoader = null;
    this.originalContent = '';
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: #1e1e1e;
      color: #d4d4d4;
    }

    .editor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: #2d2d30;
      border-bottom: 1px solid #3e3e42;
      min-height: 40px;
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .file-path {
      color: #cccccc;
      font-family: monospace;
    }

    .status-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-left: 8px;
    }

    .status-indicator.saved {
      background: #4ec9b0;
    }

    .status-indicator.modified {
      background: #ffd700;
    }

    .editor-actions {
      display: flex;
      gap: 8px;
    }

    button {
      padding: 6px 12px;
      background: #0e639c;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.2s;
    }

    button:hover {
      background: #1177bb;
    }

    button:disabled {
      background: #3e3e42;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .editor-container {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .cm-editor {
      height: 100%;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(30, 30, 30, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #3e3e42;
      border-top-color: #0e639c;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .language-status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #888;
    }

    .language-status.connected {
      color: #4ec9b0;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    
    // Initialize language client connection
    this.initializeLanguageClient();
  }

  async initializeLanguageClient() {
    try {
      await languageClient.connect();
      this.languageClientConnected = true;
      console.log('Language client connected successfully');
    } catch (error) {
      console.error('Failed to connect language client:', error);
      this.languageClientConnected = false;
      
      // Retry connection after delay
      setTimeout(() => this.initializeLanguageClient(), 5000);
    }
  }

  async remoteIsUp() {
    console.log('MergeEditor: Remote is up');
    this.fileLoader = new FileContentLoader(this);
  }

  async setupDone() {
    console.log('MergeEditor: Setup done');
    
    // Listen for file open events
    this.addEventListener('open-file', this.handleOpenFile.bind(this));
    
    // Listen for go-to-definition events from the editor
    this.addEventListener('go-to-definition', this.handleGoToDefinition.bind(this));
    
    // Listen for show-references events from the editor
    this.addEventListener('show-references', this.handleShowReferences.bind(this));
  }

  render() {
    return html`
      <div class="editor-header">
        <div class="file-info">
          ${this.currentFile ? html`
            <span class="file-path">${this.currentFile}</span>
            <span class="status-indicator ${this.hasChanges ? 'modified' : 'saved'}"></span>
          ` : html`
            <span class="file-path">No file open</span>
          `}
          <div class="language-status ${this.languageClientConnected ? 'connected' : ''}">
            <span>LSP:</span>
            <span>${this.languageClientConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        <div class="editor-actions">
          <button 
            @click=${this.saveFile} 
            ?disabled=${!this.hasChanges || this.isLoading}
          >
            Save
          </button>
          <button 
            @click=${this.reloadFile} 
            ?disabled=${!this.currentFile || this.isLoading}
          >
            Reload
          </button>
        </div>
      </div>
      <div class="editor-container">
        ${this.isLoading ? html`
          <div class="loading-overlay">
            <div class="loading-spinner"></div>
          </div>
        ` : ''}
        <div id="editor"></div>
      </div>
    `;
  }

  async firstUpdated() {
    this.initializeEditor();
  }

  initializeEditor() {
    const container = this.shadowRoot.getElementById('editor');
    if (!container) return;

    // Create initial editor state
    const startState = EditorState.create({
      doc: '',
      extensions: [
        basicSetup,
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.handleContentChange();
          }
        })
      ]
    });

    // Create editor view
    this.editorView = new EditorView({
      state: startState,
      parent: container
    });
  }

  async loadFileContent(filePath) {
    if (!this.fileLoader) {
      console.error('File loader not initialized');
      return;
    }

    this.isLoading = true;
    this.currentFile = filePath;

    try {
      const { workingContent } = await this.fileLoader.loadFileContent(filePath);
      this.originalContent = workingContent;
      
      // Update editor with new content and language-specific extensions
      this.updateEditor(workingContent, filePath);
      
      this.hasChanges = false;
      this.isLoading = false;
    } catch (error) {
      console.error('Failed to load file:', error);
      this.isLoading = false;
    }
  }

  updateEditor(content, filePath) {
    if (!this.editorView) return;

    // Get language-specific extension
    const langExtension = this.getLanguageExtension(filePath);
    
    // Create language client extension if connected
    const extensions = [
      basicSetup,
      oneDark,
      langExtension,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          this.handleContentChange();
        }
      })
    ];

    // Add language client extension if connected
    if (this.languageClientConnected) {
      extensions.push(createLanguageClientExtension(languageClient, filePath));
    }

    // Create new state with content and extensions
    const newState = EditorState.create({
      doc: content,
      extensions
    });

    // Update the editor
    this.editorView.setState(newState);
  }

  getLanguageExtension(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    
    switch (ext) {
      case 'js':
      case 'jsx':
        return javascript({ jsx: true });
      case 'ts':
      case 'tsx':
        return javascript({ jsx: true, typescript: true });
      case 'py':
        return python();
      case 'html':
        return htmlLang();
      case 'css':
        return cssLang();
      case 'json':
        return json();
      case 'md':
        return markdown();
      default:
        return [];
    }
  }

  handleContentChange() {
    if (!this.editorView) return;
    
    const currentContent = this.editorView.state.doc.toString();
    this.hasChanges = currentContent !== this.originalContent;
  }

  async saveFile() {
    if (!this.currentFile || !this.hasChanges || !this.fileLoader) return;

    this.isLoading = true;

    try {
      const content = this.editorView.state.doc.toString();
      await this.fileLoader.saveFileContent(this.currentFile, content);
      
      this.originalContent = content;
      this.hasChanges = false;
      this.isLoading = false;
      
      // Notify user of successful save
      this.dispatchEvent(new CustomEvent('file-saved', {
        detail: { filePath: this.currentFile },
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      console.error('Failed to save file:', error);
      this.isLoading = false;
    }
  }

  async reloadFile() {
    if (!this.currentFile) return;
    
    // Confirm if there are unsaved changes
    if (this.hasChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to reload?');
      if (!confirm) return;
    }
    
    await this.loadFileContent(this.currentFile);
  }

  scrollToLine(lineNumber) {
    if (!this.editorView) return;
    
    const line = this.editorView.state.doc.line(lineNumber);
    if (!line) return;
    
    // Scroll to line and place cursor there
    this.editorView.dispatch({
      selection: { anchor: line.from },
      scrollIntoView: true
    });
    
    // Focus the editor
    this.editorView.focus();
  }

  handleOpenFile(event) {
    const { filePath, lineNumber } = event.detail;
    this.loadFileContent(filePath);
    
    if (lineNumber) {
      // Wait for content to load before scrolling
      setTimeout(() => this.scrollToLine(lineNumber), 100);
    }
  }

  handleGoToDefinition(event) {
    const definition = event.detail;
    if (!definition) return;
    
    // Handle array of locations or single location
    const location = Array.isArray(definition) ? definition[0] : definition;
    if (!location) return;
    
    // Extract file path and position from location
    const filePath = location.uri.replace('file://', '');
    const lineNumber = location.range.start.line + 1;
    
    // Open file at definition
    this.dispatchEvent(new CustomEvent('open-file', {
      detail: { filePath, lineNumber },
      bubbles: true,
      composed: true
    }));
  }

  handleShowReferences(event) {
    const references = event.detail;
    if (!references || references.length === 0) return;
    
    // For now, just log references
    console.log('References found:', references);
    
    // TODO: Show references in a panel or dialog
    // This could be implemented as a separate component
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Clean up editor
    if (this.editorView) {
      this.editorView.destroy();
    }
  }
}

customElements.define('merge-editor', MergeEditor);
