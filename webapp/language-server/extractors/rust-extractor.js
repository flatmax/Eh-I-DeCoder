// Rust symbol extractor
const BaseExtractor = require('./base-extractor');

class RustExtractor extends BaseExtractor {
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
      case 'function_item':
        return this.extractFunction(node, text);
      case 'struct_item':
        return this.extractStruct(node, text);
      case 'enum_item':
        return this.extractEnum(node, text);
      case 'trait_item':
        return this.extractTrait(node, text);
      case 'impl_item':
        return this.extractImpl(node, text);
      case 'let_declaration':
        return this.extractVariable(node, text);
      case 'const_item':
      case 'static_item':
        return this.extractConstant(node, text);
      case 'use_declaration':
        return this.extractUse(node, text);
      case 'mod_item':
        return this.extractModule(node, text);
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
    const visibility = this.extractVisibility(node, text);
    const isAsync = this.hasModifier(node, 'async');
    const isUnsafe = this.hasModifier(node, 'unsafe');
    
    return this.createSymbol(name, this.symbolTypes.FUNCTION, this.nodeToRange(node), {
      signature: this.buildFunctionSignature(name, params, returnType, visibility, isAsync, isUnsafe),
      params,
      returnType,
      async: isAsync,
      visibility
    });
  }

  extractStruct(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const fields = this.extractStructFields(node, text);
    const visibility = this.extractVisibility(node, text);
    
    return this.createSymbol(name, this.symbolTypes.CLASS, this.nodeToRange(node), {
      signature: `struct ${name}`,
      fields: fields.map(f => f.name),
      visibility
    });
  }

  extractEnum(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const variants = this.extractEnumVariants(node, text);
    const visibility = this.extractVisibility(node, text);
    
    return this.createSymbol(name, this.symbolTypes.ENUM, this.nodeToRange(node), {
      signature: `enum ${name}`,
      variants,
      visibility
    });
  }

  extractTrait(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const methods = this.extractTraitMethods(node, text);
    const visibility = this.extractVisibility(node, text);
    
    return this.createSymbol(name, this.symbolTypes.INTERFACE, this.nodeToRange(node), {
      signature: `trait ${name}`,
      methods: methods.map(m => m.name),
      visibility
    });
  }

  extractImpl(node, text) {
    // Implementation blocks don't create symbols themselves,
    // but we could extract the methods within them
    const methods = this.extractImplMethods(node, text);
    return methods;
  }

  extractVariable(node, text) {
    const patternNode = this.getChildForFieldName(node, 'pattern');
    if (!patternNode || patternNode.type !== 'identifier') return null;
    
    const name = this.getNodeText(patternNode, text);
    const typeNode = this.getChildForFieldName(node, 'type');
    const type = typeNode ? this.getNodeText(typeNode, text) : 'auto';
    const isMutable = this.hasModifier(patternNode, 'mut');
    
    return this.createSymbol(name, this.symbolTypes.VARIABLE, this.nodeToRange(node), {
      signature: `let ${isMutable ? 'mut ' : ''}${name}: ${type}`,
      returnType: type,
      mutable: isMutable
    });
  }

  extractConstant(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const typeNode = this.getChildForFieldName(node, 'type');
    const type = typeNode ? this.getNodeText(typeNode, text) : 'auto';
    const visibility = this.extractVisibility(node, text);
    const isStatic = node.type === 'static_item';
    
    return this.createSymbol(name, this.symbolTypes.CONSTANT, this.nodeToRange(node), {
      signature: `${isStatic ? 'static' : 'const'} ${name}: ${type}`,
      returnType: type,
      static: isStatic,
      visibility
    });
  }

  extractUse(node, text) {
    const symbols = [];
    
    // Extract imported items from use declarations
    const useTree = this.getChildForFieldName(node, 'argument');
    if (useTree) {
      this.extractUseItems(useTree, text, symbols);
    }
    
    return symbols.length === 1 ? symbols[0] : symbols;
  }

  extractModule(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const visibility = this.extractVisibility(node, text);
    
    return this.createSymbol(name, this.symbolTypes.MODULE, this.nodeToRange(node), {
      signature: `mod ${name}`,
      visibility
    });
  }

  extractParameters(node, text) {
    const params = [];
    const parametersNode = this.getChildForFieldName(node, 'parameters');
    
    if (parametersNode) {
      parametersNode.children.forEach(child => {
        if (child.type === 'parameter') {
          const patternNode = this.getChildForFieldName(child, 'pattern');
          const typeNode = this.getChildForFieldName(child, 'type');
          
          if (patternNode && patternNode.type === 'identifier') {
            const name = this.getNodeText(patternNode, text);
            const type = typeNode ? this.getNodeText(typeNode, text) : 'auto';
            
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

  extractReturnType(node, text) {
    const returnTypeNode = this.getChildForFieldName(node, 'return_type');
    if (!returnTypeNode) return '()';
    
    return this.getNodeText(returnTypeNode, text);
  }

  extractVisibility(node, text) {
    const visibilityNode = this.getChildForFieldName(node, 'visibility_modifier');
    if (!visibilityNode) return 'private';
    
    const visibility = this.getNodeText(visibilityNode, text);
    return visibility.includes('pub') ? 'public' : 'private';
  }

  extractStructFields(node, text) {
    const fields = [];
    const bodyNode = this.getChildForFieldName(node, 'body');
    
    if (bodyNode) {
      bodyNode.children.forEach(child => {
        if (child.type === 'field_declaration') {
          const nameNode = this.getChildForFieldName(child, 'name');
          const typeNode = this.getChildForFieldName(child, 'type');
          
          if (nameNode) {
            fields.push({
              name: this.getNodeText(nameNode, text),
              type: typeNode ? this.getNodeText(typeNode, text) : 'auto'
            });
          }
        }
      });
    }
    
    return fields;
  }

  extractEnumVariants(node, text) {
    const variants = [];
    const bodyNode = this.getChildForFieldName(node, 'body');
    
    if (bodyNode) {
      bodyNode.children.forEach(child => {
        if (child.type === 'enum_variant') {
          const nameNode = this.getChildForFieldName(child, 'name');
          if (nameNode) {
            variants.push(this.getNodeText(nameNode, text));
          }
        }
      });
    }
    
    return variants;
  }

  extractTraitMethods(node, text) {
    const methods = [];
    const bodyNode = this.getChildForFieldName(node, 'body');
    
    if (bodyNode) {
      bodyNode.children.forEach(child => {
        if (child.type === 'function_signature_item') {
          const method = this.extractFunction(child, text);
          if (method) {
            method.type = this.symbolTypes.METHOD;
            methods.push(method);
          }
        }
      });
    }
    
    return methods;
  }

  extractImplMethods(node, text) {
    const methods = [];
    const bodyNode = this.getChildForFieldName(node, 'body');
    
    if (bodyNode) {
      bodyNode.children.forEach(child => {
        if (child.type === 'function_item') {
          const method = this.extractFunction(child, text);
          if (method) {
            method.type = this.symbolTypes.METHOD;
            methods.push(method);
          }
        }
      });
    }
    
    return methods;
  }

  extractUseItems(node, text, symbols) {
    if (node.type === 'identifier') {
      const name = this.getNodeText(node, text);
      symbols.push(this.createSymbol(name, this.symbolTypes.IMPORT, this.nodeToRange(node), {
        signature: `use ${name}`,
        source: name
      }));
    } else if (node.type === 'scoped_identifier') {
      const name = this.getNodeText(node, text);
      const parts = name.split('::');
      const importName = parts[parts.length - 1];
      
      symbols.push(this.createSymbol(importName, this.symbolTypes.IMPORT, this.nodeToRange(node), {
        signature: `use ${name}`,
        source: name
      }));
    } else if (node.type === 'use_list') {
      node.children.forEach(child => {
        this.extractUseItems(child, text, symbols);
      });
    }
  }

  buildFunctionSignature(name, params, returnType, visibility, isAsync, isUnsafe) {
    let signature = '';
    
    if (visibility === 'public') signature += 'pub ';
    if (isUnsafe) signature += 'unsafe ';
    if (isAsync) signature += 'async ';
    
    signature += 'fn ';
    
    const paramString = params.map(p => `${p.name}: ${p.type}`).join(', ');
    signature += `${name}(${paramString})`;
    
    if (returnType && returnType !== '()') {
      signature += ` -> ${returnType}`;
    }
    
    return signature;
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
            child.type === 'identifier' || child.type === 'type_identifier'
          );
        case 'parameters':
          // Look for parameters node
          return node.children.find(child =>
            child.type === 'parameters'
          );
        case 'body':
          // Look for declaration_list or block
          return node.children.find(child =>
            child.type === 'declaration_list' || child.type === 'block' || child.type === 'enum_variant_list'
          );
        case 'type':
          // Look for type nodes
          return node.children.find(child =>
            child.type.includes('type') || child.type === 'primitive_type'
          );
        case 'pattern':
          // Look for identifier or pattern nodes
          return node.children.find(child =>
            child.type === 'identifier' || child.type.includes('pattern')
          );
        case 'return_type':
          // Look for type after -> arrow
          const arrowIndex = node.children.findIndex(child => child.type === '->' || this.getNodeText(child, node.tree?.rootNode?.text || '') === '->');
          if (arrowIndex >= 0 && arrowIndex < node.children.length - 1) {
            return node.children[arrowIndex + 1];
          }
          return null;
        case 'visibility_modifier':
          // Look for visibility_modifier node
          return node.children.find(child =>
            child.type === 'visibility_modifier'
          );
        case 'argument':
          // Look for use_tree or scoped_identifier
          return node.children.find(child =>
            child.type === 'use_tree' || child.type === 'scoped_identifier' || child.type === 'identifier'
          );
        default:
          return null;
      }
    }
    
    return null;
  }
}

module.exports = RustExtractor;
