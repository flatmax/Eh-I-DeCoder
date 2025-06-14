// Message handler for WebSocket requests
const CompletionHandler = require('./handlers/completion-handler');
const HoverHandler = require('./handlers/hover-handler');
const DefinitionHandler = require('./handlers/definition-handler');
const ReferencesHandler = require('./handlers/references-handler');
const DocumentHandler = require('./handlers/document-handler');

class MessageHandler {
  constructor(documentManager) {
    this.documentManager = documentManager;
    this.completionHandler = new CompletionHandler(documentManager);
    this.hoverHandler = new HoverHandler(documentManager);
    this.definitionHandler = new DefinitionHandler(documentManager);
    this.referencesHandler = new ReferencesHandler(documentManager);
    this.documentHandler = new DocumentHandler(documentManager);
  }

  handle(ws, data, wsClients) {
    const { id, method, params } = data;
    
    // Log the request details
    if (method) {
      console.log(`Processing ${method} request (id: ${id})`);
      if (params) {
        console.log('Request params:', JSON.stringify(params, null, 2));
      }
    }
    
    // Route to appropriate handler based on method
    switch (method) {
      case 'textDocument/completion':
        this.completionHandler.handle(ws, id, params);
        break;
      case 'textDocument/hover':
        this.hoverHandler.handle(ws, id, params);
        break;
      case 'textDocument/definition':
        this.definitionHandler.handle(ws, id, params);
        break;
      case 'textDocument/references':
        this.referencesHandler.handle(ws, id, params);
        break;
      case 'textDocument/didOpen':
        this.documentHandler.handleDidOpen(params, wsClients);
        this.sendResponse(ws, id, null);
        break;
      case 'textDocument/didChange':
        this.documentHandler.handleDidChange(params, wsClients);
        this.sendResponse(ws, id, null);
        break;
      case 'textDocument/didClose':
        this.documentHandler.handleDidClose(params);
        this.sendResponse(ws, id, null);
        break;
      default:
        console.log(`Unknown method: ${method}`);
        this.sendError(ws, id, -32601, 'Method not found');
    }
  }

  sendResponse(ws, id, result) {
    const response = { id, result };
    console.log(`Sending response for request ${id}:`, JSON.stringify(result, null, 2));
    ws.send(JSON.stringify(response));
  }

  sendError(ws, id, code, message) {
    const error = {
      id,
      error: { code, message }
    };
    console.log(`Sending error for request ${id}:`, message);
    ws.send(JSON.stringify(error));
  }
}

module.exports = MessageHandler;
