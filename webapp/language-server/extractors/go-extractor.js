// Go symbol extractor
const BaseExtractor = require('./base-extractor');

class GoExtractor extends BaseExtractor {
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
      case 'function_declaration':
      case 'method_declaration':
        return this.extractFunction(node, text);
      case 'type_declaration':
        return this.extractType(node, text);
      case 'var_declaration':
      case 'const_declaration':
        return this.extractVariable(node, text);
      case 'import_declaration':
        return this.extractImport(node, text);
      case 'package_clause':
        return this.extractPackage(node, text);
      default:
        return null;
    }
  }

  extractFunction(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const params = this.extractParameters(node, text);
    const returnType = this.extractReturnType(node, text);
    const isMethod = node.type === 'method_declaration';
    const receiver = isMethod ? this.extractReceiver(node, text) : null;
    
    const symbolType = isMethod ? this.symbolTypes.METHOD : this.symbolTypes.FUNCTION;
    
    return this.createSymbol(name, symbolType, this.nodeToRange(node), {
      signature: this.buildFunctionSignature(name, params, returnType, receiver),
      params,
      returnType,
      receiver
    });
  }

  extractType(node, text) {
    const symbols = [];
    
    // Go type declarations can define multiple types
    node.children.forEach(child => {
      if (child.type === 'type_spec') {
        const nameNode = this.getChildForFieldName(child, 'name');
        const typeNode = this.getChildForFieldName(child, 'type');
        
        if (nameNode) {
          const name = this.getNodeText(nameNode, text);
          const type = typeNode ? this.getNodeText(typeNode, text) : 'interface{}';
          
          // Determine if this is a struct, interface, or other type
          let symbolType = this.symbolTypes.CLASS;
          if (typeNode) {
            if (typeNode.type === 'struct_type') {
              symbolType = this.symbolTypes.CLASS;
            } else if (typeNode.type === 'interface_type') {
              symbolType = this.symbolTypes.INTERFACE;
            }
          }
          
          symbols.push(this.createSymbol(name, symbolType, this.nodeToRange(child), {
            signature: `type ${name} ${type}`
          }));
        }
      }
    });
    
    return symbols.length === 1 ? symbols[0] : symbols;
  }

  extractVariable(node, text) {
    const symbols = [];
    const isConst = node.type === 'const_declaration';
    
    node.children.forEach(child => {
      if (child.type === 'var_spec' || child.type === 'const_spec') {
        const nameNodes = this.findChildrenByType(child, 'identifier');
        const typeNode = this.getChildForFieldName(child, 'type');
        const type = typeNode ? this.getNodeText(typeNode, text) : 'interface{}';
        
        nameNodes.forEach(nameNode => {
          const name = this.getNodeText(nameNode, text);
          const symbolType = isConst ? this.symbolTypes.CONSTANT : this.symbolTypes.VARIABLE;
          
          symbols.push(this.createSymbol(name, symbolType, this.nodeToRange(nameNode), {
            signature: `${isConst ? 'const' : 'var'} ${name} ${type}`
          }));
        });
      }
    });
    
    return symbols.length === 1 ? symbols[0] : symbols;
  }

  extractImport(node, text) {
    const symbols = [];
    
    node.children.forEach(child => {
      if (child.type === 'import_spec') {
        const pathNode = this.getChildForFieldName(child, 'path');
        const nameNode = this.getChildForFieldName(child, 'name');
        
        if (pathNode) {
          let importPath = this.getNodeText(pathNode, text);
          importPath = importPath.replace(/['"]/g, ''); // Remove quotes
          
          const parts = importPath.split('/');
          const packageName = nameNode ? 
            this.getNodeText(nameNode, text) : 
            parts[parts.length - 1];
          
          symbols.push(this.createSymbol(packageName, this.symbolTypes.IMPORT, this.nodeToRange(child), {
            signature: `import ${importPath}`,
            source: importPath
          }));
        }
      }
    });
    
    return symbols.length === 1 ? symbols[0] : symbols;
  }

  extractPackage(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    
    return this.createSymbol(name, this.symbolTypes.MODULE, this.nodeToRange(node), {
      signature: `package ${name}`
    });
  }

  extractParameters(node, text) {
    const params = [];
    const parametersNode = this.getChildForFieldName(node, 'parameters');
    
    if (parametersNode) {
      parametersNode.children.forEach(child => {
        if (child.type === 'parameter_declaration') {
          const nameNodes = this.findChildrenByType(child, 'identifier');
          const typeNode = this.getChildForFieldName(child, 'type');
          const type = typeNode ? this.getNodeText(typeNode, text) : 'interface{}';
          
          nameNodes.forEach(nameNode => {
            params.push({
              name: this.getNodeText(nameNode, text),
              type
            });
          });
        }
      });
    }
    
    return params;
  }

  extractReturnType(node, text) {
    const resultNode = this.getChildForFieldName(node, 'result');
    if (!resultNode) return 'void';
    
    // Handle multiple return values
    if (resultNode.type === 'parameter_list') {
      const types = [];
      resultNode.children.forEach(child => {
        if (child.type === 'parameter_declaration') {
          const typeNode = this.getChildForFieldName(child, 'type');
          if (typeNode) {
            types.push(this.getNodeText(typeNode, text));
          }
        }
      });
      return types.length > 1 ? `(${types.join(', ')})` : types[0] || 'void';
    }
    
    return this.getNodeText(resultNode, text);
  }

  extractReceiver(node, text) {
    const receiverNode = this.getChildForFieldName(node, 'receiver');
    if (!receiverNode) return null;
    
    const paramNode = receiverNode.children.find(child => 
      child.type === 'parameter_declaration'
    );
    
    if (paramNode) {
      const nameNode = this.getChildForFieldName(paramNode, 'name');
      const typeNode = this.getChildForFieldName(paramNode, 'type');
      
      return {
        name: nameNode ? this.getNodeText(nameNode, text) : '',
        type: typeNode ? this.getNodeText(typeNode, text) : ''
      };
    }
    
    return null;
  }

  buildFunctionSignature(name, params, returnType, receiver) {
    let signature = 'func ';
    
    if (receiver) {
      signature += `(${receiver.name} ${receiver.type}) `;
    }
    
    const paramString = params.map(p => `${p.name} ${p.type}`).join(', ');
    signature += `${name}(${paramString})`;
    
    if (returnType && returnType !== 'void') {
      signature += ` ${returnType}`;
    }
    
    return signature;
  }

  findChildrenByType(node, type) {
    const children = [];
    node.children.forEach(child => {
      if (child.type === type) {
        children.push(child);
      }
    });
    return children;
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
            child.type === 'identifier' || child.type === 'type_identifier'
          );
        case 'parameters':
          // Look for parameter_list
          return node.children.find(child =>
            child.type === 'parameter_list'
          );
        case 'result':
          // Look for parameter_list or type after parameters
          const paramIndex = node.children.findIndex(child => child.type === 'parameter_list');
          if (paramIndex >= 0 && paramIndex < node.children.length - 1) {
            return node.children[paramIndex + 1];
          }
          return null;
        case 'receiver':
          // Look for parameter_list before function name
          return node.children.find(child =>
            child.type === 'parameter_list' && child.children.length === 1
          );
        case 'type':
          // Look for type nodes
          return node.children.find(child =>
            child.type.includes('type') || child.type === 'struct_type' || child.type === 'interface_type'
          );
        case 'path':
          // Look for interpreted_string_literal
          return node.children.find(child =>
            child.type === 'interpreted_string_literal' || child.type === 'raw_string_literal'
          );
        default:
          return null;
      }
    }
    
    return null;
  }
}

module.exports = GoExtractor;
