// Enhanced definition request handler with symbol analysis
const BaseHandler = require('./base-handler');

class DefinitionHandler extends BaseHandler {
  handle(ws, id, params) {
    const { textDocument, position } = params;
    const doc = this.documentManager.getDocument(textDocument.uri);
    
    console.log(`Looking for definition at ${textDocument.uri}, line ${position.line + 1}, char ${position.character}`);
    
    if (!doc) {
      console.log('Document not found in language server');
      this.sendResponse(ws, id, null);
      return;
    }
    
    const { word } = this.getWordAtPosition(doc, position);
    console.log(`Word at cursor: "${word}"`);
    
    const definition = this.findDefinition(word, textDocument, doc);
    this.sendResponse(ws, id, definition);
  }

  findDefinition(word, textDocument, doc) {
    // First try to find definition using symbol analysis
    const symbolDefinition = this.findSymbolDefinition(word, textDocument.uri);
    if (symbolDefinition) {
      console.log(`Found symbol definition for ${word}:`, symbolDefinition);
      return symbolDefinition;
    }

    // Check for known external definitions
    const externalDefinition = this.findExternalDefinition(word);
    if (externalDefinition) {
      console.log(`Found external definition for ${word}:`, externalDefinition);
      return externalDefinition;
    }

    // Check for local definitions in the same file (fallback)
    const localDefinition = this.findLocalDefinition(word, textDocument, doc);
    if (localDefinition) {
      console.log(`Found local definition for ${word}:`, localDefinition);
      return localDefinition;
    }

    // No definition found
    console.log(`No definition found for ${word}`);
    return null;
  }

  findSymbolDefinition(word, uri) {
    const symbolAnalyzer = this.documentManager.getSymbolAnalyzer();
    const symbol = symbolAnalyzer.findSymbol(word, uri);
    
    if (!symbol || !symbol.location) return null;
    
    // Convert symbol location to LSP definition format
    return {
      uri: symbol.uri || uri,
      range: {
        start: this.offsetToPosition(symbol.location.start),
        end: this.offsetToPosition(symbol.location.end)
      }
    };
  }

  offsetToPosition(offset) {
    // This is a simplified conversion - in a real implementation,
    // you'd need to convert byte offset to line/character position
    // For now, return a default position
    return { line: 0, character: 0 };
  }

  findExternalDefinition(word) {
    const definitionMap = {
      'FileTree': 'file://webapp/src/FileTree.js',
      'RepoTree': 'file://webapp/src/RepoTree.js',
      'MergeEditor': 'file://webapp/src/MergeEditor.js',
      'JRPCClient': 'file://node_modules/@flatmax/jrpc-oo/index.js',
      'LitElement': 'file://node_modules/lit/index.js',
      'extractResponseData': 'file://webapp/src/Utils.js',
      'FileContentLoader': 'file://webapp/src/editor/FileContentLoader.js',
      'languageClient': 'file://webapp/src/editor/LanguageClient.js',
      'MergeViewManager': 'file://webapp/src/editor/MergeViewManager.js',
      'SymbolAnalyzer': 'file://webapp/language-server/symbol-analyzer.js',
      'DocumentManager': 'file://webapp/language-server/document-manager.js'
    };

    if (definitionMap[word]) {
      return {
        uri: definitionMap[word],
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 }
        }
      };
    }

    return null;
  }

  findLocalDefinition(word, textDocument, doc) {
    const text = doc.getText();
    
    // Enhanced patterns to find various types of definitions
    const patterns = [
      // Function declarations: function name() {}
      new RegExp(`function\\s+${word}\\s*\\(`, 'g'),
      // Method definitions: methodName() {} or async methodName() {}
      new RegExp(`(async\\s+)?${word}\\s*\\([^)]*\\)\\s*\\{`, 'g'),
      // Arrow function assignments: const name = () => {} or name = () => {}
      new RegExp(`(const|let|var)?\\s*${word}\\s*=\\s*\\([^)]*\\)\\s*=>`, 'g'),
      // Class method definitions: methodName() { (inside class)
      new RegExp(`^\\s*(async\\s+)?${word}\\s*\\([^)]*\\)\\s*\\{`, 'gm'),
      // Variable declarations: const/let/var name = 
      new RegExp(`(const|let|var)\\s+${word}\\b`, 'g'),
      // Class declarations: class Name
      new RegExp(`class\\s+${word}\\b`, 'g'),
      // Property assignments: this.name = 
      new RegExp(`this\\.${word}\\s*=`, 'g'),
      // Import declarations: import { name } from
      new RegExp(`import\\s+.*\\b${word}\\b.*from`, 'g'),
      // Export declarations: export { name }
      new RegExp(`export\\s+.*\\b${word}\\b`, 'g')
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const defPosition = doc.positionAt(match.index);
        console.log(`Found local definition for ${word} at line ${defPosition.line + 1}, char ${defPosition.character}`);
        return {
          uri: textDocument.uri,
          range: {
            start: defPosition,
            end: doc.positionAt(match.index + match[0].length)
          }
        };
      }
    }

    return null;
  }
}

module.exports = DefinitionHandler;
