/**
 * MainWindow class that extends JRPCClient
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import '@material/web/button/filled-button.js';
import '@material/web/textfield/filled-text-field.js';
import './Commands.js';

export class MainWindow extends JRPCClient {
  constructor() {
    super();
    this.remoteTimeout = 300;
    this.debug = false;
    this.showPromptView = true;
    this.showCommands = true; // Show commands by default
    this.serverURI = "ws://0.0.0.0:9000";
    this.newServerURI = "ws://0.0.0.0:9000";
    this.connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected'
    this.showConnectionDetails = false;
    this.reconnectTimeout = null; // Timeout for reconnection attempts
    this.reconnectDelay = 1000; // Reconnect after 1 second
    this.scheduleReconnect();
  }
  
  static styles = css`
    :host {
      display: block;
      font-family: sans-serif;
    }
    .container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px;
    }
    .button-container {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .server-settings {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 15px;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: #f9f9f9;
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
  }
  
  /**
   * Toggle connection details visibility
   */
  toggleConnectionDetails() {
    this.showConnectionDetails = !this.showConnectionDetails;
    this.requestUpdate();
  }
  
  /**
   * LitElement render method
   */
  render() {
    return html`
      <div class="container">
        <h2>Aider AI Assistant</h2>
        
        <div class="server-settings">
          <div class="server-header" @click=${this.toggleConnectionDetails}>
            <div>
              <span class="connection-led led-${this.connectionStatus}"></span>
              Server: ${this.showConnectionDetails ? '' : this.serverURI}
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
        </div>
        
        <div class="button-container">
          <md-filled-button @click=${this.testConnection}>
            Test Connection
          </md-filled-button>
          
          <md-filled-button @click=${this.showServerInfo}>
            Show Server Info
          </md-filled-button>
          
          <md-filled-button @click=${this.openPromptView}>
            Open Aider Chat
          </md-filled-button>
          
          <md-filled-button @click=${() => { this.showCommands = !this.showCommands; this.requestUpdate(); }}>
            ${this.showCommands ? 'Hide Commands' : 'Show Commands'}
          </md-filled-button>
        </div>
        
        ${this.showCommands && this.connectionStatus === 'connected' ? 
          html`<aider-commands .serverURI=${this.serverURI}></aider-commands>` : ''}
        
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
   * Update the server URI and reconnect
   */
  updateServerURI() {
    if (this.newServerURI && this.newServerURI !== this.serverURI) {
      this.serverURI = this.newServerURI;
      console.log(`Connecting to server at: ${this.serverURI}`);
      this.showPromptView = false;
      this.connectionStatus = 'connecting';
      this.requestUpdate();
    }
  }

  /**
   * Overloading JRPCCLient::serverChanged to print out the websocket address
   * and update child components with the new server URI
   */
  serverChanged() {
    this.connectionStatus = 'connecting';
    this.requestUpdate();
    
    // Wait for the DOM update to complete before accessing child components
    this.updateComplete.then(() => {
      // Find child components and update their server URIs
      const promptView = this.shadowRoot.querySelector('prompt-view');
      const commandsView = this.shadowRoot.querySelector('aider-commands');
      
      if (promptView && promptView.serverURI !== this.serverURI) {
        console.log('Updating PromptView server URI to:', this.serverURI);
        promptView.serverURI = this.serverURI;
      }
      
      if (commandsView && commandsView.serverURI !== this.serverURI) {
        console.log('Updating Commands server URI to:', this.serverURI);
        commandsView.serverURI = this.serverURI;
      }
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
}
