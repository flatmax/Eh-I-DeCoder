import {html, LitElement} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {FileContentLoader} from '../editor/FileContentLoader.js';
import {DiffEditorStyles} from './DiffEditorStyles.js';
import {LanguageDetector} from './LanguageDetector.js';
import {navigationHistory} from './NavigationHistory.js';
import './MonacoDiffEditor.js';
import './NavigationHistoryGraph.js';

export class DiffEditor extends JRPCClient {
  static properties = {
    serverURI: { type: String },
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
    this.isLoading = false;
    this.headContent = '';
    this.workingContent = '';
    this.fileLoader = null;
    this.isSaving = false;
    this.languageDetector = new LanguageDetector();
    this.lastCursorPosition = { line: 1, character: 1 };
  }

  async connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    // Set up event listeners
    this.addEventListener('open-file', this.handleOpenFile.bind(this));
    this.addEventListener('navigate-to-history', this.handleNavigateToHistory.bind(this));
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
        ${this._renderHeader()}
        <navigation-history-graph></navigation-history-graph>
        ${this._renderContent()}
      </div>
    `;
  }

  _renderHeader() {
    return html`
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
    `;
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
            .language=${this.languageDetector.getLanguageFromFile(this.currentFile)}
            theme="vs-dark"
            @save-file=${this.handleSaveFile}
            @request-find-in-files=${this.handleRequestFindInFiles}
            @cursor-position-changed=${this.handleCursorPositionChanged}
            @navigation-back=${this.handleNavigationBack}
            @navigation-forward=${this.handleNavigationForward}
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
      this.loadFileContent(filePath, lineNumber);
    }
  }

  handleNavigateToHistory(event) {
    const { filePath, line, character } = event.detail;
    
    // Navigate to the position in history
    const position = navigationHistory.navigateToPosition(filePath, line, character);
    if (position) {
      // Load the file at the specified position
      this.loadFileContent(position.filePath, position.line, position.character);
    }
  }

  handleCursorPositionChanged(event) {
    const { line, character } = event.detail;
    this.lastCursorPosition = { line, character };
    
    // Update current position in navigation history
    navigationHistory.updateCurrentPosition(line, character);
  }

  handleNavigationBack(event) {
    const position = navigationHistory.goBack();
    if (position) {
      this.loadFileContent(position.filePath, position.line, position.character);
    }
  }

  handleNavigationForward(event) {
    const position = navigationHistory.goForward();
    if (position) {
      this.loadFileContent(position.filePath, position.line, position.character);
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

  async loadFileContent(filePath, lineNumber = null, characterNumber = null) {
    if (!this.fileLoader) {
      console.error('File loader not initialized');
      return;
    }

    // Record the file switch in navigation history
    const fromFile = this.currentFile;
    const fromLine = this.lastCursorPosition.line;
    const fromChar = this.lastCursorPosition.character;
    const toLine = lineNumber || 1;
    const toChar = characterNumber || 1;

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

      // Record in navigation history
      navigationHistory.recordFileSwitch(fromFile, fromLine, fromChar, filePath, toLine, toChar);

      // Wait for the editor to be ready, then scroll to position
      await this.updateComplete;
      const monacoEditor = this.shadowRoot.querySelector('monaco-diff-editor');
      if (monacoEditor && (lineNumber || characterNumber)) {
        monacoEditor.scrollToPosition(lineNumber || 1, characterNumber || 1);
      }

      // Clear navigation flag after navigation is complete
      setTimeout(() => {
        navigationHistory.clearNavigationFlag();
      }, 100);
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

  disconnectedCallback() {
    super.disconnectedCallback();
  }
}

customElements.define('diff-editor', DiffEditor);
