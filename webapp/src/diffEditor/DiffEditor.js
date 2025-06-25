import {html, LitElement} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {FileContentLoader} from './FileContentLoader.js';
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
    
    // Wait for Monaco editor to be ready
    await this.updateComplete;
    const monacoEditor = this.shadowRoot.querySelector('monaco-diff-editor');
    
    if (monacoEditor) {
      // Initialize LSP through Monaco editor
      try {
        const rootUri = 'file://' + (await this.call['Repo.get_repo_root']() || process.cwd());
        await monacoEditor.initializeLSP(this, rootUri);
        
        // Emit LSP status
        this.dispatchEvent(new CustomEvent('lsp-status-change', {
          detail: { connected: true },
          bubbles: true,
          composed: true
        }));
      } catch (error) {
        console.error('Failed to initialize LSP:', error);
        this.dispatchEvent(new CustomEvent('lsp-status-change', {
          detail: { connected: false },
          bubbles: true,
          composed: true
        }));
      }
    }
  }

  getClientCapabilities() {
    // Return Monaco editor capabilities
    return {
      textDocument: {
        synchronization: {
          dynamicRegistration: true,
          willSave: true,
          willSaveWaitUntil: true,
          didSave: true
        },
        completion: {
          dynamicRegistration: true,
          completionItem: {
            snippetSupport: true,
            commitCharactersSupport: true,
            documentationFormat: ['markdown', 'plaintext'],
            deprecatedSupport: true,
            preselectSupport: true
          },
          completionItemKind: {
            valueSet: Array.from({ length: 25 }, (_, i) => i + 1)
          },
          contextSupport: true
        },
        hover: {
          dynamicRegistration: true,
          contentFormat: ['markdown', 'plaintext']
        },
        definition: {
          dynamicRegistration: true
        },
        references: {
          dynamicRegistration: true
        },
        documentSymbol: {
          dynamicRegistration: true,
          symbolKind: {
            valueSet: Array.from({ length: 26 }, (_, i) => i + 1)
          }
        },
        codeAction: {
          dynamicRegistration: true
        },
        formatting: {
          dynamicRegistration: true
        },
        rename: {
          dynamicRegistration: true
        }
      },
      workspace: {
        applyEdit: true,
        workspaceEdit: {
          documentChanges: true
        },
        configuration: true,
        workspaceFolders: true
      }
    };
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

      // Emit event to notify FileTree/RepoTree that a file has been loaded
      document.dispatchEvent(new CustomEvent('file-loaded-in-editor', {
        detail: { filePath },
        bubbles: true,
        composed: true
      }));

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
      console.log(`Checking if reload needed for ${filePath} due to external save`);
      
      // Get the current content from the editor
      const monacoEditor = this.shadowRoot.querySelector('monaco-diff-editor');
      const currentContent = monacoEditor?.getModifiedContent();
      
      // Load the new content from disk
      try {
        const { headContent, workingContent } = await this.fileLoader.loadFileContent(filePath);
        
        // Only reload if the content has actually changed
        if (currentContent !== workingContent) {
          console.log(`Content changed, reloading file ${filePath}`);
          
          // Store current cursor position
          const cursorPosition = this.lastCursorPosition;
          
          // Update the content
          this.headContent = headContent;
          this.workingContent = workingContent;
          
          // Wait for the editor to update, then restore cursor position
          await this.updateComplete;
          if (monacoEditor) {
            monacoEditor.scrollToPosition(cursorPosition.line, cursorPosition.character);
          }
        } else {
          console.log(`Content unchanged, skipping reload for ${filePath}`);
        }
      } catch (error) {
        console.error('Failed to check file content:', error);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }
}

customElements.define('diff-editor', DiffEditor);
