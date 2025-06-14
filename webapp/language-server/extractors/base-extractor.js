// Base extractor class for symbol extraction
class BaseExtractor {
  constructor() {
    this.symbolTypes = {
      FUNCTION: 'function',
      METHOD: 'method',
      CLASS: 'class',
      VARIABLE: 'variable',
      CONSTANT: 'constant',
      FIELD: 'field',
      IMPORT: 'import',
      INTERFACE: 'interface',
      ENUM: 'enum',
      NAMESPACE: 'namespace',
      MODULE: 'module'
    };
  }

  extract(tree, text) {
    throw new Error('extract method must be implemented by subclass');
  }

  createSymbol(name, type, range, options = {}) {
    return {
      name,
      type,
      kind: this.getSymbolKind(type),
      range,
      location: {
        start: range.start,
        end: range.end
      },
      signature: options.signature || null,
      params: options.params || [],
      returnType: options.returnType || null,
      async: options.async || false,
      static: options.static || false,
      generator: options.generator || false,
      source: options.source || null,
      importedName: options.importedName || null,
      methods: options.methods || [],
      fields: options.fields || []
    };
  }

  getSymbolKind(type) {
    const kindMap = {
      function: 'Function',
      method: 'Method',
      class: 'Class',
      variable: 'Variable',
      constant: 'Constant',
      field: 'Field',
      import: 'Module',
      interface: 'Interface',
      enum: 'Enum',
      namespace: 'Namespace',
      module: 'Module'
    };
    return kindMap[type] || 'Variable';
  }

  nodeToRange(node) {
    return {
      start: {
        line: node.startPosition.row,
        character: node.startPosition.column
      },
      end: {
        line: node.endPosition.row,
        character: node.endPosition.column
      }
    };
  }

  getNodeText(node, text) {
    return text.substring(node.startIndex, node.endIndex);
  }

  walkTree(cursor, callback) {
    callback(cursor.currentNode);
    
    if (cursor.gotoFirstChild()) {
      do {
        this.walkTree(cursor, callback);
      } while (cursor.gotoNextSibling());
      cursor.gotoParent();
    }
  }

  findNodesByType(tree, nodeType) {
    const nodes = [];
    const cursor = tree.walk();
    
    this.walkTree(cursor, (node) => {
      if (node.type === nodeType) {
        nodes.push(node);
      }
    });
    
    return nodes;
  }

  findNodesByTypes(tree, nodeTypes) {
    const nodes = [];
    const cursor = tree.walk();
    const typeSet = new Set(nodeTypes);
    
    this.walkTree(cursor, (node) => {
      if (typeSet.has(node.type)) {
        nodes.push(node);
      }
    });
    
    return nodes;
  }
}

module.exports = BaseExtractor;
