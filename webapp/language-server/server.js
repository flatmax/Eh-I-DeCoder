// Language Server implementation using WebSocket
const WebSocket = require('ws');
const { TextDocument } = require('vscode-languageserver-textdocument');

// WebSocket server for webapp communication
let wsServer = null;
let wsClients = new Set();

// Document storage
const documents = new Map();
const documentVersions = new Map();

// Server capabilities
const serverCapabilities = {
  textDocumentSync: 1, // Full sync
  completionProvider: {
    resolveProvider: true,
    triggerCharacters: ['.', '(', '"', "'", '{', '[']
  },
  hoverProvider: true,
  definitionProvider: true,
  referencesProvider: true,
  documentSymbolProvider: true,
  workspaceSymbolProvider: true,
  codeActionProvider: true,
  codeLensProvider: {
    resolveProvider: true
  },
  documentFormattingProvider: true,
  documentRangeFormattingProvider: true,
  renameProvider: true,
  foldingRangeProvider: true
};

// Completion item kinds
const CompletionItemKind = {
  Text: 1,
  Method: 2,
  Function: 3,
  Constructor: 4,
  Field: 5,
  Variable: 6,
  Class: 7,
  Interface: 8,
  Module: 9,
  Property: 10,
  Unit: 11,
  Value: 12,
  Enum: 13,
  Keyword: 14,
  Snippet: 15,
  Color: 16,
  File: 17,
  Reference: 18
};

// Diagnostic severity
const DiagnosticSeverity = {
  Error: 1,
  Warning: 2,
  Information: 3,
  Hint: 4
};

// Start WebSocket server for webapp communication
function startWebSocketServer() {
  const WS_PORT = 8998; // Different port from your main JRPC server
  
  wsServer = new WebSocket.Server({ port: WS_PORT });
  
  wsServer.on('connection', (ws) => {
    console.log('WebSocket client connected');
    wsClients.add(ws);
    
    // Handle incoming messages from webapp
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleWebSocketMessage(ws, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      wsClients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    });
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      capabilities: serverCapabilities
    }));
  });
  
  console.log(`Language Server WebSocket listening on port ${WS_PORT}`);
}

// Handle WebSocket messages from webapp
function handleWebSocketMessage(ws, data) {
  const { id, method, params } = data;
  
  // Route to appropriate handler based on method
  switch (method) {
    case 'textDocument/completion':
      handleCompletionRequest(ws, id, params);
      break;
    case 'textDocument/hover':
      handleHoverRequest(ws, id, params);
      break;
    case 'textDocument/definition':
      handleDefinitionRequest(ws, id, params);
      break;
    case 'textDocument/references':
      handleReferencesRequest(ws, id, params);
      break;
    case 'textDocument/didOpen':
      handleDidOpenTextDocument(params);
      sendResponse(ws, id, null);
      break;
    case 'textDocument/didChange':
      handleDidChangeTextDocument(params);
      sendResponse(ws, id, null);
      break;
    case 'textDocument/didClose':
      handleDidCloseTextDocument(params);
      sendResponse(ws, id, null);
      break;
    default:
      sendError(ws, id, -32601, 'Method not found');
  }
}

// Send response to client
function sendResponse(ws, id, result) {
  ws.send(JSON.stringify({ id, result }));
}

// Send error to client
function sendError(ws, id, code, message) {
  ws.send(JSON.stringify({
    id,
    error: { code, message }
  }));
}

// Handle completion request from webapp
function handleCompletionRequest(ws, id, params) {
  const { textDocument, position } = params;
  const doc = documents.get(textDocument.uri);
  
  if (!doc) {
    sendResponse(ws, id, []);
    return;
  }
  
  // Get the text before the cursor
  const text = doc.getText();
  const offset = doc.offsetAt(position);
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineText = text.substring(lineStart, offset);
  
  // Basic completions based on context
  const completions = [];
  
  // If typing after a dot, suggest properties/methods
  if (lineText.endsWith('.')) {
    completions.push(
      {
        label: 'log',
        kind: CompletionItemKind.Method,
        detail: 'log(message)',
        documentation: 'Outputs a message to the console'
      },
      {
        label: 'error',
        kind: CompletionItemKind.Method,
        detail: 'error(message)',
        documentation: 'Outputs an error message to the console'
      },
      {
        label: 'warn',
        kind: CompletionItemKind.Method,
        detail: 'warn(message)',
        documentation: 'Outputs a warning message to the console'
      }
    );
  } else {
    // General completions
    completions.push(
      {
        label: 'console',
        kind: CompletionItemKind.Module,
        detail: 'Console module',
        documentation: 'Provides access to the console'
      },
      {
        label: 'function',
        kind: CompletionItemKind.Keyword,
        detail: 'function keyword',
        documentation: 'Declares a function'
      },
      {
        label: 'const',
        kind: CompletionItemKind.Keyword,
        detail: 'const keyword',
        documentation: 'Declares a constant'
      },
      {
        label: 'let',
        kind: CompletionItemKind.Keyword,
        detail: 'let keyword',
        documentation: 'Declares a block-scoped variable'
      }
    );
  }
  
  sendResponse(ws, id, completions);
}

// Handle hover request from webapp
function handleHoverRequest(ws, id, params) {
  const { textDocument, position } = params;
  const doc = documents.get(textDocument.uri);
  
  if (!doc) {
    sendResponse(ws, id, null);
    return;
  }
  
  // Get word at position
  const text = doc.getText();
  const offset = doc.offsetAt(position);
  
  // Find word boundaries
  let start = offset;
  let end = offset;
  while (start > 0 && /\w/.test(text[start - 1])) start--;
  while (end < text.length && /\w/.test(text[end])) end++;
  
  const word = text.substring(start, end);
  
  // Provide hover info based on word
  let hoverInfo = null;
  
  if (word === 'console') {
    hoverInfo = {
      contents: {
        kind: 'markdown',
        value: '**console**\n\nThe console object provides access to the browser\'s debugging console.'
      }
    };
  } else if (word === 'function') {
    hoverInfo = {
      contents: {
        kind: 'markdown',
        value: '**function**\n\nDeclares a function with the specified parameters.'
      }
    };
  }
  
  sendResponse(ws, id, hoverInfo);
}

// Handle definition request from webapp
function handleDefinitionRequest(ws, id, params) {
  // For now, return null (no definition found)
  // In a real implementation, this would analyze the code and find definitions
  sendResponse(ws, id, null);
}

// Handle references request from webapp
function handleReferencesRequest(ws, id, params) {
  // For now, return empty array (no references found)
  // In a real implementation, this would find all references to a symbol
  sendResponse(ws, id, []);
}

// Handle text document events
function handleDidOpenTextDocument(params) {
  const { textDocument } = params;
  const doc = TextDocument.create(
    textDocument.uri,
    textDocument.languageId,
    textDocument.version,
    textDocument.text
  );
  
  documents.set(textDocument.uri, doc);
  documentVersions.set(textDocument.uri, textDocument.version);
  
  console.log(`Document opened: ${textDocument.uri}`);
  
  // Validate the document
  validateTextDocument(textDocument.uri);
}

function handleDidChangeTextDocument(params) {
  const { textDocument, contentChanges } = params;
  const doc = documents.get(textDocument.uri);
  
  if (!doc) {
    console.error(`Document not found: ${textDocument.uri}`);
    return;
  }
  
  // Apply changes
  const updatedDoc = TextDocument.update(doc, contentChanges, textDocument.version);
  documents.set(textDocument.uri, updatedDoc);
  documentVersions.set(textDocument.uri, textDocument.version);
  
  console.log(`Document changed: ${textDocument.uri}`);
  
  // Validate the document
  validateTextDocument(textDocument.uri);
}

function handleDidCloseTextDocument(params) {
  const { textDocument } = params;
  documents.delete(textDocument.uri);
  documentVersions.delete(textDocument.uri);
  
  console.log(`Document closed: ${textDocument.uri}`);
}

// Validate text document and send diagnostics
function validateTextDocument(uri) {
  const doc = documents.get(uri);
  if (!doc) return;
  
  const text = doc.getText();
  const diagnostics = [];
  
  // Find TODO, FIXME, HACK comments
  const pattern = /\b(TODO|FIXME|HACK)\b(.*)$/gm;
  let match;
  
  while ((match = pattern.exec(text)) !== null) {
    const startPos = doc.positionAt(match.index);
    const endPos = doc.positionAt(match.index + match[0].length);
    
    diagnostics.push({
      severity: DiagnosticSeverity.Warning,
      range: {
        start: startPos,
        end: endPos
      },
      message: `${match[1]} comment found: ${match[2].trim()}`,
      source: 'language-server'
    });
  }
  
  // Find potential issues
  const issuePattern = /console\.(log|error|warn|info|debug)\(/g;
  while ((match = issuePattern.exec(text)) !== null) {
    const startPos = doc.positionAt(match.index);
    const endPos = doc.positionAt(match.index + match[0].length);
    
    diagnostics.push({
      severity: DiagnosticSeverity.Information,
      range: {
        start: startPos,
        end: endPos
      },
      message: 'Console statement found - consider removing for production',
      source: 'language-server'
    });
  }
  
  // Send diagnostics to all clients
  broadcastToWebSocketClients({
    method: 'textDocument/publishDiagnostics',
    params: {
      uri,
      diagnostics
    }
  });
}

// Broadcast message to all connected WebSocket clients
function broadcastToWebSocketClients(message) {
  const messageStr = JSON.stringify(message);
  wsClients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

// Start the server
console.log('Starting Language Server...');
startWebSocketServer();

// Handle server shutdown
process.on('SIGTERM', () => {
  console.log('Language server shutting down...');
  if (wsServer) {
    wsServer.close();
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nLanguage server shutting down...');
  if (wsServer) {
    wsServer.close();
  }
  process.exit(0);
});
