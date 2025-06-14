// Enhanced definition request handler with tree-sitter based symbol analysis
const BaseHandler = require('./base-handler');
const path = require('path');
const fs = require('fs');

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
    
    const definition = this.findDefinition(word, textDocument, position, doc);
    this.sendResponse(ws, id, definition);
  }

  findDefinition(word, textDocument, position, doc) {
    console.log(`Starting definition search for "${word}"`);
    
    // First try to find definition using tree-sitter in the current document
    const treeDefinition = this.findTreeSitterDefinition(word, textDocument, position, doc);
    if (treeDefinition) {
      console.log(`Found tree-sitter definition for ${word}:`, treeDefinition);
      return treeDefinition;
    }

    // Then search across all open documents using symbol analyzer
    const crossDocumentDefinition = this.findCrossDocumentDefinition(word, textDocument.uri);
    if (crossDocumentDefinition) {
      console.log(`Found cross-document definition for ${word}:`, crossDocumentDefinition);
      return crossDocumentDefinition;
    }

    // Search the file system for potential matches
    const fileSystemDefinition = this.findFileSystemDefinition(word, textDocument.uri);
    if (fileSystemDefinition) {
      console.log(`Found file system definition for ${word}:`, fileSystemDefinition);
      return fileSystemDefinition;
    }

    // Then check if this is an imported symbol
    const importDefinition = this.findImportDefinition(word, textDocument, doc);
    if (importDefinition) {
      console.log(`Found import definition for ${word}:`, importDefinition);
      return importDefinition;
    }

    // Try to find definition using symbol analysis across documents
    const symbolDefinition = this.findSymbolDefinition(word, textDocument.uri, doc);
    if (symbolDefinition) {
      console.log(`Found symbol definition for ${word}:`, symbolDefinition);
      return symbolDefinition;
    }

    // Check for known external definitions
    const externalDefinition = this.findExternalDefinition(word, textDocument.uri);
    if (externalDefinition) {
      console.log(`Found external definition for ${word}:`, externalDefinition);
      return externalDefinition;
    }

    // No definition found
    console.log(`No definition found for ${word}`);
    return null;
  }

  findCrossDocumentDefinition(word, currentUri) {
    console.log(`Searching for "${word}" across open documents`);
    
    // Use the document manager's method to search across all documents
    const result = this.documentManager.findSymbolInAllDocuments(word);
    if (result) {
      const { symbol, uri } = result;
      return {
        uri: uri,
        range: symbol.range || {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 }
        }
      };
    }

    // Fallback: search through all open documents manually
    const allDocuments = this.documentManager.getAllDocuments();
    console.log(`Manually searching through ${allDocuments.size} documents`);
    
    for (const [uri, doc] of allDocuments) {
      if (uri === currentUri) continue; // Skip current document
      
      console.log(`Searching in document: ${uri}`);
      
      const symbolAnalyzer = this.documentManager.getSymbolAnalyzer();
      const tree = symbolAnalyzer.getTree(uri);
      
      if (!tree) {
        console.log(`No tree available for ${uri}`);
        continue;
      }
      
      const text = doc.getText();
      const definitions = [];
      
      // Use tree-sitter to find definitions in this document
      const cursor = tree.walk();
      this.findDefinitionNodes(cursor, word, text, definitions, uri);
      
      if (definitions.length > 0) {
        console.log(`Found ${definitions.length} definitions in ${uri}`);
        const def = definitions[0];
        return {
          uri: uri,
          range: {
            start: {
              line: def.startPosition.row,
              character: def.startPosition.column
            },
            end: {
              line: def.endPosition.row,
              character: def.endPosition.column
            }
          }
        };
      }
    }
    
    console.log(`No cross-document definition found for "${word}"`);
    return null;
  }

  findFileSystemDefinition(word, currentUri) {
    console.log(`Searching file system for "${word}"`);
    
    try {
      const currentPath = currentUri.replace('file://', '');
      const projectRoot = this.findProjectRoot(currentPath);
      console.log(`Project root: ${projectRoot}`);
      
      // Search for files that might contain the definition
      const potentialFiles = this.findPotentialFiles(word, projectRoot);
      console.log(`Found ${potentialFiles.length} potential files`);
      
      for (const filePath of potentialFiles) {
        try {
          const fileUri = `file://${filePath}`;
          
          // Skip if this file is already open
          if (this.documentManager.isDocumentOpen(fileUri)) {
            console.log(`Skipping already open file: ${filePath}`);
            continue;
          }
          
          console.log(`Searching in file: ${filePath}`);
          const content = fs.readFileSync(filePath, 'utf8');
          const definition = this.searchForDefinitionInContent(word, content, fileUri);
          
          if (definition) {
            console.log(`Found definition in ${filePath}`);
            return definition;
          }
        } catch (error) {
          console.log(`Error reading file ${filePath}:`, error.message);
          continue;
        }
      }
    } catch (error) {
      console.error('Error searching file system:', error);
    }
    
    console.log(`No file system definition found for "${word}"`);
    return null;
  }

  findPotentialFiles(word, projectRoot) {
    const potentialFiles = [];
    
    try {
      // Search common directories
      const searchDirs = [
        path.join(projectRoot, 'webapp', 'src'),
        path.join(projectRoot, 'webapp'),
        path.join(projectRoot, 'python'),
        path.join(projectRoot)
      ];
      
      for (const dir of searchDirs) {
        if (fs.existsSync(dir)) {
          console.log(`Searching directory: ${dir}`);
          this.searchDirectoryForFiles(dir, word, potentialFiles);
        } else {
          console.log(`Directory does not exist: ${dir}`);
        }
      }
    } catch (error) {
      console.error('Error finding potential files:', error);
    }
    
    return potentialFiles;
  }

  searchDirectoryForFiles(dir, word, potentialFiles, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) return;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other common ignore directories
          if (!['node_modules', '.git', '__pycache__', '.pytest_cache', 'dist', 'build'].includes(entry.name)) {
            this.searchDirectoryForFiles(fullPath, word, potentialFiles, maxDepth, currentDepth + 1);
          }
        } else if (entry.isFile()) {
          // Check if filename or content might contain the word
          const ext = path.extname(entry.name).toLowerCase();
          const supportedExts = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h', '.hpp'];
          
          if (supportedExts.includes(ext)) {
            // Add files that might contain the definition
            if (entry.name.toLowerCase().includes(word.toLowerCase()) || 
                this.quickContentCheck(fullPath, word)) {
              potentialFiles.push(fullPath);
            }
          }
        }
      }
    } catch (error) {
      console.log(`Error reading directory ${dir}:`, error.message);
    }
  }

  quickContentCheck(filePath, word) {
    try {
      // Quick check to see if the word appears in the file
      const content = fs.readFileSync(filePath, 'utf8');
      const regex = new RegExp(`\\b${this.escapeRegExp(word)}\\b`, 'i');
      return regex.test(content);
    } catch (error) {
      return false;
    }
  }

  searchForDefinitionInContent(word, content, fileUri) {
    // Use regex patterns to find potential definitions
    const patterns = [
      // JavaScript/TypeScript function declarations
      new RegExp(`^\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${this.escapeRegExp(word)}\\s*\\(`, 'm'),
      new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var)\\s+${this.escapeRegExp(word)}\\s*=\\s*(?:async\\s+)?(?:function|\\(|\\w)`, 'm'),
      new RegExp(`^\\s*(?:export\\s+)?class\\s+${this.escapeRegExp(word)}\\b`, 'm'),
      new RegExp(`^\\s*${this.escapeRegExp(word)}\\s*\\([^)]*\\)\\s*{`, 'm'), // Method definitions
      
      // Python function/class definitions
      new RegExp(`^\\s*(?:async\\s+)?def\\s+${this.escapeRegExp(word)}\\s*\\(`, 'm'),
      new RegExp(`^\\s*class\\s+${this.escapeRegExp(word)}\\b`, 'm'),
      new RegExp(`^\\s*${this.escapeRegExp(word)}\\s*=`, 'm'), // Python assignments
      
      // Java/C++ definitions
      new RegExp(`^\\s*(?:public|private|protected)?\\s*(?:static)?\\s*\\w+\\s+${this.escapeRegExp(word)}\\s*\\(`, 'm'),
      new RegExp(`^\\s*(?:public|private|protected)?\\s*class\\s+${this.escapeRegExp(word)}\\b`, 'm'),
      
      // Go definitions
      new RegExp(`^\\s*func\\s+${this.escapeRegExp(word)}\\s*\\(`, 'm'),
      new RegExp(`^\\s*type\\s+${this.escapeRegExp(word)}\\s+`, 'm'),
      
      // Rust definitions
      new RegExp(`^\\s*(?:pub\\s+)?fn\\s+${this.escapeRegExp(word)}\\s*\\(`, 'm'),
      new RegExp(`^\\s*(?:pub\\s+)?struct\\s+${this.escapeRegExp(word)}\\b`, 'm'),
      new RegExp(`^\\s*(?:pub\\s+)?enum\\s+${this.escapeRegExp(word)}\\b`, 'm')
    ];
    
    for (const pattern of patterns) {
      const match = pattern.exec(content);
      if (match) {
        // Calculate line and character position
        const beforeMatch = content.substring(0, match.index);
        const lines = beforeMatch.split('\n');
        const line = lines.length - 1;
        const character = lines[lines.length - 1].length;
        
        console.log(`Found definition pattern match at line ${line + 1}, char ${character}`);
        return {
          uri: fileUri,
          range: {
            start: { line, character },
            end: { line, character: character + word.length }
          }
        };
      }
    }
    
    return null;
  }

  findProjectRoot(currentPath) {
    // Try to find project root by looking for common project files
    let dir = path.dirname(currentPath);
    const projectMarkers = ['package.json', '.git', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'pom.xml'];
    
    while (dir !== path.dirname(dir)) { // Stop at filesystem root
      for (const marker of projectMarkers) {
        const markerPath = path.join(dir, marker);
        try {
          if (fs.existsSync(markerPath)) {
            return dir;
          }
        } catch (error) {
          // Continue searching
        }
      }
      dir = path.dirname(dir);
    }
    
    // Fallback to current directory
    return path.dirname(currentPath);
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  findTreeSitterDefinition(word, textDocument, position, doc) {
    const symbolAnalyzer = this.documentManager.getSymbolAnalyzer();
    const tree = symbolAnalyzer.getTree(textDocument.uri);
    
    if (!tree) return null;
    
    const text = doc.getText();
    const definitions = [];
    
    // Use tree-sitter to find all potential definitions
    const cursor = tree.walk();
    this.findDefinitionNodes(cursor, word, text, definitions, textDocument.uri);
    
    // Sort definitions by position (earlier definitions first)
    definitions.sort((a, b) => {
      if (a.startPosition.row !== b.startPosition.row) {
        return a.startPosition.row - b.startPosition.row;
      }
      return a.startPosition.column - b.startPosition.column;
    });
    
    // Return the first definition found
    if (definitions.length > 0) {
      const def = definitions[0];
      return {
        uri: textDocument.uri,
        range: {
          start: {
            line: def.startPosition.row,
            character: def.startPosition.column
          },
          end: {
            line: def.endPosition.row,
            character: def.endPosition.column
          }
        }
      };
    }
    
    return null;
  }

  findDefinitionNodes(cursor, targetName, text, definitions, uri) {
    const node = cursor.currentNode;
    
    // Check various definition patterns based on node type
    if (this.isDefinitionNode(node, targetName, text)) {
      // Store the definition with position information
      definitions.push({
        node: node,
        startPosition: node.startPosition,
        endPosition: node.endPosition,
        uri: uri
      });
    }
    
    if (cursor.gotoFirstChild()) {
      do {
        this.findDefinitionNodes(cursor, targetName, text, definitions, uri);
      } while (cursor.gotoNextSibling());
      cursor.gotoParent();
    }
  }

  isDefinitionNode(node, targetName, text) {
    const nodeText = text.substring(node.startIndex, node.endIndex);
    
    // Function declarations
    if (node.type === 'function_declaration' || node.type === 'function_definition') {
      const nameNode = this.getChildForFieldName(node, 'name');
      if (nameNode && text.substring(nameNode.startIndex, nameNode.endIndex) === targetName) {
        return true;
      }
    }
    
    // Class declarations
    if (node.type === 'class_declaration' || node.type === 'class_definition') {
      const nameNode = this.getChildForFieldName(node, 'name');
      if (nameNode && text.substring(nameNode.startIndex, nameNode.endIndex) === targetName) {
        return true;
      }
    }
    
    // Variable declarations
    if (node.type === 'variable_declarator') {
      const nameNode = this.getChildForFieldName(node, 'name');
      if (nameNode && text.substring(nameNode.startIndex, nameNode.endIndex) === targetName) {
        return true;
      }
    }
    
    // Method definitions
    if (node.type === 'method_definition') {
      const nameNode = this.getChildForFieldName(node, 'name');
      if (nameNode && text.substring(nameNode.startIndex, nameNode.endIndex) === targetName) {
        return true;
      }
    }
    
    // Python assignments
    if (node.type === 'assignment') {
      const leftNode = this.getChildForFieldName(node, 'left');
      if (leftNode && leftNode.type === 'identifier' && 
          text.substring(leftNode.startIndex, leftNode.endIndex) === targetName) {
        return true;
      }
    }
    
    // Check for identifiers in various contexts without childForFieldName
    if (node.type === 'identifier' && nodeText === targetName) {
      // Check if this identifier is in a definition context
      const parent = node.parent;
      if (parent) {
        // Variable declarations (const/let/var)
        if (parent.type === 'variable_declarator') {
          const nameNode = this.getChildForFieldName(parent, 'name');
          if (nameNode === node) {
            return true;
          }
        }
        
        // Function names in function declarations
        if (parent.type === 'function_declaration' || parent.type === 'function') {
          const nameNode = this.getChildForFieldName(parent, 'name');
          if (nameNode === node) {
            return true;
          }
        }
        
        // Class names in class declarations
        if (parent.type === 'class_declaration') {
          const nameNode = this.getChildForFieldName(parent, 'name');
          if (nameNode === node) {
            return true;
          }
        }
        
        // Method names in method definitions
        if (parent.type === 'method_definition') {
          const nameNode = this.getChildForFieldName(parent, 'name');
          if (nameNode === node) {
            return true;
          }
        }
        
        // Export declarations
        if (parent.type === 'export_statement' || parent.type === 'export_declaration') {
          return true;
        }
      }
    }
    
    return false;
  }

  // Safe wrapper for childForFieldName that handles cases where it's not available
  getChildForFieldName(node, fieldName) {
    if (typeof node.childForFieldName === 'function') {
      return node.childForFieldName(fieldName);
    }
    
    // Fallback: try to find child by looking at node structure
    if (node.children) {
      switch (fieldName) {
        case 'name':
          // Look for identifier nodes that could be names
          return node.children.find(child => 
            child.type === 'identifier' || child.type === 'property_identifier'
          );
        case 'left':
          // For assignments, first child is usually left side
          return node.children[0];
        default:
          return null;
      }
    }
    
    return null;
  }

  findImportDefinition(word, textDocument, doc) {
    const symbolAnalyzer = this.documentManager.getSymbolAnalyzer();
    const tree = symbolAnalyzer.getTree(textDocument.uri);
    
    if (!tree) return null;
    
    const text = doc.getText();
    const imports = [];
    
    // Use tree-sitter to find import statements
    const cursor = tree.walk();
    this.findImportNodes(cursor, imports);
    
    for (const importNode of imports) {
      const importedSymbols = this.extractImportedSymbols(importNode, text);
      
      if (importedSymbols.some(sym => sym.name === word)) {
        const sourcePath = this.extractImportSource(importNode, text);
        if (sourcePath) {
          const resolvedPath = this.resolveImportPath(sourcePath, textDocument.uri);
          if (resolvedPath) {
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
    }
    
    return null;
  }

  findImportNodes(cursor, imports) {
    const node = cursor.currentNode;
    
    if (node.type === 'import_statement' || 
        node.type === 'import_from_statement' ||
        node.type === 'import_declaration') {
      imports.push(node);
    }
    
    if (cursor.gotoFirstChild()) {
      do {
        this.findImportNodes(cursor, imports);
      } while (cursor.gotoNextSibling());
      cursor.gotoParent();
    }
  }

  extractImportedSymbols(importNode, text) {
    const symbols = [];
    
    // JavaScript/TypeScript imports
    if (importNode.type === 'import_declaration') {
      importNode.children.forEach(child => {
        if (child.type === 'import_specifier') {
          const nameNode = (child.childForFieldName && child.childForFieldName('alias')) || 
                          (child.childForFieldName && child.childForFieldName('name'));
          if (nameNode) {
            symbols.push({
              name: text.substring(nameNode.startIndex, nameNode.endIndex)
            });
          }
        } else if (child.type === 'identifier' && child.previousSibling?.type === 'import') {
          symbols.push({
            name: text.substring(child.startIndex, child.endIndex)
          });
        }
      });
    }
    // Python imports
    else if (importNode.type === 'import_statement' || importNode.type === 'import_from_statement') {
      importNode.children.forEach(child => {
        if (child.type === 'dotted_name' || child.type === 'identifier') {
          if (child.previousSibling?.type === 'import' || 
              (child.previousSibling?.type === ',' && child.previousSibling.previousSibling?.type === 'identifier')) {
            symbols.push({
              name: text.substring(child.startIndex, child.endIndex)
            });
          }
        }
      });
    }
    
    return symbols;
  }

  extractImportSource(importNode, text) {
    // JavaScript/TypeScript
    if (importNode.childForFieldName) {
      const sourceNode = importNode.childForFieldName('source');
      if (sourceNode) {
        let source = text.substring(sourceNode.startIndex, sourceNode.endIndex);
        // Remove quotes
        source = source.replace(/['"]/g, '');
        return source;
      }
    }
    
    // Python
    if (importNode.childForFieldName) {
      const moduleNode = importNode.childForFieldName('module_name');
      if (moduleNode) {
        return text.substring(moduleNode.startIndex, moduleNode.endIndex);
      }
    }
    
    return null;
  }

  resolveImportPath(importPath, currentFileUri) {
    // Convert file:// URI to path
    const currentPath = currentFileUri.replace('file://', '');
    const currentDir = path.dirname(currentPath);
    
    let resolvedPath;
    
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      // Relative import
      resolvedPath = path.resolve(currentDir, importPath);
    } else if (importPath.startsWith('/')) {
      // Absolute import from project root
      const projectRoot = this.findProjectRoot(currentPath);
      resolvedPath = path.join(projectRoot, importPath);
    } else {
      // Node modules or other absolute imports
      const projectRoot = this.findProjectRoot(currentPath);
      resolvedPath = path.join(projectRoot, 'node_modules', importPath);
    }
    
    // Add appropriate extension if not present
    if (!path.extname(resolvedPath)) {
      // Try common extensions based on the current file's language
      const currentExt = path.extname(currentPath);
      const extensions = this.getExtensionsForLanguage(currentExt);
      
      for (const ext of extensions) {
        const testPath = resolvedPath + ext;
        try {
          if (fs.existsSync(testPath)) {
            resolvedPath = testPath;
            break;
          }
        } catch (error) {
          // Continue trying other extensions
        }
      }
    }
    
    return `file://${resolvedPath}`;
  }

  getExtensionsForLanguage(currentExt) {
    switch (currentExt) {
      case '.js':
      case '.jsx':
        return ['.js', '.jsx', '/index.js', '/index.jsx'];
      case '.ts':
      case '.tsx':
        return ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
      case '.py':
        return ['.py', '/__init__.py'];
      case '.go':
        return ['.go'];
      case '.rs':
        return ['.rs'];
      case '.java':
        return ['.java'];
      case '.cpp':
      case '.cc':
      case '.cxx':
        return ['.cpp', '.cc', '.cxx', '.h', '.hpp'];
      case '.c':
        return ['.c', '.h'];
      default:
        return ['.js', '.ts', '.py'];
    }
  }

  findSymbolDefinition(word, uri, doc) {
    const symbolAnalyzer = this.documentManager.getSymbolAnalyzer();
    const symbol = symbolAnalyzer.findSymbol(word, uri);
    
    if (!symbol || !symbol.location) return null;
    
    // Convert symbol location to LSP definition format
    const startPos = symbol.range?.start || this.offsetToPosition(doc, symbol.location.start);
    const endPos = symbol.range?.end || this.offsetToPosition(doc, symbol.location.end);
    
    return {
      uri: symbol.uri || uri,
      range: {
        start: startPos,
        end: endPos
      }
    };
  }

  offsetToPosition(doc, offset) {
    try {
      return doc.positionAt(offset);
    } catch (error) {
      console.error('Error converting offset to position:', error);
      return { line: 0, character: 0 };
    }
  }

  findExternalDefinition(word, currentUri) {
    // Get the current file's language to provide appropriate built-in definitions
    const currentPath = currentUri.replace('file://', '');
    const currentExt = path.extname(currentPath);
    
    // Language-specific built-in definitions
    const builtinDefinitions = this.getBuiltinDefinitions(currentExt);
    
    if (builtinDefinitions[word]) {
      return {
        uri: builtinDefinitions[word],
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 }
        }
      };
    }

    return null;
  }

  getBuiltinDefinitions(fileExtension) {
    switch (fileExtension) {
      case '.js':
      case '.jsx':
      case '.ts':
      case '.tsx':
        return {
          // JavaScript/TypeScript built-ins - these are conceptual URIs
          'console': 'builtin://javascript/console',
          'window': 'builtin://javascript/window',
          'document': 'builtin://javascript/document',
          'Array': 'builtin://javascript/Array',
          'Object': 'builtin://javascript/Object',
          'Promise': 'builtin://javascript/Promise',
          'JSON': 'builtin://javascript/JSON',
          'Math': 'builtin://javascript/Math',
          'Date': 'builtin://javascript/Date',
          'RegExp': 'builtin://javascript/RegExp',
          'Error': 'builtin://javascript/Error',
          'setTimeout': 'builtin://javascript/setTimeout',
          'setInterval': 'builtin://javascript/setInterval',
          'fetch': 'builtin://javascript/fetch'
        };
      
      case '.py':
        return {
          // Python built-ins
          'print': 'builtin://python/print',
          'len': 'builtin://python/len',
          'range': 'builtin://python/range',
          'str': 'builtin://python/str',
          'int': 'builtin://python/int',
          'float': 'builtin://python/float',
          'list': 'builtin://python/list',
          'dict': 'builtin://python/dict',
          'set': 'builtin://python/set',
          'tuple': 'builtin://python/tuple',
          'open': 'builtin://python/open',
          'input': 'builtin://python/input',
          'type': 'builtin://python/type',
          'isinstance': 'builtin://python/isinstance',
          'hasattr': 'builtin://python/hasattr',
          'getattr': 'builtin://python/getattr',
          'setattr': 'builtin://python/setattr'
        };
      
      case '.java':
        return {
          // Java built-ins
          'System': 'builtin://java/System',
          'String': 'builtin://java/String',
          'Object': 'builtin://java/Object',
          'Integer': 'builtin://java/Integer',
          'Double': 'builtin://java/Double',
          'Boolean': 'builtin://java/Boolean',
          'ArrayList': 'builtin://java/ArrayList',
          'HashMap': 'builtin://java/HashMap',
          'Scanner': 'builtin://java/Scanner'
        };
      
      case '.go':
        return {
          // Go built-ins
          'fmt': 'builtin://go/fmt',
          'os': 'builtin://go/os',
          'io': 'builtin://go/io',
          'strings': 'builtin://go/strings',
          'strconv': 'builtin://go/strconv',
          'time': 'builtin://go/time',
          'json': 'builtin://go/encoding/json',
          'http': 'builtin://go/net/http'
        };
      
      case '.rs':
        return {
          // Rust built-ins
          'std': 'builtin://rust/std',
          'Vec': 'builtin://rust/Vec',
          'String': 'builtin://rust/String',
          'HashMap': 'builtin://rust/HashMap',
          'Option': 'builtin://rust/Option',
          'Result': 'builtin://rust/Result',
          'println': 'builtin://rust/println',
          'print': 'builtin://rust/print'
        };
      
      case '.cpp':
      case '.cc':
      case '.cxx':
      case '.c':
        return {
          // C/C++ built-ins
          'printf': 'builtin://c/printf',
          'scanf': 'builtin://c/scanf',
          'malloc': 'builtin://c/malloc',
          'free': 'builtin://c/free',
          'strlen': 'builtin://c/strlen',
          'strcpy': 'builtin://c/strcpy',
          'strcmp': 'builtin://c/strcmp',
          'std': 'builtin://cpp/std',
          'cout': 'builtin://cpp/cout',
          'cin': 'builtin://cpp/cin',
          'vector': 'builtin://cpp/vector',
          'string': 'builtin://cpp/string',
          'map': 'builtin://cpp/map'
        };
      
      default:
        return {};
    }
  }
}

module.exports = DefinitionHandler;
