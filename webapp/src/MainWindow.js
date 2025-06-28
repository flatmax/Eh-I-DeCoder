/**
 * MainWindow class that extends JRPCClient
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {updateChildComponents} from './Utils.js';
import {ConnectionMixin} from './mixins/ConnectionMixin.js';
import {KeyboardShortcutsMixin} from './mixins/KeyboardShortcutsMixin.js';
import {ResizeMixin} from './mixins/ResizeMixin.js';
import {navigationHistory} from './diffEditor/NavigationHistory.js';
import '../app-sidebar.js';
import '../prompt-view.js';
import './diffEditor/DiffEditor.js';
import './GitHistoryView.js';

export class MainWindow extends ResizeMixin(KeyboardShortcutsMixin(ConnectionMixin(JRPCClient))) {
  static properties = {
    showFileTree: { type: Boolean, state: true },
    showDiffEditor: { type: Boolean, state: true },
    showConnectionDetails: { type: Boolean, state: true },
    headerExpanded: { type: Boolean, state: true },
    sidebarExpanded: { type: Boolean, state: true },
    activeTabIndex: { type: Number, state: true },
    gitHistoryMode: { type: Boolean, state: true },
    lspConnectionStatus: { type: String, state: true },
    lspPort: { type: Number, state: true }
  };
  
  constructor() {
    super();
    this.remoteTimeout = 300;
    this.debug = false;
    this.showFileTree = true;
    this.showDiffEditor = true;
    this.showConnectionDetails = false;
    this.headerExpanded = false;
    this.sidebarExpanded = true;
    this.activeTabIndex = 0;
    this.gitHistoryMode = false;
    this.lspConnectionStatus = 'disconnected';
    this.lspPort = null;
    
    // Parse URL parameters for LSP port
    this.parseURLParameters();
    
    // Bind methods
    this.handleOpenFile = this.handleOpenFile.bind(this);
    this.toggleGitHistoryMode = this.toggleGitHistoryMode.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleModeToggle = this.handleModeToggle.bind(this);
    this.handleRequestFindInFiles = this.handleRequestFindInFiles.bind(this);
    this.handleLspStatusChange = this.handleLspStatusChange.bind(this);
  }
  
  parseURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Parse LSP port
    const lspParam = urlParams.get('lsp');
    if (lspParam) {
      const lspPort = parseInt(lspParam);
      if (!isNaN(lspPort)) {
        this.lspPort = lspPort;
        console.log(`LSP port from URL: ${this.lspPort}`);
      }
    }
  }
  
  static styles = css`
    :host {
      display: block;
      font-family: sans-serif;
      height: 100vh;
      overflow: hidden;
      position: relative;
    }
    .container {
      display: flex;
      height: 100vh;
      overflow: hidden;
      position: relative;
    }
    
    .resize-handle {
      width: 5px;
      background-color: #ddd;
      cursor: col-resize;
      transition: background-color 0.2s;
      z-index: 10;
      flex-shrink: 0;
    }
    
    .resize-handle:hover,
    .resize-handle.active {
      background-color: #2196F3;
    }
    
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      position: relative;
      min-height: 0;
      min-width: 0;
    }

    .editor-wrapper {
      flex: 1;
      display: flex;
      overflow: hidden;
      padding: 10px;
      margin: 10px;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      min-height: 0;
      min-width: 0;
    }

    .git-history-container {
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }

    /* Ensure prompt view is always visible and positioned correctly */
    prompt-view {
      position: fixed;
      z-index: 2000;
      pointer-events: auto;
    }

    /* Ensure app-sidebar doesn't cause layout shifts */
    app-sidebar {
      flex-shrink: 0;
    }
  `;

  /**
   * LitElement lifecycle method - called when element is added to DOM
   */
  connectedCallback() {
    super.connectedCallback();
    
    // Set initial connection status to connecting
    this.connectionStatus = 'connecting';
    
    // Add keyboard event listener
    document.addEventListener('keydown', this.handleKeyDown);
    
    // Listen for request-find-in-files events from DiffEditor
    this.addEventListener('request-find-in-files', this.handleRequestFindInFiles);
    
    // Listen for LSP status changes from DiffEditor
    this.addEventListener('lsp-status-change', this.handleLspStatusChange);
    
    // Connect on startup
    console.log('MainWindow: First connection attempt on startup');
    
    // Schedule reconnect
    this.scheduleReconnect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleKeyDown);
    this.removeEventListener('request-find-in-files', this.handleRequestFindInFiles);
    this.removeEventListener('lsp-status-change', this.handleLspStatusChange);
  }

  handleKeyDown(event) {
    // Ctrl+G or Ctrl+H to toggle git history mode
    if ((event.ctrlKey || event.metaKey) && (event.key === 'g' || event.key === 'h')) {
      event.preventDefault();
      this.toggleGitHistoryMode();
    }
    
    // Alt+Left Arrow for navigation back
    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      this.navigateBack();
    }
    
    // Alt+Right Arrow for navigation forward
    if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      this.navigateForward();
    }
  }

  navigateBack() {
    const position = navigationHistory.goBack();
    if (position) {
      // Switch to file explorer mode if we're in git history mode
      if (this.gitHistoryMode) {
        this.gitHistoryMode = false;
      }
      
      // Find diff editor and navigate to the position
      this.updateComplete.then(() => {
        const diffEditor = this.shadowRoot.querySelector('diff-editor');
        if (diffEditor) {
          diffEditor.loadFileContent(position.filePath, position.line, position.character);
        }
      });
    }
  }

  navigateForward() {
    const position = navigationHistory.goForward();
    if (position) {
      // Switch to file explorer mode if we're in git history mode
      if (this.gitHistoryMode) {
        this.gitHistoryMode = false;
      }
      
      // Find diff editor and navigate to the position
      this.updateComplete.then(() => {
        const diffEditor = this.shadowRoot.querySelector('diff-editor');
        if (diffEditor) {
          diffEditor.loadFileContent(position.filePath, position.line, position.character);
        }
      });
    }
  }

  handleModeToggle(event) {
    this.toggleGitHistoryMode();
  }

  toggleGitHistoryMode() {
    this.gitHistoryMode = !this.gitHistoryMode;
    console.log(`Switched to ${this.gitHistoryMode ? 'Git History' : 'File Explorer'} mode`);
  }

  handleRequestFindInFiles(event) {
    const selectedText = event.detail.selectedText || '';
    
    // Switch to find-in-files tab (tab index 1)
    this.activeTabIndex = 1;
    
    // Focus the find in files search input with selected text
    this.updateComplete.then(() => {
      const sidebar = this.shadowRoot.querySelector('app-sidebar');
      if (sidebar) {
        // Give the sidebar time to switch tabs and render the find-in-files component
        setTimeout(() => {
          const findInFiles = sidebar.shadowRoot?.querySelector('find-in-files');
          if (findInFiles) {
            findInFiles.focusSearchInput(selectedText);
          }
        }, 100);
      }
    });
  }

  handleLspStatusChange(event) {
    const connected = event.detail.connected;
    this.lspConnectionStatus = connected ? 'connected' : 'disconnected';
  }
  
  /**
   * LitElement render method
   */
  render() {
    return html`
      <!-- Main Content -->
      ${this.gitHistoryMode ? this.renderGitHistoryMode() : this.renderFileExplorerMode()}
      
      <!-- Single Floating Prompt View Dialog - Always Available and Always Visible -->
      <prompt-view 
        .serverURI=${this.serverURI}
        .gitHistoryMode=${this.gitHistoryMode}
        @mode-toggle=${this.handleModeToggle}
      ></prompt-view>
    `;
  }

  renderFileExplorerMode() {
    return html`
      <div class="container" @mousemove=${this._handleMouseMove} @mouseup=${this._handleMouseUp}>
        <app-sidebar
          .expanded=${this.sidebarExpanded}
          .width=${this.sidebarWidth}
          .activeTabIndex=${this.activeTabIndex}
          .serverURI=${this.serverURI}
          .newServerURI=${this.newServerURI}
          .connectionStatus=${this.connectionStatus}
          .lspConnectionStatus=${this.lspConnectionStatus}
          .showConnectionDetails=${this.showConnectionDetails}
          @toggle-expanded=${this.handleSidebarToggle}
          @tab-change=${this.handleTabChange}
          @update-server-uri=${this.handleUpdateServerURI}
          @open-file=${this.handleOpenFile}
          style="width: ${this.sidebarExpanded ? this.sidebarWidth + 'px' : '60px'}"
          class=${this.sidebarExpanded ? '' : 'collapsed'}
        ></app-sidebar>
        
        <!-- Resize Handle -->
        <div class="resize-handle" @mousedown=${this._handleMouseDown}></div>
        
        <!-- Main Content Area -->
        <div class="main-content">
          <div class="editor-wrapper">
            ${this.showDiffEditor ? 
              html`<diff-editor 
                .serverURI=${this.serverURI}
                .lspPort=${this.lspPort}
              ></diff-editor>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderGitHistoryMode() {
    return html`
      <div class="git-history-container">
        <git-history-view .serverURI=${this.serverURI}></git-history-view>
      </div>
    `;
  }

  /**
   * Handle sidebar toggle events
   */
  handleSidebarToggle(e) {
    this.sidebarExpanded = e.detail.expanded;
  }

  /**
   * Handle tab change events from sidebar
   */
  handleTabChange(e) {
    this.activeTabIndex = e.detail.activeTabIndex;
  }

  /**
   * Handle server URI update events from sidebar
   */
  handleUpdateServerURI(e) {
    this.newServerURI = e.detail.newServerURI;
    this.updateServerURI();
  }

  /**
   * Overloading JRPC::serverChanged to update child components
   */
  serverChanged() {
    this.connectionStatus = 'connecting';
    this.requestUpdate();
    
    console.log('Updating child components with server URI:', this.serverURI);
    
    // Update all components that need serverURI using the utility function
    Promise.all([
      updateChildComponents(this, 'prompt-view', 'serverURI', this.serverURI),
      updateChildComponents(this, 'app-sidebar', 'serverURI', this.serverURI),
      updateChildComponents(this, 'diff-editor', 'serverURI', this.serverURI),
      updateChildComponents(this, 'git-history-view', 'serverURI', this.serverURI)
    ]).then(() => {
      console.log('All child components updated with server URI');
    });
    
    super.serverChanged();
  }

  /**
   * Handle open file events from the search results
   * @param {CustomEvent} e - Event containing file path and optional line number
   */
  handleOpenFile(e) {
    if (!e || !e.detail) return;
    
    const { filePath, lineNumber } = e.detail;
    console.log(`Opening file: ${filePath}${lineNumber ? ` at line ${lineNumber}` : ''}`);
    
    // Switch to file explorer mode if we're in git history mode
    if (this.gitHistoryMode) {
      this.gitHistoryMode = false;
    }
    
    // Find diff editor component
    const diffEditor = this.shadowRoot.querySelector('diff-editor');
    if (!diffEditor) {
      console.error('Diff editor not found');
      return;
    }
    
    // Load the file in the editor
    diffEditor.loadFileContent(filePath, lineNumber);
    
    // Ensure the diff editor is visible
    this.showDiffEditor = true;
  }
}
