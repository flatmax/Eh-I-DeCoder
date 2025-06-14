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
    const functionPattern = new RegExp(`(function|const|let|var|class)\\s+${word}\\b`, 'g');
    let match;
    
    while ((match = functionPattern.exec(text)) !== null) {
      const defPosition = doc.positionAt(match.index);
      return {
        uri: textDocument.uri,
        range: {
          start: defPosition,
          end: doc.positionAt(match.index + match[0].length)
        }
      };
    }

    return null;
  }
}

module.exports = DefinitionHandler;
