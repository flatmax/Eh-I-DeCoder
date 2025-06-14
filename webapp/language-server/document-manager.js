// Document management for the language server
const { TextDocument } = require('vscode-languageserver-textdocument');
const DocumentValidator = require('./document-validator');

class DocumentManager {
  constructor() {
    this.documents = new Map();
    this.documentVersions = new Map();
    this.validator = new DocumentValidator();
  }

  getDocument(uri) {
    return this.documents.get(uri);
  }

  openDocument(textDocument) {
    const doc = TextDocument.create(
      textDocument.uri,
      textDocument.languageId,
      textDocument.version,
      textDocument.text
    );
    
    this.documents.set(textDocument.uri, doc);
    this.documentVersions.set(textDocument.uri, textDocument.version);
    
    console.log(`Document opened: ${textDocument.uri}`);
    return doc;
  }

  updateDocument(textDocument, contentChanges) {
    const doc = this.documents.get(textDocument.uri);
    
    if (!doc) {
      console.error(`Document not found: ${textDocument.uri}`);
      return null;
    }
    
    // Apply changes
    const updatedDoc = TextDocument.update(doc, contentChanges, textDocument.version);
    this.documents.set(textDocument.uri, updatedDoc);
    this.documentVersions.set(textDocument.uri, textDocument.version);
    
    console.log(`Document changed: ${textDocument.uri}, version: ${textDocument.version}`);
    return updatedDoc;
  }

  closeDocument(textDocument) {
    this.documents.delete(textDocument.uri);
    this.documentVersions.delete(textDocument.uri);
    
    console.log(`Document closed: ${textDocument.uri}`);
  }

  validateDocument(uri, wsClients) {
    return this.validator.validate(uri, this.documents.get(uri), wsClients);
  }
}

module.exports = DocumentManager;
