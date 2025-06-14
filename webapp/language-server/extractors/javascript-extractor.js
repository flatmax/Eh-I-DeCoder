// JavaScript/TypeScript symbol extractor
const BaseExtractor = require('./base-extractor');

class JavaScriptExtractor extends BaseExtractor {
  extract(tree, text) {
    const symbols = [];
    const cursor = tree.walk();
    
    this.walkTree(cursor, (node) => {
      const symbol = this.extractSymbolFromNode(node, text);
      if (symbol) {
        symbols.push(symbol);
      }
    });
    
    return symbols;
  }

  extractSymbolFromNode(node, text) {
    switch (node.type) {
      case 'function_declaration':
        return this.extractFunction(node, text);
      case 'arrow_function':
      case 'function_expression':
        return this.extractFunctionExpression(node, text);
      case 'method_definition':
        return this.extractMethod(node, text);
      case 'class_declaration':
        return this.extractClass(node, text);
      case 'variable_declarator':
        return this.extractVariable(node, text);
      case 'import_statement':
      case 'import_declaration':
        return this.extractImport(node, text);
      case 'export_statement':
        return this.extractExport(node, text);
      default:
        return null;
    }
  }

  extractFunction(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const params = this.extractParameters(node, text);
    const isAsync = this.hasModifier(node, 'async');
    const isGenerator = this.hasModifier(node, '*');
    
    return this.createSymbol(name, this.symbolTypes.FUNCTION, this.nodeToRange(node), {
      signature: this.buildFunctionSignature(name, params, isAsync, isGenerator),
      params,
      async: isAsync,
      generator: isGenerator
    });
  }

  extractFunctionExpression(node, text) {
    // For arrow functions and function expressions assigned to variables
    const parent = node.parent;
    if (parent && parent.type === 'variable_declarator') {
      const nameNode = this.getChildForFieldName(parent, 'name');
      if (nameNode) {
        const name = this.getNodeText(nameNode, text);
        const params = this.extractParameters(node, text);
        const isAsync = this.hasModifier(node, 'async');
        
        return this.createSymbol(name, this.symbolTypes.FUNCTION, this.nodeToRange(parent), {
          signature: this.buildFunctionSignature(name, params, isAsync, false),
          params,
          async: isAsync
        });
      }
    }
    return null;
  }

  extractMethod(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const params = this.extractParameters(node, text);
    const isAsync = this.hasModifier(node, 'async');
    const isStatic = this.hasModifier(node, 'static');
    const isGenerator = this.hasModifier(node, '*');
    
    return this.createSymbol(name, this.symbolTypes.METHOD, this.nodeToRange(node), {
      signature: this.buildFunctionSignature(name, params, isAsync, isGenerator),
      params,
      async: isAsync,
      static: isStatic,
      generator: isGenerator
    });
  }

  extractClass(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const methods = this.extractClassMethods(node, text);
    
    return this.createSymbol(name, this.symbolTypes.CLASS, this.nodeToRange(node), {
      signature: `class ${name}`,
      methods: methods.map(m => m.name)
    });
  }

  extractVariable(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const parent = node.parent;
    let isConstant = false;
    
    if (parent && parent.type === 'variable_declaration') {
      const declarationKind = parent.children[0];
      isConstant = declarationKind && this.getNodeText(declarationKind, text) === 'const';
    }
    
    const symbolType = isConstant ? this.symbolTypes.CONSTANT : this.symbolTypes.VARIABLE;
    
    return this.createSymbol(name, symbolType, this.nodeToRange(node), {
      signature: `${isConstant ? 'const' : 'let'} ${name}`
    });
  }

  extractImport(node, text) {
    const symbols = [];
    
    // Handle different import patterns
    node.children.forEach(child => {
      if (child.type === 'import_specifier') {
        const nameNode = this.getChildForFieldName(child, 'name');
        const aliasNode = this.getChildForFieldName(child, 'alias');
        
        if (nameNode) {
          const importedName = this.getNodeText(nameNode, text);
          const localName = aliasNode ? this.getNodeText(aliasNode, text) : importedName;
          
          symbols.push(this.createSymbol(localName, this.symbolTypes.IMPORT, this.nodeToRange(child), {
            signature: `import { ${importedName} }`,
            importedName: importedName !== localName ? importedName : null,
            source: this.extractImportSource(node, text)
          }));
        }
      } else if (child.type === 'identifier' && child.previousSibling?.type === 'import') {
        // Default import
        const name = this.getNodeText(child, text);
        symbols.push(this.createSymbol(name, this.symbolTypes.IMPORT, this.nodeToRange(child), {
          signature: `import ${name}`,
          source: this.extractImportSource(node, text)
        }));
      }
    });
    
    return symbols.length === 1 ? symbols[0] : symbols;
  }

  extractExport(node, text) {
    // Handle export declarations
    const declaration = this.getChildForFieldName(node, 'declaration');
    if (declaration) {
      const symbol = this.extractSymbolFromNode(declaration, text);
      if (symbol) {
        symbol.exported = true;
        return symbol;
      }
    }
    return null;
  }

  extractParameters(node, text) {
    const params = [];
    const parametersNode = this.getChildForFieldName(node, 'parameters');
    
    if (parametersNode) {
      parametersNode.children.forEach(child => {
        if (child.type === 'identifier') {
          params.push({
            name: this.getNodeText(child, text),
            type: 'any'
          });
        } else if (child.type === 'rest_parameter') {
          const nameNode = child.children.find(c => c.type === 'identifier');
          if (nameNode) {
            params.push({
              name: this.getNodeText(nameNode, text),
              type: 'any',
              rest: true
            });
          }
        } else if (child.type === 'assignment_pattern') {
          const nameNode = this.getChildForFieldName(child, 'left');
          if (nameNode && nameNode.type === 'identifier') {
            params.push({
              name: this.getNodeText(nameNode, text),
              type: 'any',
              default: true
            });
          }
        }
      });
    }
    
    return params;
  }

  extractClassMethods(node, text) {
    const methods = [];
    const bodyNode = this.getChildForFieldName(node, 'body');
    
    if (bodyNode) {
      bodyNode.children.forEach(child => {
        if (child.type === 'method_definition') {
          const method = this.extractMethod(child, text);
          if (method) {
            methods.push(method);
          }
        }
      });
    }
    
    return methods;
  }

  extractImportSource(node, text) {
    const sourceNode = this.getChildForFieldName(node, 'source');
    if (sourceNode) {
      let source = this.getNodeText(sourceNode, text);
      // Remove quotes
      source = source.replace(/['"]/g, '');
      return source;
    }
    return null;
  }

  buildFunctionSignature(name, params, isAsync, isGenerator) {
    const asyncPrefix = isAsync ? 'async ' : '';
    const generatorPrefix = isGenerator ? '*' : '';
    const paramString = params.map(p => {
      let param = p.name;
      if (p.rest) param = '...' + param;
      if (p.default) param += '?';
      return param;
    }).join(', ');
    
    return `${asyncPrefix}function${generatorPrefix} ${name}(${paramString})`;
  }

  hasModifier(node, modifier) {
    return node.children.some(child => 
      this.getNodeText(child, node.tree?.rootNode?.text || '') === modifier
    );
  }

  // Safe wrapper for childForFieldName that handles cases where it's not available
  getChildForFieldName(node, fieldName) {
    if (typeof node.childForFieldName === 'function') {
      return node.childForFieldName(fieldName);
    }
    
    // Fallback: try to find child by looking at node structure
    if (node.children) {
      // For common patterns, try to find the right child
      switch (fieldName) {
        case 'name':
          // Look for identifier nodes that could be names
          return node.children.find(child => 
            child.type === 'identifier' || child.type === 'property_identifier'
          );
        case 'parameters':
          // Look for formal_parameters or parameter_list
          return node.children.find(child => 
            child.type === 'formal_parameters' || child.type === 'parameter_list'
          );
        case 'body':
          // Look for statement_block or class_body
          return node.children.find(child => 
            child.type === 'statement_block' || child.type === 'class_body'
          );
        case 'source':
          // Look for string literals in imports
          return node.children.find(child => 
            child.type === 'string' || child.type === 'string_literal'
          );
        case 'declaration':
          // Look for various declaration types
          return node.children.find(child => 
            child.type.includes('declaration') || child.type.includes('statement')
          );
        case 'left':
          // For assignment patterns, first child is usually left side
          return node.children[0];
        case 'alias':
          // For import specifiers with 'as', look for identifier after 'as'
          const asIndex = node.children.findIndex(child => 
            this.getNodeText(child, node.tree?.rootNode?.text || '') === 'as'
          );
          return asIndex >= 0 && asIndex < node.children.length - 1 ? 
            node.children[asIndex + 1] : null;
        default:
          return null;
      }
    }
    
    return null;
  }
}

module.exports = JavaScriptExtractor;
