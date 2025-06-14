// Enhanced document management with symbol analysis
const { TextDocument } = require('vscode-languageserver-textdocument');
const DocumentValidator = require('./document-validator');
const SymbolAnalyzer = require('./symbol-analyzer');

class DocumentManager {
  constructor() {
    this.documents = new Map();
    this.documentVersions = new Map();
    this.validator = new DocumentValidator();
    this.symbolAnalyzer = new SymbolAnalyzer();
  }

  getDocument(uri) {
    return this.documents.get(uri);
  }

  getSymbolAnalyzer() {
    return this.symbolAnalyzer;
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
    
    // Analyze symbols in the document
    this.analyzeDocumentSymbols(textDocument.uri, textDocument.text, textDocument.languageId);
    
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
    
    // Re-analyze symbols with updated content
    this.analyzeDocumentSymbols(textDocument.uri, updatedDoc.getText(), updatedDoc.languageId);
    
    console.log(`Document changed: ${textDocument.uri}, version: ${textDocument.version}`);
    return updatedDoc;
  }

  closeDocument(textDocument) {
    this.documents.delete(textDocument.uri);
    this.documentVersions.delete(textDocument.uri);
    
    // Clear symbol analysis for this document
    this.symbolAnalyzer.clearDocument(textDocument.uri);
    
    console.log(`Document closed: ${textDocument.uri}`);
  }

  analyzeDocumentSymbols(uri, text, languageId) {
    try {
      // Only analyze JavaScript/TypeScript files
      if (this.shouldAnalyzeLanguage(languageId)) {
        const symbols = this.symbolAnalyzer.analyzeDocument(uri, text, languageId);
        console.log(`Symbol analysis complete for ${uri}: ${symbols.length} symbols found`);
      }
    } catch (error) {
      console.error(`Error analyzing symbols for ${uri}:`, error);
    }
  }

  shouldAnalyzeLanguage(languageId) {
    const supportedLanguages = [
      'javascript',
      'javascriptreact',
      'typescript',
      'typescriptreact'
    ];
    return supportedLanguages.includes(languageId);
  }

  validateDocument(uri, wsClients) {
    return this.validator.validate(uri, this.documents.get(uri), wsClients);
  }

  // Get all symbols in a document
  getDocumentSymbols(uri) {
    return this.symbolAnalyzer.getSymbolsInDocument(uri);
  }

  // Find symbol by name across all documents
  findSymbol(name, preferredUri = null) {
    return this.symbolAnalyzer.findSymbol(name, preferredUri);
  }
}

module.exports = DocumentManager;
