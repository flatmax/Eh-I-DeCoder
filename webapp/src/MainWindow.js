/**
 * MainWindow class that extends JRPCClient
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import '@material/web/button/filled-button.js';
import '@material/web/textfield/filled-text-field.js';

export class MainWindow extends JRPCClient {
  constructor() {
    super();
    this.remoteTimeout = 300;
    this.debug = false;
    this.showPromptView = false;
    this.serverURI = "ws://0.0.0.0:9000";
    this.newServerURI = "ws://0.0.0.0:9000";
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
    }
    .server-settings {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-bottom: 15px;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: #f9f9f9;
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
          <md-filled-text-field
            class="server-input"
            .value=${this.newServerURI}
            @input=${e => this.newServerURI = e.target.value}
            label="Server URI"
          ></md-filled-text-field>
          <md-filled-button @click=${this.updateServerURI}>
            Connect
          </md-filled-button>
          <div class="current-server">Current: ${this.serverURI}</div>
        </div>
        
        <div class="button-container">
          <md-filled-button @click=${this.testConnection}>
            Test Connection
          </md-filled-button>
          
          <md-filled-button @click=${this.showServerInfo}>
            Show Server Info
          </md-filled-button>
        </div>
        
        ${this.showPromptView ? html`<prompt-view></prompt-view>` : ''}
      </div>
    `;
  }
  
  testConnection() {
    console.log('Connection test clicked');
    
    // Example API call when server endpoint is available
    if (this.server && this.server.Aider) {
      console.log('Aider is available');
    }
  }
  
  showServerInfo() {
    console.log('Server info:', this.server);
  }

  /**
   * Update the server URI and reconnect
   */
  updateServerURI() {
    if (this.newServerURI && this.newServerURI !== this.serverURI) {
      this.serverURI = this.newServerURI;
      console.log(`Connecting to server at: ${this.serverURI}`);
      this.showPromptView = false;
      this.requestUpdate();
      
      // Establish new connection
      this.connect();
    }
  }

  /**
   * Overloading JRPCCLient::serverChanged to print out the websocket address
   */
  serverChanged() {
    console.log('Make sure ws url = ' + this.serverURI + ' has browser security clearance');
    console.log('to do this, goto ' + this.serverURI.replace('wss', 'https') + 
      ' in a new browser tab replacing the wss for https\n do this each time the local cert changes or times out');
    
    super.serverChanged();
  }

  /**
   * Called when remote server is up
   */
  remoteIsUp() {
    console.log('MainWindow::remoteIsUp');
    
    // Add initialization that requires the server to be up
    this.addClass(this);
    
    // Show prompt view now that server is up
    this.showPromptView = true;
    // this.requestUpdate();
  }
}
