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
import './AppSidebar.js';
import '../prompt-view.js';
import '../merge-editor.js';

export class MainWindow extends ResizeMixin(KeyboardShortcutsMixin(ConnectionMixin(JRPCClient))) {
  static properties = {
    showPromptView: { type: Boolean, state: true },
    showFileTree: { type: Boolean, state: true },
    showMergeEditor: { type: Boolean, state: true },
    showConnectionDetails: { type: Boolean, state: true },
    headerExpanded: { type: Boolean, state: true },
    sidebarExpanded: { type: Boolean, state: true },
    activeTabIndex: { type: Number, state: true }
  };
  
  constructor() {
    super();
    this.remoteTimeout = 300;
    this.debug = false;
    this.showPromptView = true;
    this.showFileTree = true;
    this.showMergeEditor = true;
    this.showConnectionDetails = false;
    this.headerExpanded = false;
    this.sidebarExpanded = true;
    this.activeTabIndex = 0;
    
    // Bind methods
    this.handleOpenFile = this.handleOpenFile.bind(this);
  }
  
  static styles = css`
    :host {
      display: block;
      font-family: sans-serif;
      height: 100vh;
      overflow: hidden;
    }
    .container {
      display: flex;
      height: 100vh;
      overflow: hidden;
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
  `;

  /**
   * LitElement lifecycle method - called when element is added to DOM
   */
  connectedCallback() {
    super.connectedCallback();
    
    // Set initial connection status to connecting
    this.connectionStatus = 'connecting';
    
    // Connect on startup
    console.log('MainWindow: First connection attempt on startup');
    
    // Schedule reconnect
    this.scheduleReconnect();
  }
  
  /**
   * LitElement render method
   */
  render() {
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
        
        <!-- Floating Prompt View Dialog -->
        ${this.showPromptView ? 
          html`<prompt-view .serverURI=${this.serverURI}></prompt-view>` : ''}
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
      updateChildComponents(this, 'merge-editor', 'serverURI', this.serverURI)
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

customElements.define('main-window', MainWindow);
