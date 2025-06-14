// CSS/SCSS symbol extractor
const BaseExtractor = require('./base-extractor');

class CssExtractor extends BaseExtractor {
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
      case 'rule_set':
        return this.extractRuleSet(node, text);
      case 'at_rule':
        return this.extractAtRule(node, text);
      case 'keyframes_statement':
        return this.extractKeyframes(node, text);
      case 'media_statement':
        return this.extractMediaQuery(node, text);
      default:
        return null;
    }
  }

  extractRuleSet(node, text) {
    const selectorsNode = this.getChildForFieldName(node, 'selectors');
    if (!selectorsNode) return null;
    
    const selectors = this.extractSelectors(selectorsNode, text);
    const properties = this.extractProperties(node, text);
    
    // Create symbols for each selector
    const symbols = selectors.map(selector => {
      return this.createSymbol(selector.name, this.getSymbolTypeForSelector(selector.type), this.nodeToRange(node), {
        signature: `${selector.name} { ... }`,
        selectorType: selector.type,
        properties: properties.map(p => p.name)
      });
    });
    
    return symbols.length === 1 ? symbols[0] : symbols;
  }

  extractAtRule(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    const value = this.extractAtRuleValue(node, text);
    
    return this.createSymbol(name, this.symbolTypes.CONSTANT, this.nodeToRange(node), {
      signature: `@${name} ${value || ''}`,
      atRule: true
    });
  }

  extractKeyframes(node, text) {
    const nameNode = this.getChildForFieldName(node, 'name');
    if (!nameNode) return null;
    
    const name = this.getNodeText(nameNode, text);
    
    return this.createSymbol(name, this.symbolTypes.FUNCTION, this.nodeToRange(node), {
      signature: `@keyframes ${name}`,
      keyframes: true
    });
  }

  extractMediaQuery(node, text) {
    const queryNode = this.getChildForFieldName(node, 'query');
    const query = queryNode ? this.getNodeText(queryNode, text) : 'unknown';
    
    return this.createSymbol(`@media ${query}`, this.symbolTypes.NAMESPACE, this.nodeToRange(node), {
      signature: `@media ${query}`,
      mediaQuery: true
    });
  }

  extractSelectors(selectorsNode, text) {
    const selectors = [];
    
    selectorsNode.children.forEach(child => {
      if (child.type === 'class_selector') {
        const name = this.getNodeText(child, text);
        selectors.push({
          name: name,
          type: 'class'
        });
      } else if (child.type === 'id_selector') {
        const name = this.getNodeText(child, text);
        selectors.push({
          name: name,
          type: 'id'
        });
      } else if (child.type === 'tag_name') {
        const name = this.getNodeText(child, text);
        selectors.push({
          name: name,
          type: 'element'
        });
      } else if (child.type === 'attribute_selector') {
        const name = this.getNodeText(child, text);
        selectors.push({
          name: name,
          type: 'attribute'
        });
      } else if (child.type === 'pseudo_class_selector' || child.type === 'pseudo_element_selector') {
        const name = this.getNodeText(child, text);
        selectors.push({
          name: name,
          type: 'pseudo'
        });
      } else {
        // Generic selector
        const name = this.getNodeText(child, text);
        if (name.trim()) {
          selectors.push({
            name: name.trim(),
            type: 'generic'
          });
        }
      }
    });
    
    return selectors;
  }

  extractProperties(node, text) {
    const properties = [];
    const blockNode = this.getChildForFieldName(node, 'block');
    
    if (blockNode) {
      blockNode.children.forEach(child => {
        if (child.type === 'declaration') {
          const propertyNode = this.getChildForFieldName(child, 'property');
          const valueNode = this.getChildForFieldName(child, 'value');
          
          if (propertyNode) {
            const name = this.getNodeText(propertyNode, text);
            const value = valueNode ? this.getNodeText(valueNode, text) : '';
            
            properties.push({
              name,
              value
            });
          }
        }
      });
    }
    
    return properties;
  }

  extractAtRuleValue(node, text) {
    // Try to find the value part of an at-rule
    const valueNode = this.getChildForFieldName(node, 'value') || 
                     this.getChildForFieldName(node, 'query') ||
                     this.getChildForFieldName(node, 'url');
    
    return valueNode ? this.getNodeText(valueNode, text) : null;
  }

  getSymbolTypeForSelector(selectorType) {
    switch (selectorType) {
      case 'class':
        return this.symbolTypes.CLASS;
      case 'id':
        return this.symbolTypes.CONSTANT;
      case 'element':
        return this.symbolTypes.VARIABLE;
      case 'attribute':
      case 'pseudo':
        return this.symbolTypes.FIELD;
      default:
        return this.symbolTypes.VARIABLE;
    }
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
        case 'selectors':
          // Look for selectors node
          return node.children.find(child =>
            child.type === 'selectors'
          );
        case 'block':
          // Look for block or declaration_list
          return node.children.find(child =>
            child.type === 'block' || child.type === 'declaration_list'
          );
        case 'name':
          // Look for identifier or at_keyword
          return node.children.find(child =>
            child.type === 'identifier' || child.type === 'at_keyword'
          );
        case 'property':
          // Look for property_name
          return node.children.find(child =>
            child.type === 'property_name'
          );
        case 'value':
          // Look for various value types
          return node.children.find(child =>
            child.type.includes('value') || child.type === 'string_value' || child.type === 'integer_value'
          );
        case 'query':
          // Look for media_query
          return node.children.find(child =>
            child.type === 'media_query'
          );
        case 'url':
          // Look for call_expression with url
          return node.children.find(child =>
            child.type === 'call_expression' && this.getNodeText(child, node.tree?.rootNode?.text || '').startsWith('url')
          );
        default:
          return null;
      }
    }
    
    return null;
  }
}

module.exports = CssExtractor;
