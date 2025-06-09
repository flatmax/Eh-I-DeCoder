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
import '../app-sidebar.js';
import '../prompt-view.js';
import '../merge-editor.js';
import './GitHistoryView.js';

export class MainWindow extends ResizeMixin(KeyboardShortcutsMixin(ConnectionMixin(JRPCClient))) {
  static properties = {
    showFileTree: { type: Boolean, state: true },
    showMergeEditor: { type: Boolean, state: true },
    showConnectionDetails: { type: Boolean, state: true },
    headerExpanded: { type: Boolean, state: true },
    sidebarExpanded: { type: Boolean, state: true },
    activeTabIndex: { type: Number, state: true },
    gitHistoryMode: { type: Boolean, state: true }
  };
  
  constructor() {
    super();
    this.remoteTimeout = 300;
    this.debug = false;
    this.showFileTree = true;
    this.showMergeEditor = true;
    this.showConnectionDetails = false;
    this.headerExpanded = false;
    this.sidebarExpanded = true;
    this.activeTabIndex = 0;
    this.gitHistoryMode = false;
    
    // Bind methods
    this.handleOpenFile = this.handleOpenFile.bind(this);
    this.toggleGitHistoryMode = this.toggleGitHistoryMode.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
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
    }
    
    .mode-toggle {
      position: fixed;
      top: 10px;
      left: 30px;
      z-index: 1000;
      background: #2196F3;
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: all 0.2s ease;
    }
    
    .mode-toggle:hover {
      background: #1976D2;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    
    .mode-toggle:active {
      transform: translateY(0);
    }
    
    .resize-handle {
      width: 5px;
      background-color: #ddd;
      cursor: col-resize;
      transition: background-color 0.2s;
      z-index: 10;
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
      padding: 10px;
      margin: 10px;
      gap: 10px;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      min-height: 0;
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
    
    // Connect on startup
    console.log('MainWindow: First connection attempt on startup');
    
    // Schedule reconnect
    this.scheduleReconnect();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(event) {
    // Ctrl+G or Ctrl+H to toggle git history mode
    if ((event.ctrlKey || event.metaKey) && (event.key === 'g' || event.key === 'h')) {
      event.preventDefault();
      this.toggleGitHistoryMode();
    }
  }

  toggleGitHistoryMode() {
    this.gitHistoryMode = !this.gitHistoryMode;
    console.log(`Switched to ${this.gitHistoryMode ? 'Git History' : 'File Explorer'} mode`);
  }
  
  /**
   * LitElement render method
   */
  render() {
    return html`
      <!-- Mode Toggle Button -->
      <button class="mode-toggle" @click=${this.toggleGitHistoryMode} title="Toggle between File Explorer and Git History modes (Ctrl+G)">
        ${this.gitHistoryMode ? '📁 File Mode' : '📊 History Mode'}
      </button>

      <!-- Main Content -->
      ${this.gitHistoryMode ? this.renderGitHistoryMode() : this.renderFileExplorerMode()}
      
      <!-- Floating Prompt View Dialog - Always Available and Always Visible -->
      <prompt-view .serverURI=${this.serverURI}></prompt-view>
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
          ${this.showMergeEditor ? 
            html`<merge-editor .serverURI=${this.serverURI}></merge-editor>` : ''}
        </div>
        <prompt-view .serverURI=${this.serverURI}></prompt-view>
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
   * Overloading JRPCClient::serverChanged to update child components
   */
  serverChanged() {
    this.connectionStatus = 'connecting';
    this.requestUpdate();
    
    console.log('Updating child components with server URI:', this.serverURI);
    
    // Update all components that need serverURI using the utility function
    Promise.all([
      updateChildComponents(this, 'prompt-view', 'serverURI', this.serverURI),
      updateChildComponents(this, 'app-sidebar', 'serverURI', this.serverURI),
      updateChildComponents(this, 'merge-editor', 'serverURI', this.serverURI),
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
    
    // Find merge editor component
    const mergeEditor = this.shadowRoot.querySelector('merge-editor');
    if (!mergeEditor) {
      console.error('Merge editor not found');
      return;
    }
    
    // Load the file in the editor
    mergeEditor.loadFileContent(filePath);
    
    // If a line number was specified, scroll to it after loading
    if (lineNumber && typeof lineNumber === 'number') {
      // Give time for the editor to load
      setTimeout(() => {
        mergeEditor.scrollToLine(lineNumber);
      }, 500);
    }
    
    // Ensure the editor is visible
    this.showMergeEditor = true;
  }
}
