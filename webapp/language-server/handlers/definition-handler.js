// Definition request handler
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
    // Check for known external definitions
    const externalDefinition = this.findExternalDefinition(word);
    if (externalDefinition) {
      console.log(`Found definition for ${word}:`, externalDefinition);
      return externalDefinition;
    }

    // Check for local definitions in the same file
    const localDefinition = this.findLocalDefinition(word, textDocument, doc);
    if (localDefinition) {
      console.log(`Found local definition for ${word}:`, localDefinition);
      return localDefinition;
    }

    // No definition found
    console.log(`No definition found for ${word}`);
    return null;
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
      'MergeViewManager': 'file://webapp/src/editor/MergeViewManager.js'
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
      new RegExp(`this\\.${word}\\s*=`, 'g')
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
