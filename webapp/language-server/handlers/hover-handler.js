// Hover request handler
const BaseHandler = require('./base-handler');

class HoverHandler extends BaseHandler {
  handle(ws, id, params) {
    const { textDocument, position } = params;
    const doc = this.documentManager.getDocument(textDocument.uri);
    
    if (!doc) {
      this.sendResponse(ws, id, null);
      return;
    }
    
    const { word } = this.getWordAtPosition(doc, position);
    
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
    
    this.sendResponse(ws, id, hoverInfo);
  }
}

module.exports = HoverHandler;
