import {html, LitElement} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {FileContentLoader} from './editor/FileContentLoader.js';
import {languageClient} from './editor/LanguageClient.js';
import {MergeViewManager} from './editor/MergeViewManager.js';
import {LineHighlight} from './editor/LineHighlight.js';
import {mergeEditorStyles} from './editor/MergeEditorStyles.js';
import {navigationHistory} from './editor/NavigationHistory.js';
import './editor/NavigationHistoryGraph.js';

export class MergeEditor extends JRPCClient {
  static properties = {
    serverURI: { type: String },
    currentFile: { type: String, state: true },
    isLoading: { type: Boolean, state: true },
    hasChanges: { type: Boolean, state: true },
    languageClientConnected: { type: Boolean, state: true },
    headContent: { type: String, state: true },
    workingContent: { type: String, state: true }
  };

  constructor() {
    super();
    this.currentFile = null;
    this.isLoading = false;
    this.hasChanges = false;
    this.languageClientConnected = false;
    this.fileLoader = null;
    this.headContent = '';
    this.workingContent = '';
    this.originalWorkingContent = '';
    this.mergeViewManager = null;
    this.lineHighlight = null;
    this.pendingScrollToLine = null; // Store pending scroll request
    this.loadingPromise = null; // Track current loading operation
    this.previousFile = null; // Track previous file for navigation history
    this.cursorUpdateTimer = null; // Timer for debouncing cursor updates
  }

  static styles = mergeEditorStyles;

  async connectedCallback() {
    super.connectedCallback();
    
    // Initialize language client connection
    this.initializeLanguageClient();
    
    // Listen for editor save events
    this.addEventListener('editor-save', this.handleEditorSave.bind(this));
    
    // Listen for open find in files events from the editor
    this.addEventListener('open-find-in-files', this.handleOpenFindInFiles.bind(this));
    
    // Listen for navigation events
    this.addEventListener('navigate-back', this.handleNavigateBack.bind(this));
    this.addEventListener('navigate-forward', this.handleNavigateForward.bind(this));
    
    // Listen for navigation from the graph
    this.addEventListener('navigate-to-history', this.handleNavigateToHistory.bind(this));
  }

  async initializeLanguageClient() {
    try {
      await languageClient.connect();
      this.languageClientConnected = true;
      console.log('Language client connected successfully');
    } catch (error) {
      // Silenced: console.error('Failed to connect language client:', error);
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
    const historyGraph = html`
      <navigation-history-graph
        .currentFile=${this.currentFile}
      ></navigation-history-graph>
    `;

    return html`
      <div class="merge-editor-container">
        ${historyGraph}
        
        <div class="merge-header">
          <div class="header-left">
            ${this.currentFile ? html`
              <h3>${this.currentFile}${this.hasChanges ? html`<span class="unsaved-indicator">●</span>` : ''}</h3>
            ` : html`
              <h3>No file open</h3>
            `}
          </div>
          <div class="header-center">
            <span class="label head-label">HEAD</span>
          </div>
          <div class="header-center">
            <span class="label working-label">Working Copy</span>
          </div>
          <div class="header-right">
            <div class="language-status ${this.languageClientConnected ? 'connected' : ''}">
              <span>LSP:</span>
              <span>${this.languageClientConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
        
        <div class="merge-container">
          ${this.isLoading ? html`
            <div class="loading">Loading...</div>
          ` : this.currentFile ? html`
            <div id="editor"></div>
          ` : html`
            <div class="no-file">Open a file to start editing</div>
          `}
        </div>
      </div>
      
      ${this.hasChanges ? html`
        <md-fab 
          class="save-button"
          @click=${this.saveFile}
          ?disabled=${this.isLoading}
        >
          <md-icon slot="icon">save</md-icon>
        </md-fab>
      ` : ''}
    `;
  }

  async firstUpdated() {
    // Don't initialize here, wait for file content to be loaded
  }

  async updated(changedProperties) {
    super.updated(changedProperties);
    
    // If we have content and the editor container exists, initialize the merge view
    if (this.currentFile && this.headContent !== undefined && this.workingContent !== undefined && !this.isLoading) {
      const container = this.shadowRoot.getElementById('editor');
      if (container && !this.mergeViewManager) {
        console.log('Creating MergeViewManager in updated()');
        this.mergeViewManager = new MergeViewManager(container, {
          onContentChange: () => this.handleContentChange(),
          shadowRoot: this.shadowRoot
        });
        
        // Initialize line highlight helper
        this.lineHighlight = new LineHighlight(this.shadowRoot);
        
        // Initialize the merge view with content
        this.mergeViewManager.initialize(
          this.currentFile,
          this.headContent,
          this.workingContent,
          languageClient,
          this.languageClientConnected
        );

        // Handle any pending scroll request after editor is ready
        this.processPendingScroll();
        
        // Start tracking cursor position
        this.startCursorTracking();
      }
    }
  }

  processPendingScroll() {
    if (this.pendingScrollToLine !== null) {
      // Use multiple delays to ensure the editor is fully rendered
      setTimeout(() => {
        if (this.mergeViewManager && this.lineHighlight) {
          this.scrollToLine(this.pendingScrollToLine);
          this.pendingScrollToLine = null;
        } else {
          // Try again with a longer delay
          setTimeout(() => {
            if (this.mergeViewManager && this.lineHighlight) {
              this.scrollToLine(this.pendingScrollToLine);
              this.pendingScrollToLine = null;
            }
          }, 500);
        }
      }, 200);
    }
  }

  startCursorTracking() {
    // Set up periodic cursor position updates for navigation history
    if (this.cursorUpdateTimer) {
      clearInterval(this.cursorUpdateTimer);
    }
    
    this.cursorUpdateTimer = setInterval(() => {
      if (this.mergeViewManager && this.currentFile && !navigationHistory.isNavigating) {
        const pos = this.mergeViewManager.getCursorPosition();
        navigationHistory.updateCurrentPosition(pos.line, pos.character);
      }
    }, 500); // Update every 500ms
  }

  stopCursorTracking() {
    if (this.cursorUpdateTimer) {
      clearInterval(this.cursorUpdateTimer);
      this.cursorUpdateTimer = null;
    }
  }

  async loadFileContent(filePath, lineNumber = null, isNavigating = false) {
    if (!this.fileLoader) {
      console.error('File loader not initialized');
      return;
    }

    // If we're already loading this file with the same line number, don't load again
    if (this.loadingPromise && this.currentFile === filePath && this.pendingScrollToLine === lineNumber) {
      return this.loadingPromise;
    }

    // Get cursor position before switching files
    let fromLine = 1;
    let fromChar = 0;
    if (this.mergeViewManager && this.currentFile) {
      const pos = this.mergeViewManager.getCursorPosition();
      fromLine = pos.line;
      fromChar = pos.character;
    }

    // Store the line number for later scrolling if provided
    if (lineNumber !== null) {
      this.pendingScrollToLine = lineNumber;
    } else {
      this.pendingScrollToLine = null;
    }

    this.isLoading = true;
    this.previousFile = this.currentFile;
    this.currentFile = filePath;

    // Create and store the loading promise
    this.loadingPromise = this.performFileLoad(filePath, fromLine, fromChar, lineNumber || 1, 0, isNavigating);
    
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  async performFileLoad(filePath, fromLine, fromChar, toLine, toChar, isNavigating) {
    try {
      const { headContent, workingContent } = await this.fileLoader.loadFileContent(filePath);
      this.headContent = headContent;
      this.workingContent = workingContent;
      this.originalWorkingContent = workingContent;
      
      // Stop cursor tracking while switching files
      this.stopCursorTracking();
      
      // Destroy existing merge view manager if switching files
      if (this.mergeViewManager) {
        this.mergeViewManager.destroy();
        this.mergeViewManager = null;
      }
      
      this.hasChanges = false;
      this.isLoading = false;
      
      // Record file switch in navigation history (unless we're navigating)
      if (!isNavigating) {
        navigationHistory.recordFileSwitch(
          this.previousFile,
          fromLine,
          fromChar,
          filePath,
          toLine,
          toChar
        );
      }
      
      // The merge view will be initialized in updated() lifecycle
      // and any pending scroll will be handled there
    } catch (error) {
      console.error('Failed to load file:', error);
      this.isLoading = false;
      this.pendingScrollToLine = null; // Clear pending scroll on error
      throw error;
    }
  }

  handleContentChange() {
    if (!this.mergeViewManager) return;
    
    const currentContent = this.mergeViewManager.getWorkingContent();
    this.hasChanges = currentContent !== this.originalWorkingContent;
  }

  handleEditorSave(event) {
    event.preventDefault();
    event.stopPropagation();
    this.saveFile();
  }

  handleOpenFindInFiles(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const selectedText = event.detail.selectedText || '';
    
    // Dispatch a different event name to MainWindow to avoid recursion
    this.dispatchEvent(new CustomEvent('request-find-in-files', {
      detail: { selectedText },
      bubbles: true,
      composed: true
    }));
  }

  async handleNavigateBack(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const position = navigationHistory.goBack();
    if (position) {
      await this.loadFileContent(position.filePath, position.line, true);
      
      // Jump to the stored cursor position after loading
      setTimeout(() => {
        if (this.mergeViewManager) {
          this.mergeViewManager.jumpToPosition(position.line, position.character);
        }
        navigationHistory.clearNavigationFlag();
      }, 100);
    }
  }

  async handleNavigateForward(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const position = navigationHistory.goForward();
    if (position) {
      await this.loadFileContent(position.filePath, position.line, true);
      
      // Jump to the stored cursor position after loading
      setTimeout(() => {
        if (this.mergeViewManager) {
          this.mergeViewManager.jumpToPosition(position.line, position.character);
        }
        navigationHistory.clearNavigationFlag();
      }, 100);
    }
  }

  async handleNavigateToHistory(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const { filePath, line, character } = event.detail;
    
    // Use the new navigateToPosition method to update the history state
    const position = navigationHistory.navigateToPosition(filePath, line, character);
    if (position) {
      await this.loadFileContent(filePath, line, true);
      
      // Jump to the stored cursor position after loading
      setTimeout(() => {
        if (this.mergeViewManager) {
          this.mergeViewManager.jumpToPosition(line, character);
        }
        navigationHistory.clearNavigationFlag();
      }, 100);
    }
  }

  async saveFile() {
    if (!this.currentFile || !this.hasChanges || !this.fileLoader || !this.mergeViewManager) return;

    this.isLoading = true;

    try {
      const content = this.mergeViewManager.getWorkingContent();
      await this.fileLoader.saveFileContent(this.currentFile, content);
      
      this.originalWorkingContent = content;
      this.workingContent = content;
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

  handleOpenFile(event) {
    const filePath = event.detail.filePath;
    const lineNumber = event.detail.lineNumber || null;
    if (filePath) {
      this.loadFileContent(filePath, lineNumber);
    }
  }

  handleGoToDefinition(event) {
    const definition = event.detail;
    if (definition && definition.uri) {
      // Extract file path from URI
      const filePath = definition.uri.replace('file://', '');
      
      // Open the file and jump to position
      this.loadFileContent(filePath).then(() => {
        if (this.mergeViewManager && definition.range) {
          // Jump to the definition position
          this.mergeViewManager.jumpToPosition(
            definition.range.start.line + 1,
            definition.range.start.character
          );
        }
      });
    }
  }

  handleShowReferences(event) {
    const references = event.detail;
    if (references && references.length > 0) {
      // For now, just log the references
      console.log('References found:', references);
      
      // TODO: Implement a references panel or quick pick dialog
      // to allow users to navigate through references
    }
  }

  /**
   * Scroll to a specific line in the editor and highlight it
   * @param {number} lineNumber - The line number to scroll to
   */
  scrollToLine(lineNumber) {
    if (!this.mergeViewManager || !this.mergeViewManager.mergeView || !this.lineHighlight) {
      this.pendingScrollToLine = lineNumber;
      return;
    }

    // Get the working editor (right side)
    const workingEditor = this.mergeViewManager.mergeView.b;
    if (!workingEditor) {
      console.warn('MergeEditor: Working editor not available');
      return;
    }

    // Use the line highlight utility to scroll and highlight
    this.lineHighlight.scrollToLine(workingEditor, lineNumber);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopCursorTracking();
  }
}
