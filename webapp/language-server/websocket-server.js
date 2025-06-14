// WebSocket server for webapp communication
const WebSocket = require('ws');
const { WS_PORT, SERVER_CAPABILITIES } = require('./constants');

class WebSocketServer {
  constructor(messageHandler) {
    this.messageHandler = messageHandler;
    this.wsServer = null;
    this.wsClients = new Set();
  }

  start() {
    this.wsServer = new WebSocket.Server({ port: WS_PORT });
    
    this.wsServer.on('connection', (ws) => {
      console.log('WebSocket client connected');
      this.wsClients.add(ws);
      
      // Handle incoming messages from webapp
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received message:', data.method || 'unknown method');
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.wsClients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.wsClients.delete(ws);
      });
      
      // Send initial connection confirmation
      this.sendConnectionConfirmation(ws);
    });
    
    console.log(`Language Server WebSocket listening on port ${WS_PORT}`);
  }

  handleMessage(ws, data) {
    this.messageHandler.handle(ws, data, this.wsClients);
  }

  sendConnectionConfirmation(ws) {
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      capabilities: SERVER_CAPABILITIES
    }));
  }
}

module.exports = WebSocketServer;
