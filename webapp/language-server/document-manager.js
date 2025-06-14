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

  // Expose documents for cross-document search
  getAllDocuments() {
    return this.documents;
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
    console.log(`Total documents now: ${this.documents.size}`);
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
    console.log(`Total documents now: ${this.documents.size}`);
  }

  analyzeDocumentSymbols(uri, text, languageId) {
    try {
      // Determine the actual language to use for analysis
      const analysisLanguage = this.getAnalysisLanguage(uri, languageId);
      
      if (this.shouldAnalyzeLanguage(analysisLanguage)) {
        const symbols = this.symbolAnalyzer.analyzeDocument(uri, text, analysisLanguage);
        console.log(`Symbol analysis complete for ${uri}: ${symbols.length} symbols found`);
        
        // Log some symbol names for debugging
        if (symbols.length > 0) {
          const symbolNames = symbols.slice(0, 5).map(s => s.name).join(', ');
          console.log(`Sample symbols: ${symbolNames}${symbols.length > 5 ? '...' : ''}`);
        }
      } else {
        console.log(`Skipping symbol analysis for ${uri} (language: ${languageId})`);
      }
    } catch (error) {
      console.error(`Error analyzing symbols for ${uri}:`, error);
    }
  }

  getAnalysisLanguage(uri, languageId) {
    // If no language ID provided, try to determine from file extension
    if (!languageId) {
      const filename = uri.split('/').pop() || '';
      const parserManager = this.symbolAnalyzer.getParserManager();
      languageId = parserManager.getLanguageFromExtension(filename);
    }
    
    // Check if the language is supported
    const parserManager = this.symbolAnalyzer.getParserManager();
    if (parserManager.isLanguageSupported(languageId)) {
      return languageId;
    }
    
    // Try to find a fallback language
    const fallback = parserManager.getFallbackLanguage(languageId);
    if (fallback) {
      console.log(`Using fallback language ${fallback} for ${languageId}`);
      return fallback;
    }
    
    return languageId;
  }

  shouldAnalyzeLanguage(languageId) {
    // Get list of supported languages from the symbol analyzer
    const parserManager = this.symbolAnalyzer.getParserManager();
    const supportedLanguages = parserManager.getSupportedLanguages();
    
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

  // Search for symbol across all open documents
  findSymbolInAllDocuments(name) {
    console.log(`Searching for symbol "${name}" across ${this.documents.size} documents`);
    
    for (const [uri, doc] of this.documents) {
      const symbols = this.symbolAnalyzer.getSymbolsInDocument(uri);
      const found = symbols.find(symbol => symbol.name === name);
      if (found) {
        console.log(`Found symbol "${name}" in ${uri}`);
        return { symbol: found, uri };
      }
    }
    
    console.log(`Symbol "${name}" not found in any open document`);
    return null;
  }

  // Get document statistics
  getDocumentStats() {
    const stats = {
      totalDocuments: this.documents.size,
      documentsByLanguage: {},
      totalSymbols: 0
    };
    
    for (const [uri, doc] of this.documents) {
      const languageId = doc.languageId;
      stats.documentsByLanguage[languageId] = (stats.documentsByLanguage[languageId] || 0) + 1;
      
      const symbols = this.getDocumentSymbols(uri);
      stats.totalSymbols += symbols.length;
    }
    
    return stats;
  }

  // Get all documents of a specific language
  getDocumentsByLanguage(languageId) {
    const documents = [];
    for (const [uri, doc] of this.documents) {
      if (doc.languageId === languageId) {
        documents.push({ uri, doc });
      }
    }
    return documents;
  }

  // Check if a document is currently open
  isDocumentOpen(uri) {
    return this.documents.has(uri);
  }

  // Get document version
  getDocumentVersion(uri) {
    return this.documentVersions.get(uri);
  }
}

module.exports = DocumentManager;
