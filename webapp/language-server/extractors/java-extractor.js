// Java symbol extractor
const BaseExtractor = require('./base-extractor');

class JavaExtractor extends BaseExtractor {
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
      case 'method_declaration':
        return this.extractMethod(node, text);
      case 'class_declaration':
        return this.extractClass(node, text);
      case 'interface_declaration':
        return this.extractInterface(node, text);
      case 'field_declaration':
        return this.extractField(node, text);
      case 'variable_declarator':
        return this.extractVariable(node, text);
      case 'import_declaration':
        return this.extractImport(node, text);
      case 'package_declaration':
        return this.extractPackage(node, text);
      default:
        return null;
    }
  }

  extractMethod(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const params = this.extractParameters(node, text);
    const returnTypeNode = this.getChildForFieldName(node, 'type');
    const returnType = returnTypeNode ? this.getNodeText(returnTypeNode, text) : 'void';
    const modifiers = this.extractModifiers(node, text);
    
    return this.createSymbol(name, this.symbolTypes.METHOD, this.nodeToRange(node), {
      signature: this.buildMethodSignature(name, params, returnType, modifiers),
      params,
      returnType,
      static: modifiers.includes('static'),
      visibility: this.getVisibility(modifiers)
    });
  }

  extractClass(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const methods = this.extractClassMethods(node, text);
    const fields = this.extractClassFields(node, text);
    const modifiers = this.extractModifiers(node, text);
    const superclass = this.extractSuperclass(node, text);
    const interfaces = this.extractInterfaces(node, text);
    
    return this.createSymbol(name, this.symbolTypes.CLASS, this.nodeToRange(node), {
      signature: this.buildClassSignature(name, superclass, interfaces, modifiers),
      methods: methods.map(m => m.name),
      fields: fields.map(f => f.name),
      visibility: this.getVisibility(modifiers)
    });
  }

  extractInterface(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const methods = this.extractInterfaceMethods(node, text);
    const modifiers = this.extractModifiers(node, text);
    
    return this.createSymbol(name, this.symbolTypes.INTERFACE, this.nodeToRange(node), {
      signature: `interface ${name}`,
      methods: methods.map(m => m.name),
      visibility: this.getVisibility(modifiers)
    });
  }

  extractField(node, text) {
    const symbols = [];
    const typeNode = this.getChildForFieldName(node, 'type');
    const type = typeNode ? this.getNodeText(typeNode, text) : 'Object';
    const modifiers = this.extractModifiers(node, text);
    
    // A field declaration can declare multiple variables
    node.children.forEach(child => {
      if (child.type === 'variable_declarator') {
        const nameNode = this.getChildForFieldName(child, 'name');
        if (nameNode) {
          const name = this.getNodeText(nameNode, text);
          symbols.push(this.createSymbol(name, this.symbolTypes.FIELD, this.nodeToRange(child), {
            signature: `${type} ${name}`,
            returnType: type,
            static: modifiers.includes('static'),
            final: modifiers.includes('final'),
            visibility: this.getVisibility(modifiers)
          }));
        }
      }
    });
    
    return symbols.length === 1 ? symbols[0] : symbols;
  }

  extractVariable(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    
    // Try to get type from parent declaration
    let type = 'Object';
    const parent = node.parent;
    if (parent) {
      const typeNode = this.getChildForFieldName(parent, 'type');
      if (typeNode) {
        type = this.getNodeText(typeNode, text);
      }
    }
    
    return this.createSymbol(name, this.symbolTypes.VARIABLE, this.nodeToRange(node), {
      signature: `${type} ${name}`,
      returnType: type
    });
  }

  extractImport(node, text) {
    const nameNode = node.children.find(child => 
      child.type === 'scoped_identifier' || child.type === 'identifier'
    );
    
    if (!nameNode) return null;
    
    const fullImport = this.getNodeText(nameNode, text);
    const parts = fullImport.split('.');
    const name = parts[parts.length - 1];
    
    return this.createSymbol(name, this.symbolTypes.IMPORT, this.nodeToRange(node), {
      signature: `import ${fullImport}`,
      source: fullImport,
      importedName: name
    });
  }

  extractPackage(node, text) {
    const nameNode = node.children.find(child => 
      child.type === 'scoped_identifier' || child.type === 'identifier'
    );
    
    if (!nameNode) return null;
    
    const packageName = this.getNodeText(nameNode, text);
    
    return this.createSymbol(packageName, this.symbolTypes.MODULE, this.nodeToRange(node), {
      signature: `package ${packageName}`
    });
  }

  extractParameters(node, text) {
    const params = [];
    const parametersNode = this.getChildForFieldName(node, 'parameters');
    
    if (parametersNode) {
      parametersNode.children.forEach(child => {
        if (child.type === 'formal_parameter') {
          const typeNode = this.getChildForFieldName(child, 'type');
          const nameNode = this.getChildForFieldName(child, 'name');
          
          if (nameNode) {
            const name = this.getNodeText(nameNode, text);
            const type = typeNode ? this.getNodeText(typeNode, text) : 'Object';
            
            params.push({
              name,
              type
            });
          }
        }
      });
    }
    
    return params;
  }

  extractModifiers(node, text) {
    const modifiers = [];
    const modifiersNode = this.getChildForFieldName(node, 'modifiers');
    
    if (modifiersNode) {
      modifiersNode.children.forEach(child => {
        if (child.type === 'modifier') {
          modifiers.push(this.getNodeText(child, text));
        }
      });
    }
    
    return modifiers;
  }

  extractSuperclass(node, text) {
    const superclassNode = this.getChildForFieldName(node, 'superclass');
    return superclassNode ? this.getNodeText(superclassNode, text) : null;
  }

  extractInterfaces(node, text) {
    const interfaces = [];
    const interfacesNode = this.getChildForFieldName(node, 'interfaces');
    
    if (interfacesNode) {
      interfacesNode.children.forEach(child => {
        if (child.type === 'type_identifier') {
          interfaces.push(this.getNodeText(child, text));
        }
      });
    }
    
    return interfaces;
  }

  extractClassMethods(node, text) {
    const methods = [];
    const bodyNode = this.getChildForFieldName(node, 'body');
    
    if (bodyNode) {
      bodyNode.children.forEach(child => {
        if (child.type === 'method_declaration') {
          const method = this.extractMethod(child, text);
          if (method) {
            methods.push(method);
          }
        }
      });
    }
    
    return methods;
  }

  extractClassFields(node, text) {
    const fields = [];
    const bodyNode = this.getChildForFieldName(node, 'body');
    
    if (bodyNode) {
      bodyNode.children.forEach(child => {
        if (child.type === 'field_declaration') {
          const fieldSymbols = this.extractField(child, text);
          if (Array.isArray(fieldSymbols)) {
            fields.push(...fieldSymbols);
          } else if (fieldSymbols) {
            fields.push(fieldSymbols);
          }
        }
      });
    }
    
    return fields;
  }

  extractInterfaceMethods(node, text) {
    const methods = [];
    const bodyNode = this.getChildForFieldName(node, 'body');
    
    if (bodyNode) {
      bodyNode.children.forEach(child => {
        if (child.type === 'method_declaration') {
          const method = this.extractMethod(child, text);
          if (method) {
            methods.push(method);
          }
        }
      });
    }
    
    return methods;
  }

  buildMethodSignature(name, params, returnType, modifiers) {
    const modifierString = modifiers.length > 0 ? modifiers.join(' ') + ' ' : '';
    const paramString = params.map(p => `${p.type} ${p.name}`).join(', ');
    return `${modifierString}${returnType} ${name}(${paramString})`;
  }

  buildClassSignature(name, superclass, interfaces, modifiers) {
    const modifierString = modifiers.length > 0 ? modifiers.join(' ') + ' ' : '';
    let signature = `${modifierString}class ${name}`;
    
    if (superclass) {
      signature += ` extends ${superclass}`;
    }
    
    if (interfaces.length > 0) {
      signature += ` implements ${interfaces.join(', ')}`;
    }
    
    return signature;
  }

  getVisibility(modifiers) {
    if (modifiers.includes('public')) return 'public';
    if (modifiers.includes('private')) return 'private';
    if (modifiers.includes('protected')) return 'protected';
    return 'package';
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
          // Look for formal_parameters
          return node.children.find(child =>
            child.type === 'formal_parameters'
          );
        case 'body':
          // Look for class_body or block
          return node.children.find(child =>
            child.type === 'class_body' || child.type === 'block'
          );
        case 'type':
          // Look for type nodes
          return node.children.find(child =>
            child.type.includes('type') || child.type === 'void_type'
          );
        case 'modifiers':
          // Look for modifiers node
          return node.children.find(child =>
            child.type === 'modifiers'
          );
        case 'superclass':
          // Look for superclass node
          return node.children.find(child =>
            child.type === 'superclass'
          );
        case 'interfaces':
          // Look for super_interfaces node
          return node.children.find(child =>
            child.type === 'super_interfaces'
          );
        default:
          return null;
      }
    }
    
    return null;
  }
}

module.exports = JavaExtractor;
