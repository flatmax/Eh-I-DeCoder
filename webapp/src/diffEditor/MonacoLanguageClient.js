import { extractResponseData } from '../Utils.js';
import { LSPProviders } from './LSPProviders.js';
import { LSPDocumentSync } from './LSPDocumentSync.js';
import { LSPTypeConverters } from './LSPTypeConverters.js';

export class MonacoLanguageClient {
  constructor(options) {
    this.jrpcClient = options.jrpcClient;
    this.rootUri = options.rootUri;
    this.serverCapabilities = options.serverCapabilities;
    this.languageIdMap = options.languageIdMap || {};
    this.initialized = true; // Already initialized by parent
    this.debugMode = true; // Enable debug logging
    
    // Initialize sub-components
    this.typeConverters = new LSPTypeConverters();
    this.documentSync = new LSPDocumentSync(this);
    this.providers = new LSPProviders(this);
  }

  async start() {
    this.log('Starting Monaco Language Client');
    this.log('Server capabilities:', this.serverCapabilities);
    
    // Register Monaco providers
    this.providers.registerAll();
    
    this.emitStatusChange(true);
  }

  emitStatusChange(connected) {
    document.dispatchEvent(new CustomEvent('lsp-status-change', {
      detail: { connected },
      bubbles: true,
      composed: true
    }));
  }

  // Logging helper
  log(...args) {
    if (this.debugMode) {
      console.log('[MonacoLanguageClient]', ...args);
    }
  }

  // LSP Request handlers
  async sendRequest(method, params) {
    this.log(`Sending LSP request: ${method}`, params);
    
    try {
      const response = await this.jrpcClient.call[`LSPWrapper.${method.replace('textDocument/', '').replace('/', '_')}`](params);
      const result = extractResponseData(response);
      
      this.log(`Received response for ${method}:`, result);
      return result;
    } catch (error) {
      console.error(`LSP request failed for ${method}:`, error);
      this.log(`Error details:`, { method, params, error });
      return null;
    }
  }

  // Document synchronization methods (delegated)
  async didOpen(uri, languageId, version, content) {
    return this.documentSync.didOpen(uri, languageId, version, content);
  }

  async didChange(uri, version, changes) {
    return this.documentSync.didChange(uri, version, changes);
  }

  async didClose(uri) {
    return this.documentSync.didClose(uri);
  }

  async didSave(uri, content) {
    return this.documentSync.didSave(uri, content);
  }

  // Type conversion methods (delegated)
  convertRange(lspRange) {
    return this.typeConverters.convertRange(lspRange);
  }

  convertCompletionItemKind(kind) {
    return this.typeConverters.convertCompletionItemKind(kind);
  }

  convertDocumentSymbol(symbol) {
    return this.typeConverters.convertDocumentSymbol(symbol);
  }

  convertSymbolKind(kind) {
    return this.typeConverters.convertSymbolKind(kind);
  }

  convertWorkspaceEdit(edit) {
    return this.typeConverters.convertWorkspaceEdit(edit);
  }

  dispose() {
    this.log('Disposing Monaco Language Client');
    this.providers.dispose();
    this.documentSync.dispose();
  }
}
