import { extractResponseData } from '../Utils.js';

export class LanguageClient {
  constructor() {
    this.ws = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.documentVersions = new Map();
    this.capabilities = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  async connect(uri = 'ws://localhost:8998') {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(uri);
        
        this.ws.onopen = () => {
          console.log('Language client connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing language server message:', error);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('Language client error:', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('Language client disconnected');
          this.connected = false;
          this.handleDisconnect();
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  handleDisconnect() {
    // Clear pending requests
    this.pendingRequests.forEach((handler, id) => {
      handler.reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();
    
    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  handleMessage(message) {
    // Handle responses to requests
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const handler = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);
      
      if (message.error) {
        handler.reject(new Error(message.error.message));
      } else {
        handler.resolve(message.result);
      }
      return;
    }
    
    // Handle server-initiated messages
    if (message.type === 'connection' && message.status === 'connected') {
      this.capabilities = message.capabilities;
      console.log('Language server capabilities:', this.capabilities);
    } else if (message.method === 'textDocument/publishDiagnostics') {
      this.handleDiagnostics(message.params);
    }
  }

  sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Language client not connected'));
        return;
      }
      
      const id = this.requestId++;
      this.pendingRequests.set(id, { resolve, reject });
      
      const message = {
        id,
        method,
        params
      };
      
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }

  // Document synchronization methods
  async didOpen(uri, languageId, version, text) {
    this.documentVersions.set(uri, version);
    return this.sendRequest('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version,
        text
      }
    });
  }

  async didChange(uri, version, contentChanges) {
    this.documentVersions.set(uri, version);
    return this.sendRequest('textDocument/didChange', {
      textDocument: {
        uri,
        version
      },
      contentChanges
    });
  }

  async didClose(uri) {
    this.documentVersions.delete(uri);
    return this.sendRequest('textDocument/didClose', {
      textDocument: { uri }
    });
  }

  // Language features
  async completion(uri, position) {
    return this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position
    });
  }

  async hover(uri, position) {
    return this.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position
    });
  }

  async definition(uri, position) {
    return this.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position
    });
  }

  async references(uri, position, includeDeclaration = true) {
    return this.sendRequest('textDocument/references', {
      textDocument: { uri },
      position,
      context: { includeDeclaration }
    });
  }

  // Diagnostics handler
  handleDiagnostics(params) {
    // Emit custom event that components can listen to
    window.dispatchEvent(new CustomEvent('language-diagnostics', {
      detail: params
    }));
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.pendingRequests.clear();
    this.documentVersions.clear();
  }
}

// Singleton instance
export const languageClient = new LanguageClient();
