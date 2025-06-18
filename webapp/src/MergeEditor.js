import {html, LitElement} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {FileContentLoader} from './editor/FileContentLoader.js';
import {languageClient} from './editor/LanguageClient.js';
import {MergeViewManager} from './editor/MergeViewManager.js';
import {LineHighlight} from './editor/LineHighlight.js';
import {mergeEditorStyles} from './editor/MergeEditorStyles.js';
import {NavigationManager} from './editor/managers/NavigationManager.js';
import {FileOperationsManager} from './editor/managers/FileOperationsManager.js';
import {MergeEditorUI} from './editor/managers/MergeEditorUI.js';
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
    this.pendingScrollToLine = null;
    this.loadingPromise = null;
    this.previousFile = null;
    
    // Initialize managers
    this.navigationManager = new NavigationManager(this);
    this.fileOperationsManager = new FileOperationsManager(this);
  }

  static styles = mergeEditorStyles;

  async connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    // Initialize language client connection
    this.initializeLanguageClient();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Editor events
    this.addEventListener('editor-save', this.handleEditorSave.bind(this));
    this.addEventListener('open-find-in-files', this.handleOpenFindInFiles.bind(this));
    
    // Navigation events
    this.addEventListener('navigate-back', this.navigationManager.handleNavigateBack.bind(this.navigationManager));
    this.addEventListener('navigate-forward', this.navigationManager.handleNavigateForward.bind(this.navigationManager));
    this.addEventListener('navigate-to-history', this.navigationManager.handleNavigateToHistory.bind(this.navigationManager));
    
    // File events
    this.addEventListener('open-file', this.handleOpenFile.bind(this));
    this.addEventListener('go-to-definition', this.navigationManager.handleGoToDefinition.bind(this.navigationManager));
    this.addEventListener('show-references', this.navigationManager.handleShowReferences.bind(this.navigationManager));
  }

  async initializeLanguageClient() {
    try {
      await languageClient.connect();
      this.languageClientConnected = true;
      this.dispatchLspStatusChange(true);
      console.log('Language client connected successfully');
    } catch (error) {
      this.languageClientConnected = false;
      this.dispatchLspStatusChange(false);
      
      // Retry connection after delay
      setTimeout(() => this.initializeLanguageClient(), 5000);
    }
  }

  dispatchLspStatusChange(connected) {
    this.dispatchEvent(new CustomEvent('lsp-status-change', {
      detail: { connected },
      bubbles: true,
      composed: true
    }));
  }

  async remoteIsUp() {
    console.log('MergeEditor: Remote is up');
    this.fileLoader = new FileContentLoader(this);
  }

  async setupDone() {
    console.log('MergeEditor: Setup done');
  }

  render() {
    return MergeEditorUI.render(this);
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
        this.navigationManager.startCursorTracking();
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

  handleOpenFile(event) {
    const filePath = event.detail.filePath;
    const lineNumber = event.detail.lineNumber || null;
    if (filePath) {
      this.loadFileContent(filePath, lineNumber);
    }
  }

  // Delegate methods to managers
  async loadFileContent(filePath, lineNumber = null, isNavigating = false) {
    return this.fileOperationsManager.loadFileContent(filePath, lineNumber, isNavigating);
  }

  async saveFile() {
    return this.fileOperationsManager.saveFile();
  }

  async reloadFile() {
    return this.fileOperationsManager.reloadFile();
  }

  reloadIfCurrentFile(data) {
    return this.fileOperationsManager.reloadIfCurrentFile(data);
  }

  scrollToLine(lineNumber) {
    return this.navigationManager.scrollToLine(lineNumber);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.navigationManager.stopCursorTracking();
  }
}
