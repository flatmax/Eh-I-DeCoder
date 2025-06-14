// C/C++ symbol extractor
const BaseExtractor = require('./base-extractor');

class CppExtractor extends BaseExtractor {
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
      case 'function_declarator':
        return this.extractFunction(node, text);
      case 'class_specifier':
      case 'struct_specifier':
        return this.extractClass(node, text);
      case 'declaration':
        return this.extractDeclaration(node, text);
      case 'preproc_include':
        return this.extractInclude(node, text);
      case 'namespace_definition':
        return this.extractNamespace(node, text);
      default:
        return null;
    }
  }

  extractFunction(node, text) {
    let nameNode = null;
    let returnTypeNode = null;
    
    // For function_definition, find the declarator
    if (node.type === 'function_definition') {
      const declarator = this.getChildForFieldName(node, 'declarator');
      if (declarator && declarator.type === 'function_declarator') {
        nameNode = this.getChildForFieldName(declarator, 'declarator');
        returnTypeNode = this.getChildForFieldName(node, 'type');
      }
    } else if (node.type === 'function_declarator') {
      nameNode = this.getChildForFieldName(node, 'declarator');
      returnTypeNode = node.parent?.childForFieldName ? this.getChildForFieldName(node.parent, 'type') : null;
    }
    
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const params = this.extractParameters(node, text);
    const returnType = returnTypeNode ? this.getNodeText(returnTypeNode, text) : 'void';
    
    return this.createSymbol(name, this.symbolTypes.FUNCTION, this.nodeToRange(node), {
      signature: this.buildFunctionSignature(name, params, returnType),
      params,
      returnType
    });
  }

  extractClass(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const isStruct = node.type === 'struct_specifier';
    const methods = this.extractClassMethods(node, text);
    
    return this.createSymbol(name, this.symbolTypes.CLASS, this.nodeToRange(node), {
      signature: `${isStruct ? 'struct' : 'class'} ${name}`,
      methods: methods.map(m => m.name)
    });
  }

  extractDeclaration(node, text) {
    const symbols = [];
    
    // Look for variable declarations
    node.children.forEach(child => {
      if (child.type === 'init_declarator') {
        const declarator = this.getChildForFieldName(child, 'declarator');
        if (declarator && declarator.type === 'identifier') {
          const name = this.getNodeText(declarator, text);
          const typeNode = this.getChildForFieldName(node, 'type');
          const type = typeNode ? this.getNodeText(typeNode, text) : 'auto';
          
          symbols.push(this.createSymbol(name, this.symbolTypes.VARIABLE, this.nodeToRange(child), {
            signature: `${type} ${name}`,
            returnType: type
          }));
        }
      }
    });
    
    return symbols.length === 1 ? symbols[0] : symbols;
  }

  extractInclude(node, text) {
    const pathNode = this.getChildForFieldName(node, 'path');
    if (!pathNode) return null;
    
    const path = this.getNodeText(pathNode, text);
    const filename = path.replace(/[<>"]/g, '');
    
    return this.createSymbol(filename, this.symbolTypes.IMPORT, this.nodeToRange(node), {
      signature: `#include ${path}`,
      source: filename
    });
  }

  extractNamespace(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    
    return this.createSymbol(name, this.symbolTypes.NAMESPACE, this.nodeToRange(node), {
      signature: `namespace ${name}`
    });
  }

  extractParameters(node, text) {
    const params = [];
    const parametersNode = this.getChildForFieldName(node, 'parameters');
    
    if (parametersNode) {
      parametersNode.children.forEach(child => {
        if (child.type === 'parameter_declaration') {
          const typeNode = this.getChildForFieldName(child, 'type');
          const declaratorNode = this.getChildForFieldName(child, 'declarator');
          
          if (declaratorNode) {
            const name = this.getNodeText(declaratorNode, text);
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

  extractClassMethods(node, text) {
    const methods = [];
    const bodyNode = this.getChildForFieldName(node, 'body');
    
    if (bodyNode) {
      bodyNode.children.forEach(child => {
        if (child.type === 'function_definition') {
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

  buildFunctionSignature(name, params, returnType)  {
    const paramString = params.map(p => `${p.type} ${p.name}`).join(', ');
    return `${returnType} ${name}(${paramString})`;
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
        case 'declarator':
          // Look for declarator nodes
          return node.children.find(child => 
            child.type === 'function_declarator' || child.type === 'identifier'
          );
        case 'parameters':
          // Look for parameter_list
          return node.children.find(child => 
            child.type === 'parameter_list'
          );
        case 'body':
          // Look for compound_statement or field_declaration_list
          return node.children.find(child => 
            child.type === 'compound_statement' || child.type === 'field_declaration_list'
          );
        case 'type':
          // Look for type specifiers
          return node.children.find(child => 
            child.type.includes('type') || child.type === 'primitive_type'
          );
        case 'path':
          // Look for string literals or system_lib_string
          return node.children.find(child => 
            child.type === 'string_literal' || child.type === 'system_lib_string'
          );
        default:
          return null;
      }
    }
    
    return null;
  }
}

module.exports = CppExtractor;
