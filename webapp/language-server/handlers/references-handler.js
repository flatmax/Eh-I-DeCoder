// References request handler with tree-sitter support
const BaseHandler = require('./base-handler');

class ReferencesHandler extends BaseHandler {
  handle(ws, id, params) {
    const { textDocument, position, context } = params;
    const doc = this.documentManager.getDocument(textDocument.uri);
    
    console.log(`Looking for references at ${textDocument.uri}, line ${position.line + 1}, char ${position.character}`);
    
    if (!doc) {
      this.sendResponse(ws, id, []);
      return;
    }
    
    const { word } = this.getWordAtPosition(doc, position);
    console.log(`Finding references for: "${word}"`);
    
    const references = this.findReferences(word, textDocument, doc, context?.includeDeclaration);
    console.log(`Found ${references.length} references`);
    this.sendResponse(ws, id, references);
  }

  findReferences(word, textDocument, doc, includeDeclaration = true) {
    const symbolAnalyzer = this.documentManager.getSymbolAnalyzer();
    const tree = symbolAnalyzer.getTree(textDocument.uri);
    
    if (!tree) {
      // Fallback to text-based search if no tree available
      return this.findTextReferences(word, textDocument, doc);
    }
    
    const text = doc.getText();
    const references = [];
    const definitions = [];
    
    // Use tree-sitter to find all references
    const cursor = tree.walk();
    this.findReferenceNodes(cursor, word, text, references, definitions);
    
    // Filter based on includeDeclaration
    let results = references;
    if (!includeDeclaration) {
      // Remove definitions from results
      results = references.filter(ref => {
        return !definitions.some(def => 
          def.start.line === ref.range.start.line && 
          def.start.character === ref.range.start.character
        );
      });
    }
    
    return results;
  }

  findReferenceNodes(cursor, targetName, text, references, definitions) {
    const node = cursor.currentNode;
    
    // Check if this node is a reference to the target
    if (this.isReferenceNode(node, targetName, text)) {
      const reference = {
        uri: this.documentManager.getDocument(node.tree.uri)?.uri || 'unknown',
        range: {
          start: {
            line: node.startPosition.row,
            character: node.startPosition.column
          },
          end: {
            line: node.endPosition.row,
            character: node.endPosition.column
          }
        }
      };
      
      references.push(reference);
      
      // Check if this is also a definition
      if (this.isDefinitionReference(node)) {
        definitions.push(reference.range);
      }
    }
    
    if (cursor.gotoFirstChild()) {
      do {
        this.findReferenceNodes(cursor, targetName, text, references, definitions);
      } while (cursor.gotoNextSibling());
      cursor.gotoParent();
    }
  }

  isReferenceNode(node, targetName, text) {
    // Check identifiers
    if (node.type === 'identifier' || node.type === 'property_identifier') {
      const nodeName = text.substring(node.startIndex, node.endIndex);
      return nodeName === targetName;
    }
    
    // Check member expressions (e.g., object.property)
    if (node.type === 'member_expression' || node.type === 'property_access') {
      const propertyNode = node.childForFieldName('property');
      if (propertyNode) {
        const propertyName = text.substring(propertyNode.startIndex, propertyNode.endIndex);
        return propertyName === targetName;
      }
    }
    
    // Check function calls
    if (node.type === 'call_expression') {
      const functionNode = node.childForFieldName('function');
      if (functionNode && functionNode.type === 'identifier') {
        const functionName = text.substring(functionNode.startIndex, functionNode.endIndex);
        return functionName === targetName;
      }
    }
    
    return false;
  }

  isDefinitionReference(node) {
    const parent = node.parent;
    if (!parent) return false;
    
    // Variable declarations
    if (parent.type === 'variable_declarator' && parent.childForFieldName('name') === node) {
      return true;
    }
    
    // Function declarations
    if ((parent.type === 'function_declaration' || parent.type === 'function_definition') && 
        parent.childForFieldName('name') === node) {
      return true;
    }
    
    // Class declarations
    if ((parent.type === 'class_declaration' || parent.type === 'class_definition') && 
        parent.childForFieldName('name') === node) {
      return true;
    }
    
    // Method definitions
    if (parent.type === 'method_definition' && parent.childForFieldName('name') === node) {
      return true;
    }
    
    // Python assignments
    if (parent.type === 'assignment' && parent.childForFieldName('left') === node) {
      return true;
    }
    
    // Parameter definitions
    if (parent.type === 'formal_parameters' || parent.type === 'parameters') {
      return true;
    }
    
    return false;
  }

  findTextReferences(word, textDocument, doc) {
    const text = doc.getText();
    const references = [];
    const wordPattern = new RegExp(`\\b${this.escapeRegExp(word)}\\b`, 'g');
    let match;
    
    while ((match = wordPattern.exec(text)) !== null) {
      const startPos = doc.positionAt(match.index);
      const endPos = doc.positionAt(match.index + word.length);
      
      references.push({
        uri: textDocument.uri,
        range: {
          start: startPos,
          end: endPos
        }
      });
    }
    
    return references;
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = ReferencesHandler;
