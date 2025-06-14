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
    // First check if this is an imported symbol
    const importDefinition = this.findImportDefinition(word, textDocument, doc);
    if (importDefinition) {
      console.log(`Found import definition for ${word}:`, importDefinition);
      return importDefinition;
    }

    // Then try to find definition using symbol analysis
    const symbolDefinition = this.findSymbolDefinition(word, textDocument.uri, doc);
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

  findImportDefinition(word, textDocument, doc) {
    const text = doc.getText();
    
    // Look for import statements that import this symbol
    const importPatterns = [
      // Named imports: import { word } from './file'
      new RegExp(`import\\s*\\{[^}]*\\b${word}\\b[^}]*\\}\\s*from\\s*['"]([^'"]+)['"]`, 'g'),
      // Default imports: import word from './file'
      new RegExp(`import\\s+${word}\\s+from\\s*['"]([^'"]+)['"]`, 'g'),
      // Namespace imports: import * as word from './file'
      new RegExp(`import\\s*\\*\\s*as\\s+${word}\\s+from\\s*['"]([^'"]+)['"]`, 'g')
    ];
    
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const importPath = match[1];
        const resolvedPath = this.resolveImportPath(importPath, textDocument.uri);
        
        if (resolvedPath) {
          console.log(`Found import: ${word} from ${importPath} -> ${resolvedPath}`);
          return {
            uri: resolvedPath,
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 }
            }
          };
        }
      }
    }
    
    return null;
  }

  resolveImportPath(importPath, currentFileUri) {
    // Convert file:// URI to path
    const currentPath = currentFileUri.replace('file://', '');
    const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
    
    let resolvedPath;
    
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // Relative import
      resolvedPath = this.resolveRelativePath(currentDir, importPath);
    } else if (importPath.startsWith('/')) {
      // Absolute import from project root
      resolvedPath = 'webapp' + importPath;
    } else {
      // Node modules or other absolute imports
      resolvedPath = `node_modules/${importPath}`;
    }
    
    // Add .js extension if not present and not a directory
    if (!resolvedPath.includes('.')) {
      // Try common extensions
      const extensions = ['.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts'];
      for (const ext of extensions) {
        const testPath = resolvedPath + ext;
        // For now, assume .js files exist (in a real implementation, you'd check the filesystem)
        if (ext === '.js' || ext === '/index.js') {
          resolvedPath = testPath;
          break;
        }
      }
    }
    
    return `file://${resolvedPath}`;
  }

  resolveRelativePath(currentDir, relativePath) {
    const parts = currentDir.split('/');
    const relativeParts = relativePath.split('/');
    
    for (const part of relativeParts) {
      if (part === '.') {
        continue;
      } else if (part === '..') {
        parts.pop();
      } else {
        parts.push(part);
      }
    }
    
    return parts.join('/');
  }

  findSymbolDefinition(word, uri, doc) {
    const symbolAnalyzer = this.documentManager.getSymbolAnalyzer();
    const symbol = symbolAnalyzer.findSymbol(word, uri);
    
    if (!symbol || !symbol.location) return null;
    
    // Convert symbol location to LSP definition format
    const startPos = this.offsetToPosition(doc, symbol.location.start);
    const endPos = this.offsetToPosition(doc, symbol.location.end);
    
    return {
      uri: symbol.uri || uri,
      range: {
        start: startPos,
        end: endPos
      }
    };
  }

  offsetToPosition(doc, offset) {
    // Convert byte offset to line/character position using the document
    try {
      return doc.positionAt(offset);
    } catch (error) {
      console.error('Error converting offset to position:', error);
      return { line: 0, character: 0 };
    }
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
      'DocumentManager': 'file://webapp/language-server/document-manager.js',
      'createLanguageClientExtension': 'file://webapp/src/editor/LanguageClientExtension.js',
      'getLanguageExtension': 'file://webapp/src/editor/LanguageExtensions.js',
      'createScrollbarChangeIndicator': 'file://webapp/src/editor/ScrollbarChangeIndicator.js',
      'MergeView': 'file://node_modules/@codemirror/merge/dist/index.js',
      'basicSetup': 'file://node_modules/codemirror/dist/index.js',
      'EditorView': 'file://node_modules/@codemirror/view/dist/index.js',
      'oneDark': 'file://node_modules/@codemirror/theme-one-dark/dist/index.js',
      'css': 'file://node_modules/lit/index.js'
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
      // Export declarations: export { name } or export const name
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
