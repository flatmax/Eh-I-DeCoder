// Symbol analyzer using Babel AST parsing
const babel = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');

class SymbolAnalyzer {
  constructor() {
    this.symbolCache = new Map();
    this.documentSymbols = new Map();
  }

  analyzeDocument(uri, text, languageId) {
    try {
      const symbols = this.parseSymbols(text, languageId);
      this.documentSymbols.set(uri, symbols);
      
      // Update global symbol cache
      symbols.forEach(symbol => {
        const key = `${symbol.name}:${symbol.type}`;
        if (!this.symbolCache.has(key)) {
          this.symbolCache.set(key, []);
        }
        this.symbolCache.get(key).push({
          ...symbol,
          uri
        });
      });
      
      console.log(`Analyzed ${symbols.length} symbols in ${uri}`);
      return symbols;
    } catch (error) {
      console.error(`Error analyzing document ${uri}:`, error);
      return [];
    }
  }

  parseSymbols(text, languageId) {
    const symbols = [];
    
    try {
      // Configure parser based on language
      const parserOptions = this.getParserOptions(languageId);
      const ast = babel.parse(text, parserOptions);
      
      traverse(ast, {
        // Function declarations
        FunctionDeclaration: (path) => {
          const symbol = this.extractFunctionSymbol(path.node, text);
          if (symbol) symbols.push(symbol);
        },
        
        // Arrow functions and function expressions
        VariableDeclarator: (path) => {
          if (t.isArrowFunctionExpression(path.node.init) || 
              t.isFunctionExpression(path.node.init)) {
            const symbol = this.extractFunctionFromVariable(path.node, text);
            if (symbol) symbols.push(symbol);
          } else {
            const symbol = this.extractVariableSymbol(path.node, text);
            if (symbol) symbols.push(symbol);
          }
        },
        
        // Class declarations
        ClassDeclaration: (path) => {
          const symbol = this.extractClassSymbol(path.node, text);
          if (symbol) symbols.push(symbol);
          
          // Extract class methods
          path.node.body.body.forEach(method => {
            if (t.isClassMethod(method)) {
              const methodSymbol = this.extractMethodSymbol(method, path.node.id.name, text);
              if (methodSymbol) symbols.push(methodSymbol);
            }
          });
        },
        
        // Class methods (handled separately in case they're not inside ClassDeclaration)
        ClassMethod: (path) => {
          // Skip if already handled by ClassDeclaration
          if (!path.findParent(p => p.isClassDeclaration())) {
            const symbol = this.extractMethodSymbol(path.node, null, text);
            if (symbol) symbols.push(symbol);
          }
        },
        
        // Import declarations
        ImportDeclaration: (path) => {
          path.node.specifiers.forEach(spec => {
            const symbol = this.extractImportSymbol(spec, path.node.source.value, text);
            if (symbol) symbols.push(symbol);
          });
        },
        
        // Export declarations
        ExportNamedDeclaration: (path) => {
          if (path.node.declaration) {
            // Handle exported functions, classes, etc.
            const symbol = this.extractExportSymbol(path.node, text);
            if (symbol) symbols.push(symbol);
          }
        }
      });
      
    } catch (error) {
      console.error('Error parsing AST:', error);
    }
    
    return symbols;
  }

  getParserOptions(languageId) {
    const baseOptions = {
      sourceType: 'module',
      allowImportExportEverywhere: true,
      allowReturnOutsideFunction: true,
      plugins: [
        'jsx',
        'objectRestSpread',
        'decorators-legacy',
        'classProperties',
        'asyncGenerators',
        'functionBind',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining'
      ]
    };

    if (languageId === 'typescript' || languageId === 'typescriptreact') {
      baseOptions.plugins.push('typescript');
    }

    return baseOptions;
  }

  extractFunctionSymbol(node, text) {
    if (!node.id) return null;
    
    const name = node.id.name;
    const params = node.params.map(param => this.getParameterInfo(param));
    const jsdoc = this.extractJSDoc(node, text);
    
    return {
      name,
      type: 'function',
      kind: 'Function',
      params,
      async: node.async,
      generator: node.generator,
      documentation: jsdoc,
      signature: this.buildFunctionSignature(name, params, node.async, node.generator),
      location: {
        start: node.start,
        end: node.end
      }
    };
  }

  extractFunctionFromVariable(node, text) {
    if (!t.isIdentifier(node.id)) return null;
    
    const name = node.id.name;
    const func = node.init;
    const params = func.params.map(param => this.getParameterInfo(param));
    const jsdoc = this.extractJSDoc(node, text);
    
    return {
      name,
      type: 'function',
      kind: 'Function',
      params,
      async: func.async,
      generator: func.generator,
      documentation: jsdoc,
      signature: this.buildFunctionSignature(name, params, func.async, func.generator),
      location: {
        start: node.start,
        end: node.end
      }
    };
  }

  extractVariableSymbol(node, text) {
    if (!t.isIdentifier(node.id)) return null;
    
    const name = node.id.name;
    const jsdoc = this.extractJSDoc(node, text);
    
    return {
      name,
      type: 'variable',
      kind: 'Variable',
      documentation: jsdoc,
      location: {
        start: node.start,
        end: node.end
      }
    };
  }

  extractClassSymbol(node, text) {
    if (!node.id) return null;
    
    const name = node.id.name;
    const jsdoc = this.extractJSDoc(node, text);
    const methods = node.body.body
      .filter(member => t.isClassMethod(member))
      .map(method => method.key.name);
    
    return {
      name,
      type: 'class',
      kind: 'Class',
      methods,
      documentation: jsdoc,
      location: {
        start: node.start,
        end: node.end
      }
    };
  }

  extractMethodSymbol(node, className, text) {
    if (!node.key || !t.isIdentifier(node.key)) return null;
    
    const name = node.key.name;
    const params = node.params.map(param => this.getParameterInfo(param));
    const jsdoc = this.extractJSDoc(node, text);
    
    return {
      name,
      type: 'method',
      kind: 'Method',
      className,
      params,
      static: node.static,
      async: node.async,
      documentation: jsdoc,
      signature: this.buildMethodSignature(name, params, className, node.static, node.async),
      location: {
        start: node.start,
        end: node.end
      }
    };
  }

  extractImportSymbol(spec, source, text) {
    let name, importedName;
    
    if (t.isImportDefaultSpecifier(spec)) {
      name = spec.local.name;
      importedName = 'default';
    } else if (t.isImportSpecifier(spec)) {
      name = spec.local.name;
      importedName = spec.imported.name;
    } else if (t.isImportNamespaceSpecifier(spec)) {
      name = spec.local.name;
      importedName = '*';
    } else {
      return null;
    }
    
    return {
      name,
      type: 'import',
      kind: 'Import',
      source,
      importedName,
      documentation: `Imported from ${source}`,
      location: {
        start: spec.start,
        end: spec.end
      }
    };
  }

  extractExportSymbol(node, text) {
    // Handle various export patterns
    if (node.declaration) {
      if (t.isFunctionDeclaration(node.declaration)) {
        const symbol = this.extractFunctionSymbol(node.declaration, text);
        if (symbol) {
          symbol.exported = true;
          return symbol;
        }
      } else if (t.isClassDeclaration(node.declaration)) {
        const symbol = this.extractClassSymbol(node.declaration, text);
        if (symbol) {
          symbol.exported = true;
          return symbol;
        }
      }
    }
    return null;
  }

  getParameterInfo(param) {
    if (t.isIdentifier(param)) {
      return { name: param.name, type: 'any' };
    } else if (t.isAssignmentPattern(param)) {
      return { 
        name: param.left.name, 
        type: 'any',
        default: true 
      };
    } else if (t.isRestElement(param)) {
      return { 
        name: param.argument.name, 
        type: 'any',
        rest: true 
      };
    }
    return { name: 'param', type: 'any' };
  }

  buildFunctionSignature(name, params, isAsync, isGenerator) {
    const asyncPrefix = isAsync ? 'async ' : '';
    const generatorPrefix = isGenerator ? '*' : '';
    const paramStr = params.map(p => {
      let paramName = p.name;
      if (p.rest) paramName = '...' + paramName;
      if (p.default) paramName += '?';
      return paramName;
    }).join(', ');
    
    return `${asyncPrefix}function${generatorPrefix} ${name}(${paramStr})`;
  }

  buildMethodSignature(name, params, className, isStatic, isAsync) {
    const staticPrefix = isStatic ? 'static ' : '';
    const asyncPrefix = isAsync ? 'async ' : '';
    const classPrefix = className ? `${className}.` : '';
    const paramStr = params.map(p => {
      let paramName = p.name;
      if (p.rest) paramName = '...' + paramName;
      if (p.default) paramName += '?';
      return paramName;
    }).join(', ');
    
    return `${staticPrefix}${asyncPrefix}${classPrefix}${name}(${paramStr})`;
  }

  extractJSDoc(node, text) {
    // Look for JSDoc comments before the node
    if (!node.leadingComments) return null;
    
    const jsdocComment = node.leadingComments.find(comment => 
      comment.type === 'CommentBlock' && comment.value.startsWith('*')
    );
    
    if (!jsdocComment) return null;
    
    // Parse JSDoc content
    const content = jsdocComment.value;
    const lines = content.split('\n').map(line => line.trim().replace(/^\*\s?/, ''));
    
    let description = '';
    const tags = {};
    let currentTag = null;
    
    for (const line of lines) {
      if (line.startsWith('@')) {
        const tagMatch = line.match(/^@(\w+)\s*(.*)/);
        if (tagMatch) {
          currentTag = tagMatch[1];
          tags[currentTag] = tagMatch[2] || '';
        }
      } else if (currentTag) {
        tags[currentTag] += (tags[currentTag] ? ' ' : '') + line;
      } else if (line) {
        description += (description ? ' ' : '') + line;
      }
    }
    
    return { description, tags };
  }

  findSymbol(name, uri = null) {
    // First check document-specific symbols
    if (uri && this.documentSymbols.has(uri)) {
      const docSymbols = this.documentSymbols.get(uri);
      const found = docSymbols.find(symbol => symbol.name === name);
      if (found) return found;
    }
    
    // Then check global cache
    const cacheKey = `${name}:function`;
    if (this.symbolCache.has(cacheKey)) {
      return this.symbolCache.get(cacheKey)[0]; // Return first match
    }
    
    // Check other types
    for (const type of ['class', 'variable', 'method']) {
      const key = `${name}:${type}`;
      if (this.symbolCache.has(key)) {
        return this.symbolCache.get(key)[0];
      }
    }
    
    return null;
  }

  getSymbolsInDocument(uri) {
    return this.documentSymbols.get(uri) || [];
  }

  clearDocument(uri) {
    this.documentSymbols.delete(uri);
    // TODO: Clean up global cache entries for this URI
  }
}

module.exports = SymbolAnalyzer;
