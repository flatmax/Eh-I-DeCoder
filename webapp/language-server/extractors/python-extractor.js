// Python symbol extractor
const BaseExtractor = require('./base-extractor');

class PythonExtractor extends BaseExtractor {
  extract(tree, text) {
    const symbols = [];
    const cursor = tree.walk();
    
    this.walkTree(cursor, (node) => {
      const symbol = this.extractSymbolFromNode(node, text);
      if (symbol) {
        if (Array.isArray(symbol)) {
          symbols.push(...symbol);
        } else {
          symbols.push(symbol);
        }
      }
    });
    
    return symbols;
  }

  extractSymbolFromNode(node, text) {
    switch (node.type) {
      case 'function_definition':
        return this.extractFunction(node, text);
      case 'class_definition':
        return this.extractClass(node, text);
      case 'assignment':
        return this.extractAssignment(node, text);
      case 'import_statement':
      case 'import_from_statement':
        return this.extractImport(node, text);
      default:
        return null;
    }
  }

  extractFunction(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const params = this.extractParameters(node, text);
    const isAsync = this.isAsyncFunction(node, text);
    
    // Determine if this is a method (inside a class)
    const isMethod = this.isInsideClass(node);
    const symbolType = isMethod ? this.symbolTypes.METHOD : this.symbolTypes.FUNCTION;
    
    return this.createSymbol(name, symbolType, this.nodeToRange(node), {
      signature: this.buildFunctionSignature(name, params, isAsync),
      params,
      async: isAsync
    });
  }

  extractClass(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const methods = this.extractClassMethods(node, text);
    const baseClasses = this.extractBaseClasses(node, text);
    
    return this.createSymbol(name, this.symbolTypes.CLASS, this.nodeToRange(node), {
      signature: this.buildClassSignature(name, baseClasses),
      methods: methods.map(m => m.name)
    });
  }

  extractAssignment(node, text) {
    const leftNode = this.getChildForFieldName(node, 'left');
    if (!leftNode || leftNode.type !== 'identifier') return null;
    
    const name = this.getNodeText(leftNode, text);
    
    // Check if this looks like a constant (ALL_CAPS)
    const isConstant = /^[A-Z_][A-Z0-9_]*$/.test(name);
    const symbolType = isConstant ? this.symbolTypes.CONSTANT : this.symbolTypes.VARIABLE;
    
    return this.createSymbol(name, symbolType, this.nodeToRange(node), {
      signature: `${name} = ...`
    });
  }

  extractImport(node, text) {
    const symbols = [];
    
    if (node.type === 'import_statement') {
      // import module
      const moduleNode = this.getChildForFieldName(node, 'name');
      if (moduleNode) {
        const moduleName = this.getNodeText(moduleNode, text);
        symbols.push(this.createSymbol(moduleName, this.symbolTypes.IMPORT, this.nodeToRange(node), {
          signature: `import ${moduleName}`,
          source: moduleName
        }));
      }
    } else if (node.type === 'import_from_statement') {
      // from module import name1, name2
      const moduleNode = this.getChildForFieldName(node, 'module_name');
      const moduleName = moduleNode ? this.getNodeText(moduleNode, text) : null;
      
      // Find imported names
      node.children.forEach(child => {
        if (child.type === 'dotted_name' || child.type === 'identifier') {
          // Check if this is an imported name (not the module name)
          if (child !== moduleNode && child.previousSibling?.type === 'import') {
            const name = this.getNodeText(child, text);
            symbols.push(this.createSymbol(name, this.symbolTypes.IMPORT, this.nodeToRange(child), {
              signature: `from ${moduleName || '?'} import ${name}`,
              source: moduleName,
              importedName: name
            }));
          }
        }
      });
    }
    
    return symbols.length === 1 ? symbols[0] : symbols;
  }

  extractParameters(node, text) {
    const params = [];
    const parametersNode = this.getChildForFieldName(node, 'parameters');
    
    if (parametersNode) {
      parametersNode.children.forEach(child => {
        if (child.type === 'identifier') {
          const name = this.getNodeText(child, text);
          // Skip 'self' parameter for methods
          if (name !== 'self') {
            params.push({
              name,
              type: 'Any'
            });
          }
        } else if (child.type === 'default_parameter') {
          const nameNode = this.getChildForFieldName(child, 'name');
          if (nameNode) {
            params.push({
              name: this.getNodeText(nameNode, text),
              type: 'Any',
              default: true
            });
          }
        } else if (child.type === 'list_splat_pattern') {
          // *args
          const nameNode = child.children.find(c => c.type === 'identifier');
          if (nameNode) {
            params.push({
              name: this.getNodeText(nameNode, text),
              type: 'Any',
              rest: true
            });
          }
        } else if (child.type === 'dictionary_splat_pattern') {
          // **kwargs
          const nameNode = child.children.find(c => c.type === 'identifier');
          if (nameNode) {
            params.push({
              name: this.getNodeText(nameNode, text),
              type: 'Any',
              kwargs: true
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
        if (child.type === 'function_definition') {
          const method = this.extractFunction(child, text);
          if (method) {
            methods.push(method);
          }
        }
      });
    }
    
    return methods;
  }

  extractBaseClasses(node, text) {
    const baseClasses = [];
    const superclassesNode = this.getChildForFieldName(node, 'superclasses');
    
    if (superclassesNode) {
      superclassesNode.children.forEach(child => {
        if (child.type === 'identifier' || child.type === 'attribute') {
          baseClasses.push(this.getNodeText(child, text));
        }
      });
    }
    
    return baseClasses;
  }

  buildFunctionSignature(name, params, isAsync) {
    const asyncPrefix = isAsync ? 'async ' : '';
    const paramString = params.map(p => {
      let param = p.name;
      if (p.rest) param = '*' + param;
      if (p.kwargs) param = '**' + param;
      if (p.default) param += '=...';
      return param;
    }).join(', ');
    
    return `${asyncPrefix}def ${name}(${paramString}):`;
  }

  buildClassSignature(name, baseClasses) {
    const baseString = baseClasses.length > 0 ? `(${baseClasses.join(', ')})` : '';
    return `class ${name}${baseString}:`;
  }

  isAsyncFunction(node, text) {
    // Check if function has 'async' decorator
    const decorators = this.getChildForFieldName(node, 'decorators');
    if (decorators) {
      return decorators.children.some(decorator => 
        this.getNodeText(decorator, text).includes('async')
      );
    }
    
    // Check if 'async' appears before 'def'
    const prevSibling = node.previousSibling;
    return prevSibling && this.getNodeText(prevSibling, text) === 'async';
  }

  isInsideClass(node) {
    let current = node.parent;
    while (current) {
      if (current.type === 'class_definition') {
        return true;
      }
      current = current.parent;
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
      // For common patterns, try to find the right child
      switch (fieldName) {
        case 'name':
          // Look for identifier nodes that could be names
          return node.children.find(child => 
            child.type === 'identifier' || child.type === 'dotted_name'
          );
        case 'parameters':
          // Look for parameters node
          return node.children.find(child => 
            child.type === 'parameters'
          );
        case 'body':
          // Look for block or suite
          return node.children.find(child => 
            child.type === 'block' || child.type === 'suite'
          );
        case 'left':
          // For assignments, first child is usually left side
          return node.children[0];
        case 'module_name':
          // For import statements, look for dotted_name or identifier
          return node.children.find(child => 
            child.type === 'dotted_name' || child.type === 'identifier'
          );
        case 'superclasses':
          // Look for argument_list in class definitions
          return node.children.find(child => 
            child.type === 'argument_list'
          );
        case 'decorators':
          // Look for decorator nodes
          return node.children.find(child => 
            child.type === 'decorator'
          );
        default:
          return null;
      }
    }
    
    return null;
  }
}

module.exports = PythonExtractor;
