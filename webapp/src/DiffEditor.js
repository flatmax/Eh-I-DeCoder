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
    workingContent: { type: String, state: true },
    isSaving: { type: Boolean, state: true }
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

    .save-indicator {
      background: rgba(0, 255, 0, 0.2);
      color: #00ff00;
      animation: pulse 0.5s ease-in-out;
    }

    @keyframes pulse {
      0% { opacity: 0.5; }
      50% { opacity: 1; }
      100% { opacity: 0.5; }
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
    this.isSaving = false;
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
          <div style="display: flex; align-items: center; gap: 8px;">
            ${this.isSaving ? html`
              <span class="label save-indicator">Saving...</span>
            ` : ''}
            <span class="label working-label">Working Copy</span>
          </div>
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
              @save-file=${this.handleSaveFile}
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

  async reloadIfCurrentFile(data) {
    const filePath = data.filePath;
    
    // Only reload if this is the currently open file
    if (filePath === this.currentFile) {
      console.log(`Reloading current file ${filePath} due to external save`);
      
      // Reload the file content
      await this.loadFileContent(filePath);
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
