import {extractResponseData} from '../Utils.js';

export const ConnectionMixin = (superClass) => class extends superClass {
  static properties = {
    ...superClass.properties,
    connectionStatus: { type: String, state: true },
    serverURI: { type: String },
    newServerURI: { type: String, state: true },
    repoName: { type: String, state: true }
  };

  constructor() {
    super();
    this.connectionStatus = 'disconnected';
    this.reconnectTimeout = null;
    this.reconnectDelay = 1000;
    
    // Check if port is specified in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const port = urlParams.get('port');
    
    // Set server URI based on URL parameter or default to 8999
    const serverPort = port || '8999';
    this.serverURI = `ws://0.0.0.0:${serverPort}`;
    this.newServerURI = this.serverURI;
    this.repoName = null;
  }

  /**
   * Called when server is ready to use
   */
  setupDone() {
    console.log('Connection setupDone: Server ready');
    this.connectionStatus = 'connected';
    this.requestUpdate();
    this.loadRepoName();
  }

  /**
   * Load repository name and set browser tab title
   */
  async loadRepoName() {
    try {
      console.log('Loading repository name...');
      const response = await this.call['Repo.get_repo_name']();
      
      const repoName = extractResponseData(response);
      
      if (repoName && !repoName.error) {
        this.repoName = repoName;
        this.updateBrowserTitle();
        console.log(`Repository name loaded: ${repoName}`);
      } else {
        console.log('Could not load repository name:', response);
        this.updateBrowserTitle();
      }
    } catch (error) {
      console.error('Error loading repository name:', error);
      this.updateBrowserTitle();
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
   * Update the server URI and reconnect
   */
  updateServerURI() {
    if (this.newServerURI && this.newServerURI !== this.serverURI) {
      const portMatch = this.newServerURI.match(/:(\d+)$/);
      if (portMatch && portMatch[1]) {
        const port = portMatch[1];
        const url = new URL(window.location.href);
        url.searchParams.set('port', port);
        console.log(`Redirecting to: ${url.toString()}`);
        window.location.href = url.toString();
      } else {
        console.error('Invalid server URI format, expected ws://host:port');
        alert('Invalid server URI format. Expected: ws://host:port');
      }
    }
  }

  /**
   * Schedule reconnection attempts
   */
  scheduleReconnect() {
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
      this.reconnectTimeout = null;
      this.scheduleReconnect();
    }, this.reconnectDelay);
  }

  remoteIsDown() {
    console.log('Connection::remoteIsDown');
    this.connectionStatus = 'disconnected';
    this.requestUpdate();
    this.scheduleReconnect();
  }

  remoteIsUp() {
    console.log('Connection::remoteIsUp');
    this.addClass(this);
    this.connectionStatus = 'connected';
    this.requestUpdate();
    
    if (this.reconnectTimeout) {
      console.log('Clearing reconnect timeout as connection is established');
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  remoteDisconnected() {
    console.log('Connection::remoteDisconnected');
    this.connectionStatus = 'disconnected';
    this.requestUpdate();
    this.scheduleReconnect();
  }
};
