/**
 * MainWindow class that extends JRPCClient
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {extractResponseData, updateChildComponents} from './Utils.js';
import '@material/web/button/filled-button.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/icon/icon.js';
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';
import '@material/web/iconbutton/filled-icon-button.js';
import './CommandsTab.js';
import './FindInFiles.js';
import '../prompt-view.js';
import '../repo-tree.js';
import '../merge-editor.js';

export class MainWindow extends JRPCClient {
  static properties = {
    showPromptView: { type: Boolean, state: true },
    showFileTree: { type: Boolean, state: true },
    showMergeEditor: { type: Boolean, state: true },
    serverURI: { type: String },
    newServerURI: { type: String, state: true },
    connectionStatus: { type: String, state: true },
    showConnectionDetails: { type: Boolean, state: true },
    headerExpanded: { type: Boolean, state: true },
    sidebarExpanded: { type: Boolean, state: true },
    activeTabIndex: { type: Number, state: true },
    sidebarWidth: { type: Number, state: true },
    repoName: { type: String, state: true }
  };
  
  constructor() {
    super();
    this.remoteTimeout = 300;
    this.debug = false;
    this.showPromptView = true;
    this.showFileTree = true; // Show file tree by default
    this.showMergeEditor = true; // Show merge editor by default
    
    // Check if port is specified in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const port = urlParams.get('port');
    
    // Set server URI based on URL parameter or default to 8999
    const serverPort = port || '8999';
    this.serverURI = `ws://0.0.0.0:${serverPort}`;
    this.newServerURI = this.serverURI;
    this.connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected'
    this.showConnectionDetails = false;
    this.reconnectTimeout = null; // Timeout for reconnection attempts
    this.reconnectDelay = 1000; // Reconnect after 1 second
    this.headerExpanded = false; // Start with minimized header
    this.sidebarExpanded = true; // Start with expanded sidebar
    this.activeTabIndex = 0; // Default to Repository tab (index 0)
    this.sidebarWidth = 280; // Default sidebar width in pixels
    this.repoName = null; // Repository name for browser tab title
    
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
    .sidebar {
      display: flex;
      flex-direction: column;
      height: 100vh;
      border-right: 1px solid #ccc;
      background: #f5f5f5;
      transition: width 0.3s ease;
      overflow: hidden;
    }
    .sidebar-collapsed {
      width: 60px;
    }
    .sidebar-expanded {
      width: var(--sidebar-width, 280px);
    }
    .sidebar-header {
      padding: 12px;
      border-bottom: 1px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .sidebar-content {
      flex: 1;
      overflow: auto;
      display: flex;
      flex-direction: column;
    }
    .sidebar-toggle {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      color: #333;
      font-size: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sidebar-toggle:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    .sidebar-section {
      margin-bottom: 15px;
      overflow: hidden;
    }
    .sidebar-section-title {
      padding: 8px 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      margin: 0;
      font-size: 14px;
    }
    md-tabs {
      width: 100%;
    }
    .tab-content {
      padding: 8px;
      overflow: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .tab-panel {
      display: none;
      height: 100%;
      flex: 1;
      overflow: auto;
    }
    .tab-panel.active {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 100px);
      width: 100%;
    }
    .sidebar-collapsed .sidebar-section-title span,
    .sidebar-collapsed .connection-status span:not(.connection-led),
    .sidebar-collapsed .sidebar-header span:not(.connection-led) {
      display: none;
    }
    .sidebar-collapsed .sidebar-section-content {
      display: none;
    }
    .connection-status {
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .file-tree-container {
      flex: 1;
      overflow: auto;
      min-height: 200px;
      display: flex;
      flex-direction: column;
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
    .header-section {
      padding: 8px 12px;
      border-bottom: 1px solid #ddd;
    }
    .server-settings-compact {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sidebar-collapsed .server-settings-compact span {
      display: none;
    }
    .button-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      flex-basis: 60%;
    }
    .server-settings {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: #f9f9f9;
      flex-basis: 40%;
    }
    .server-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      cursor: pointer;
    }
    .server-details {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      width: 100%;
    }
    .connection-led {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 5px;
      display: inline-block;
      transition: background-color 0.3s ease;
      position: relative;
      left: 0;
      top: 0;
    }
    .led-disconnected {
      background-color: #ff3b30;
      box-shadow: 0 0 5px #ff3b30;
    }
    .led-connecting {
      background-color: #ffcc00;
      box-shadow: 0 0 5px #ffcc00;
    }
    .led-connected {
      background-color: #34c759;
      box-shadow: 0 0 5px #34c759;
    }
    .server-input {
      flex-grow: 1;
      --md-filled-text-field-container-shape: 4px;
    }
    .current-server {
      font-size: 14px;
      color: #666;
      margin-top: 5px;
    }
    button {
      padding: 8px 16px;
      background-color: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      text-transform: uppercase;
      box-shadow: 0 3px 1px -2px rgba(0,0,0,.2), 0 2px 2px 0 rgba(0,0,0,.14), 0 1px 5px 0 rgba(0,0,0,.12);
    }
    button:hover {
      background-color: #1565c0;
    }
    button[raised] {
      box-shadow: 0 5px 5px -3px rgba(0,0,0,.2), 0 8px 10px 1px rgba(0,0,0,.14), 0 3px 14px 2px rgba(0,0,0,.12);
    }
  `;

  /**
   * Called when server is ready to use
   */
  setupDone() {
    console.log('MainWindow setupDone: UI created with prompt view');
    this.connectionStatus = 'connected';
    this.requestUpdate();
        
    // Load repository name and update browser title
    this.loadRepoName();

    console.log(this.call)
  }
  
  /**
   * LitElement lifecycle method - called when element is added to DOM
   */
  connectedCallback() {
    super.connectedCallback();
    
    // Set initial connection status to connecting
    this.connectionStatus = 'connecting';
    
    // Connect on startup
    console.log('MainWindow: First connection attempt on startup');
    // Connection happens automatically through JRPCClient
    
    // Schedule reconnect
    this.scheduleReconnect();
    
    // Add keyboard shortcut listener
    document.addEventListener('keydown', this._handleKeyboardShortcuts.bind(this));
  }
  
  /**
   * Handle keyboard shortcuts globally
   */
  _handleKeyboardShortcuts(event) {
    // Ctrl+Shift+F: Focus search input
    if (event.ctrlKey && event.shiftKey && event.key === 'F') {
      event.preventDefault(); // Prevent default browser behavior
      this._focusSearchInput();
    }
  }
  
  /**
   * Focus the search input in FindInFiles
   */
  _focusSearchInput() {
    // Switch to the search tab (index 1)
    this.activeTabIndex = 1;
    this.requestUpdate();
    
    // Wait for the DOM update to complete
    this.updateComplete.then(() => {
      // Find the search input inside FindInFiles component
      const findInFiles = this.shadowRoot.querySelector('find-in-files');
      if (findInFiles) {
        // Wait for FindInFiles component to update
        findInFiles.updateComplete.then(() => {
          // Find the Material Design text field component
          const textField = findInFiles.shadowRoot.querySelector('md-outlined-text-field');
          if (textField) {
            // Focus the text field
            textField.focus();
            console.log('Search input focused');
          } else {
            console.warn('md-outlined-text-field not found in FindInFiles');
          }
        });
      } else {
        console.warn('FindInFiles component not found');
      }
    });
  }
  
  /**
   * Load repository name and set browser tab title
   */
  async loadRepoName() {
    try {
      console.log('Loading repository name...');
      const response = await this.call['Repo.get_repo_name']();
      
      // Extract the repository name from the response
      const repoName = extractResponseData(response);
      
      if (repoName && !repoName.error) {
        this.repoName = repoName;
        this.updateBrowserTitle();
        console.log(`Repository name loaded: ${repoName}`);
      } else {
        console.log('Could not load repository name:', response);
        this.updateBrowserTitle(); // Update with default title
      }
    } catch (error) {
      console.error('Error loading repository name:', error);
      this.updateBrowserTitle(); // Update with default title
    }
  }
  
  /**
   * Update the browser tab title
   */
  updateBrowserTitle() {
    if (this.repoName) {
      document.title = `${this.repoName} - Aider`;
    } else {
      document.title = 'Aider';
    }
  }
  
  /**
   * Toggle connection details visibility
   */
  toggleConnectionDetails() {
    this.showConnectionDetails = !this.showConnectionDetails;
    this.requestUpdate();
  }

  /**
   * Handle tab change events from md-tabs
   */
  handleTabChange(e) {
    console.log('Tab change event:', e);
    this.activeTabIndex = e.target.activeTabIndex;
    this.requestUpdate();
  }

  /**
   * Update tabs component after render to sync active tab
   */
  updated(changedProperties) {
    super.updated(changedProperties);
    
    if (changedProperties.has('activeTabIndex')) {
      // Update the md-tabs component to reflect the active tab
      const tabsElement = this.shadowRoot.querySelector('md-tabs');
      if (tabsElement && tabsElement.activeTabIndex !== this.activeTabIndex) {
        tabsElement.activeTabIndex = this.activeTabIndex;
      }
    }
  }
  
  /**
   * LitElement render method
   */
  render() {
    const toggleSidebar = () => this.sidebarExpanded = !this.sidebarExpanded;
    const toggleHeaderExpanded = () => this.headerExpanded = !this.headerExpanded;
    const toggleConnectionDetails = () => this.showConnectionDetails = !this.showConnectionDetails;
    
    const ledClasses = {
      'connection-led': true,
      [`led-${this.connectionStatus}`]: true
    };
    
    const sidebarClasses = {
      'sidebar': true,
      'sidebar-expanded': this.sidebarExpanded,
      'sidebar-collapsed': !this.sidebarExpanded
    };
    
    return html`
      <div class="container" @mousemove=${this._handleMouseMove} @mouseup=${this._handleMouseUp}>
        <div class=${classMap(sidebarClasses)} style="width: ${this.sidebarExpanded ? this.sidebarWidth + 'px' : '60px'}">
          <!-- Sidebar Header -->
          <div class="sidebar-header">
            <span class=${classMap(ledClasses)}></span>
            <md-filled-icon-button 
              icon="${this.sidebarExpanded ? 'chevron_left' : 'chevron_right'}" 
              @click=${toggleSidebar}>
            </md-filled-icon-button>
          </div>
          
          <!-- Sidebar Content -->
          <div class="sidebar-content">
            <!-- Tabs Navigation -->
            <md-tabs
              .activeTabIndex=${this.activeTabIndex}
              @change=${this.handleTabChange}
            >
              <md-primary-tab 
                aria-label="Repository Tab" 
                title=${this.sidebarExpanded ? "Repository" : ""}
              >
                ${this.sidebarExpanded ? "Repository" : html`<md-icon>source</md-icon>`}
              </md-primary-tab>
              <md-primary-tab 
                aria-label="Search Tab" 
                title=${this.sidebarExpanded ? "Search" : ""}
              >
                ${this.sidebarExpanded ? "Search" : html`<md-icon>search</md-icon>`}
              </md-primary-tab>
              <md-primary-tab 
                aria-label="Commands Tab" 
                title=${this.sidebarExpanded ? "Commands" : ""}
              >
                ${this.sidebarExpanded ? "Commands" : html`<md-icon>tune</md-icon>`}
              </md-primary-tab>
              <md-primary-tab 
                aria-label="Settings Tab" 
                title=${this.sidebarExpanded ? "Settings" : ""}
              >
                ${this.sidebarExpanded ? "Settings" : html`<md-icon>settings</md-icon>`}
              </md-primary-tab>
            </md-tabs>
            
            <!-- Tab Content -->
            <div class="tab-content">
              <!-- Repository Tab Panel -->
              <div class=${classMap({
                'tab-panel': true,
                'active': this.activeTabIndex === 0
              })} style="${this.activeTabIndex === 0 ? 'display: flex;' : 'display: none;'}">
                <div class="file-tree-container">
                  <repo-tree .serverURI=${this.serverURI}></repo-tree>
                </div>
              </div>
              
              <!-- Search Tab Panel -->
              <div class=${classMap({
                'tab-panel': true,
                'active': this.activeTabIndex === 1
              })} style="${this.activeTabIndex === 1 ? 'display: flex;' : 'display: none;'}">
                <find-in-files .serverURI=${this.serverURI} @open-file=${this.handleOpenFile}></find-in-files>
              </div>
              
              <!-- Commands Tab Panel -->
              <div class=${classMap({
                'tab-panel': true,
                'active': this.activeTabIndex === 2
              })} style="${this.activeTabIndex === 2 ? 'display: flex;' : 'display: none;'}">
                <files-and-settings .serverURI=${this.serverURI}></files-and-settings>
              </div>
              
              <!-- Settings Tab Panel -->
              <div class=${classMap({
                'tab-panel': true,
                'active': this.activeTabIndex === 3
              })} style="${this.activeTabIndex === 3 ? 'display: flex;' : 'display: none;'}">
                <!-- Server Status Section -->
                <div class="connection-status">
                  <span class=${classMap(ledClasses)}></span>
                  <span>${this.connectionStatus}</span>
                </div>
                
                <!-- Server Settings Section -->
                <div class="sidebar-section">
                  <div class="sidebar-section-content">
                    <div class="server-settings">
                      <div class="server-header" @click=${toggleConnectionDetails}>
                        <div>
                          <span>Server: ${this.showConnectionDetails ? '' : this.serverURI}</span>
                        </div>
                        <md-filled-button dense>
                          ${this.showConnectionDetails ? 'Hide Details' : 'Show Details'}
                        </md-filled-button>
                      </div>
                      
                      ${this.showConnectionDetails ? html`
                        <div class="server-details">
                          <md-filled-text-field
                            class="server-input"
                            .value=${this.newServerURI}
                            @input=${e => this.newServerURI = e.target.value}
                            label="Server URI"
                          ></md-filled-text-field>
                          <md-filled-button @click=${this.updateServerURI}>
                            Connect
                          </md-filled-button>
                        </div>
                        <div class="current-server">Current: ${this.serverURI}</div>
                      ` : ''}
                      
                      <div class="button-container">
                        <!-- Button section simplified -->
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
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
  
  async testConnection() {
    console.log('Connection test clicked');
    
    try {
      // Get platform info
      const platformInfo = await this.call['EditBlockCoder.get_platform_info']();
      console.log('Platform info:', platformInfo);
      
      // Get repository information
      const repoMap = await this.call['EditBlockCoder.get_repo_map']();
      console.log('Repository map:', repoMap);
      
      // Check for any pending announcements
      const announcements = await this.call['EditBlockCoder.get_announcements']();
      if (announcements && announcements.length > 0) {
        console.log('Announcements:', announcements);
      }
      
      alert('Connection successful! See console for details.');
    } catch (error) {
      console.error('Error connecting to Aider:', error);
      alert('Connection error: ' + error.message);
    }
  }
  
  async showServerInfo() {
    try {
      // Get files currently in chat context
      const chatFiles = await this.call['EditBlockCoder.get_inchat_relative_files']();
      
      // Get all repo files
      const allFiles = await this.call['EditBlockCoder.get_all_relative_files']();
      
      // Get repo map
      const repoMap = await this.call['EditBlockCoder.get_repo_map']();
      
      // Get platform info
      const platformInfo = await this.call['EditBlockCoder.get_platform_info']();
      
      const info = {
        'In-chat files': chatFiles,
        'Repository files': `${allFiles.length} files available`,
        'Repository root': repoMap.repo_root || 'Unknown',
        'Platform': platformInfo.os || 'Unknown',
        'User language': await this.call['EditBlockCoder.get_user_language']()
      };
      
      alert(JSON.stringify(info, null, 2));
      console.log('Server info:', info);
    } catch (error) {
      console.error('Error getting server info:', error);
      alert('Error: ' + error.message);
    }
  }

  /**
   * Update the server URI and reconnect by changing browser URL with port parameter
   * and forcing the page to reload
   */
  updateServerURI() {
    if (this.newServerURI && this.newServerURI !== this.serverURI) {
      // Extract port from the new server URI (format: ws://0.0.0.0:PORT)
      const portMatch = this.newServerURI.match(/:(\d+)$/);
      if (portMatch && portMatch[1]) {
        const port = portMatch[1];
        
        // Create a new URL based on the current location
        const url = new URL(window.location.href);
        
        // Set the port parameter
        url.searchParams.set('port', port);
        
        console.log(`Redirecting to: ${url.toString()}`);
        
        // Redirect to the new URL, forcing a page reload
        window.location.href = url.toString();
      } else {
        console.error('Invalid server URI format, expected ws://host:port');
        alert('Invalid server URI format. Expected: ws://host:port');
      }
    }
  }

  /**
   * Overloading JRPCCLient::serverChanged to print out the websocket address
   * and update child components with the new server URI
   */
  serverChanged() {
    this.connectionStatus = 'connecting';
    this.requestUpdate();
    
    console.log('Updating child components with server URI:', this.serverURI);
    
    // Update all components that need serverURI using the utility function
    Promise.all([
      updateChildComponents(this, 'prompt-view', 'serverURI', this.serverURI),
      updateChildComponents(this, 'file-tree', 'serverURI', this.serverURI),
      updateChildComponents(this, 'repo-tree', 'serverURI', this.serverURI),
      updateChildComponents(this, 'merge-editor', 'serverURI', this.serverURI),
      updateChildComponents(this, 'files-and-settings', 'serverURI', this.serverURI),
      updateChildComponents(this, 'find-in-files', 'serverURI', this.serverURI)
    ]).then(() => {
      console.log('All child components updated with server URI');
    });
    
    super.serverChanged();
  }

  
  /**
   * Called when connection is lost
   */
  /**
   * Schedule reconnection attempts that continue until connection is established
   */
  scheduleReconnect() {
    // Clear any existing timeout first
    if (this.reconnectTimeout) {
      console.log('Clearing existing reconnect timeout');
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    console.log(`Setting reconnect timeout for ${this.reconnectDelay}ms`);
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connectionStatus = 'connecting';
      this.requestUpdate();
      this.serverChanged();

      // Schedule another reconnection attempt for later
      // This ensures we keep trying until remoteIsUp is called
      this.reconnectTimeout = null;
      this.scheduleReconnect();
    }, this.reconnectDelay);
  }
  
  remoteIsDown() {
    console.log('MainWindow::remoteIsDown');
    this.connectionStatus = 'disconnected';
    this.requestUpdate();
    
    this.scheduleReconnect();
  }

  /**
   * Called when remote server is up
   */
  remoteIsUp() {
    console.log('MainWindow::remoteIsUp');
    
    // Add initialization that requires the server to be up
    this.addClass(this);
    
    // Update connection status
    this.connectionStatus = 'connected';
    
    // Don't automatically show the prompt view anymore
    this.requestUpdate();
    
    // Clear any reconnection timeout when connection is successful
    if (this.reconnectTimeout) {
      console.log('Clearing reconnect timeout as connection is established');
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Called when remote server disconnects
   */
  remoteDisconnected() {
    console.log('MainWindow::remoteDisconnected');
    this.connectionStatus = 'disconnected';
    this.requestUpdate();
    
    this.scheduleReconnect();
  }

  /**
   * LitElement lifecycle method - called when element is removed from DOM
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Remove keyboard shortcut listener when component is removed
    document.removeEventListener('keydown', this._handleKeyboardShortcuts.bind(this));
  }

  /**
   * Open the Aider prompt view
   */
  async openPromptView() {
    try {
      // Check if we can communicate with Aider
      const platformInfo = await this.call['EditBlockCoder.get_platform_info']();
      console.log('Platform info:', platformInfo);

      // Show the prompt view
      this.showPromptView = true;
      this.connectionStatus = 'connected';
      this.requestUpdate();
    } catch (error) {
      console.error('Error initializing Aider:', error);
      this.connectionStatus = 'disconnected';
      alert('Error connecting to Aider: ' + error.message);
      this.requestUpdate();
    }
  }
  
  _handleMouseDown(e) {
    // Only process left mouse button
    if (e.button !== 0) return;
    
    // Mark as resizing
    this.isResizing = true;
    this.initialX = e.clientX;
    this.initialWidth = this.sidebarWidth;
    
    // Add active class to handle
    e.currentTarget.classList.add('active');
    
    // Prevent text selection during resize
    e.preventDefault();
  }
  
  _handleMouseMove(e) {
    if (!this.isResizing) return;
    
    // Calculate new width
    const delta = e.clientX - this.initialX;
    // Get window width and limit to 1/3 of the window
    const maxWidth = Math.floor(window.innerWidth / 3);
    let newWidth = Math.max(180, Math.min(maxWidth, this.initialWidth + delta));
    
    // Update sidebar width
    this.sidebarWidth = newWidth;
    this.requestUpdate();
  }
  
  _handleMouseUp(e) {
    if (!this.isResizing) return;
    
    this.isResizing = false;
    
    // Remove active class from handle
    const handle = this.shadowRoot.querySelector('.resize-handle');
    if (handle) {
      handle.classList.remove('active');
    }
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
