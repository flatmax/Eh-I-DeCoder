import {html, LitElement, css} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {FileContentLoader} from './editor/FileContentLoader.js';
import './MonacoDiffEditor.js';

export class DiffEditor extends JRPCClient {
  static properties = {
    serverURI: { type: String },
    currentFile: { type: String, state: true },
    isLoading: { type: Boolean, state: true },
    headContent: { type: String, state: true },
    workingContent: { type: String, state: true }
  };

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      overflow: hidden;
    }

    .diff-editor-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: #1e1e1e;
      color: #d4d4d4;
      overflow: hidden;
    }

    .diff-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: #2d2d30;
      border-bottom: 1px solid #3e3e42;
      flex-shrink: 0;
    }

    .diff-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #cccccc;
      font-family: monospace;
    }

    .label {
      padding: 4px 12px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 500;
    }

    .head-label { 
      background: rgba(78, 201, 176, 0.2);
      color: #4ec9b0;
    }
    
    .working-label { 
      background: rgba(255, 215, 0, 0.2);
      color: #ffd700;
    }

    .diff-content {
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    .loading, .error, .no-file {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      font-style: italic;
    }

    .error { color: #f44336; }

    monaco-diff-editor {
      width: 100%;
      height: 100%;
    }
  `;

  constructor() {
    super();
    this.currentFile = null;
    this.isLoading = false;
    this.headContent = '';
    this.workingContent = '';
    this.fileLoader = null;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    // Set up event listeners
    this.addEventListener('open-file', this.handleOpenFile.bind(this));
  }

  async remoteIsUp() {
    console.log('DiffEditor: Remote is up');
    this.fileLoader = new FileContentLoader(this);
  }

  async setupDone() {
    console.log('DiffEditor: Setup done');
  }

  render() {
    return html`
      <div class="diff-editor-container">
        <div class="diff-header">
          <div style="display: flex; align-items: center; gap: 16px;">
            ${this.currentFile ? html`
              <h3>${this.currentFile}</h3>
            ` : html`
              <h3>No file open</h3>
            `}
            <span class="label head-label">HEAD</span>
          </div>
          <span class="label working-label">Working Copy</span>
        </div>
        
        <div class="diff-content">
          ${this.isLoading ? html`
            <div class="loading">Loading...</div>
          ` : this.currentFile ? html`
            <monaco-diff-editor
              .originalContent=${this.headContent}
              .modifiedContent=${this.workingContent}
              .language=${this.getLanguageFromFile(this.currentFile)}
              theme="vs-dark"
            ></monaco-diff-editor>
          ` : html`
            <div class="no-file">Open a file to start editing</div>
          `}
        </div>
      </div>
    `;
  }

  handleOpenFile(event) {
    const filePath = event.detail.filePath;
    const lineNumber = event.detail.lineNumber || null;
    if (filePath) {
      this.loadFileContent(filePath, lineNumber);
    }
  }

  async loadFileContent(filePath, lineNumber = null) {
    if (!this.fileLoader) {
      console.error('File loader not initialized');
      return;
    }

    this.isLoading = true;
    this.currentFile = filePath;

    try {
      const { headContent, workingContent } = await this.fileLoader.loadFileContent(filePath);
      this.headContent = headContent;
      this.workingContent = workingContent;
      this.isLoading = false;
      
      console.log('File content loaded:', {
        filePath,
        headLength: headContent.length,
        workingLength: workingContent.length
      });

      // TODO: Handle lineNumber scrolling in future update
      if (lineNumber) {
        console.log(`Line number ${lineNumber} specified, but scrolling not yet implemented`);
      }
    } catch (error) {
      console.error('Failed to load file:', error);
      this.isLoading = false;
    }
  }

  getLanguageFromFile(filePath) {
    if (!filePath) return 'plaintext';
    
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'xml': 'xml',
      'md': 'markdown',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'java': 'java',
      'sh': 'shell',
      'bash': 'shell',
      'yml': 'yaml',
      'yaml': 'yaml'
    };
    
    return languageMap[ext] || 'plaintext';
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }
}

customElements.define('diff-editor', DiffEditor);
