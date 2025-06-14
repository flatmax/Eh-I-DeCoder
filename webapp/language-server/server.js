// Main Language Server entry point
const WebSocketServer = require('./websocket-server');
const DocumentManager = require('./document-manager');
const MessageHandler = require('./message-handler');

// Start the language server
function startLanguageServer() {
  const documentManager = new DocumentManager();
  const messageHandler = new MessageHandler(documentManager);
  const wsServer = new WebSocketServer(messageHandler);
  
  wsServer.start();
  console.log('Language Server started successfully');
}

// Start the server
startLanguageServer();
