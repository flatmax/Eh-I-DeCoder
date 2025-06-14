// Document lifecycle event handler
const BaseHandler = require('./base-handler');

class DocumentHandler extends BaseHandler {
  handleDidOpen(params, wsClients) {
    const { textDocument } = params;
    const doc = this.documentManager.openDocument(textDocument);
    
    // Validate the document
    this.documentManager.validateDocument(textDocument.uri, wsClients);
  }

  handleDidChange(params, wsClients) {
    const { textDocument, contentChanges } = params;
    const doc = this.documentManager.updateDocument(textDocument, contentChanges);
    
    if (doc) {
      // Validate the document
      this.documentManager.validateDocument(textDocument.uri, wsClients);
    }
  }

  handleDidClose(params) {
    const { textDocument } = params;
    this.documentManager.closeDocument(textDocument);
  }
}

module.exports = DocumentHandler;
