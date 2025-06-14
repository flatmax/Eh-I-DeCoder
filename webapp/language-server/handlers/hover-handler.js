// Enhanced hover request handler with tree-sitter based symbol analysis
const BaseHandler = require('./base-handler');

class HoverHandler extends BaseHandler {
  handle(ws, id, params) {
    const { textDocument, position } = params;
    const doc = this.documentManager.getDocument(textDocument.uri);
    
    if (!doc) {
      this.sendResponse(ws, id, null);
      return;
    }
    
    const { word } = this.getWordAtPosition(doc, position);
    console.log(`Hover request for "${word}" at ${textDocument.uri}`);
    
    // Try to find symbol information
    const hoverInfo = this.getHoverInfo(word, textDocument.uri, position, doc);
    this.sendResponse(ws, id, hoverInfo);
  }

  getHoverInfo(word, uri, position, doc) {
    // First try to get dynamic symbol information
    const symbolInfo = this.getDynamicSymbolInfo(word, uri, position, doc);
    if (symbolInfo) {
      return symbolInfo;
    }
    
    // Fall back to built-in JavaScript/browser APIs
    const builtinInfo = this.getBuiltinInfo(word);
    if (builtinInfo) {
      return builtinInfo;
    }
    
    // Try to infer from context using tree-sitter
    const contextInfo = this.getContextualInfo(word, position, doc, uri);
    if (contextInfo) {
      return contextInfo;
    }
    
    return null;
  }

  getDynamicSymbolInfo(word, uri, position, doc) {
    const symbolAnalyzer = this.documentManager.getSymbolAnalyzer();
    const symbol = symbolAnalyzer.findSymbol(word, uri);
    
    if (!symbol) return null;
    
    let content = `**${symbol.name}** *(${symbol.kind})*\n\n`;
    
    // Add signature if available
    if (symbol.signature) {
      content += `\`\`\`${this.getLanguageId(uri)}\n${symbol.signature}\n\`\`\`\n\n`;
    }
    
    // Add type-specific information
    switch (symbol.type) {
      case 'function':
      case 'method':
        if (symbol.params && symbol.params.length > 0) {
          content += '**Parameters:**\n';
          symbol.params.forEach(param => {
            let paramInfo = `- \`${param.name}\``;
            if (param.type && param.type !== 'any') {
              paramInfo += `: ${param.type}`;
            }
            if (param.default) {
              paramInfo += ' *(optional)*';
            }
            if (param.rest) {
              paramInfo += ' *(rest parameter)*';
            }
            content += paramInfo + '\n';
          });
          content += '\n';
        }
        
        if (symbol.async) {
          content += '*Async function*\n';
        }
        if (symbol.generator) {
          content += '*Generator function*\n';
        }
        if (symbol.static) {
          content += '*Static method*\n';
        }
        break;
        
      case 'class':
        if (symbol.methods && symbol.methods.length > 0) {
          content += '**Methods:**\n';
          symbol.methods.forEach(method => {
            content += `- \`${method}\`\n`;
          });
          content += '\n';
        }
        break;
        
      case 'import':
        content += `Imported from: \`${symbol.source || 'unknown'}\`\n`;
        if (symbol.importedName && symbol.importedName !== symbol.name) {
          content += `Original name: \`${symbol.importedName}\`\n`;
        }
        break;
        
      case 'variable':
      case 'constant':
      case 'field':
        if (symbol.type === 'constant') {
          content += '*Constant*\n';
        }
        break;
    }
    
    // Add location information
    if (symbol.uri && symbol.uri !== uri) {
      const filename = symbol.uri.split('/').pop();
      content += `\nDefined in: \`${filename}\``;
    }
    
    return {
      contents: {
        kind: 'markdown',
        value: content.trim()
      }
    };
  }

  getLanguageId(uri) {
    const extension = uri.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'sh': 'bash',
      'bash': 'bash',
      'md': 'markdown'
    };
    
    return languageMap[extension] || 'text';
  }

  getBuiltinInfo(word) {
    const builtins = {
      // JavaScript/TypeScript
      'console': {
        kind: 'markdown',
        value: '**console** *(Global Object)*\n\n```javascript\nconsole\n```\n\nThe console object provides access to the browser\'s debugging console.\n\n**Common Methods:**\n- `log()` - Outputs a message\n- `error()` - Outputs an error message\n- `warn()` - Outputs a warning message\n- `info()` - Outputs an info message\n- `debug()` - Outputs a debug message'
      },
      'window': {
        kind: 'markdown',
        value: '**window** *(Global Object)*\n\n```javascript\nwindow\n```\n\nThe window object represents the browser window and serves as the global object in browsers.'
      },
      'document': {
        kind: 'markdown',
        value: '**document** *(Global Object)*\n\n```javascript\ndocument\n```\n\nThe document object represents the HTML document and provides methods to interact with the DOM.'
      },
      'Array': {
        kind: 'markdown',
        value: '**Array** *(Constructor)*\n\n```javascript\nArray\n```\n\nThe Array constructor creates array objects.\n\n**Common Methods:**\n- `push()` - Adds elements to the end\n- `pop()` - Removes the last element\n- `map()` - Creates a new array with transformed elements\n- `filter()` - Creates a new array with filtered elements'
      },
      'Object': {
        kind: 'markdown',
        value: '**Object** *(Constructor)*\n\n```javascript\nObject\n```\n\nThe Object constructor creates object wrappers.\n\n**Static Methods:**\n- `keys()` - Returns an array of property names\n- `values()` - Returns an array of property values\n- `entries()` - Returns an array of key-value pairs'
      },
      'Promise': {
        kind: 'markdown',
        value: '**Promise** *(Constructor)*\n\n```javascript\nPromise\n```\n\nThe Promise object represents the eventual completion or failure of an asynchronous operation.\n\n**Methods:**\n- `then()` - Handles resolved values\n- `catch()` - Handles rejected values\n- `finally()` - Executes regardless of outcome'
      },
      'function': {
        kind: 'markdown',
        value: '**function** *(Keyword)*\n\n```javascript\nfunction name() {}\n```\n\nThe function keyword declares a function with the specified parameters.'
      },
      'const': {
        kind: 'markdown',
        value: '**const** *(Keyword)*\n\n```javascript\nconst name = value;\n```\n\nDeclares a read-only named constant.'
      },
      'let': {
        kind: 'markdown',
        value: '**let** *(Keyword)*\n\n```javascript\nlet name = value;\n```\n\nDeclares a block-scoped local variable.'
      },
      'var': {
        kind: 'markdown',
        value: '**var** *(Keyword)*\n\n```javascript\nvar name = value;\n```\n\nDeclares a function-scoped or globally-scoped variable.'
      },
      // Python
      'print': {
        kind: 'markdown',
        value: '**print** *(Built-in Function)*\n\n```python\nprint(*objects, sep=\' \', end=\'\\n\', file=sys.stdout, flush=False)\n```\n\nPrints objects to the text stream file.'
      },
      'len': {
        kind: 'markdown',
        value: '**len** *(Built-in Function)*\n\n```python\nlen(s)\n```\n\nReturns the length (number of items) of an object.'
      },
      'range': {
        kind: 'markdown',
        value: '**range** *(Built-in Function)*\n\n```python\nrange(stop)\nrange(start, stop[, step])\n```\n\nReturns an immutable sequence of numbers.'
      },
      'def': {
        kind: 'markdown',
        value: '**def** *(Keyword)*\n\n```python\ndef function_name(parameters):\n    # function body\n```\n\nDefines a function.'
      },
      'class': {
        kind: 'markdown',
        value: '**class** *(Keyword)*\n\n```python\nclass ClassName:\n    # class body\n```\n\nDefines a class.'
      },
      'import': {
        kind: 'markdown',
        value: '**import** *(Keyword)*\n\n```python\nimport module\nfrom module import name\n```\n\nImports modules or specific objects from modules.'
      }
    };
    
    if (builtins[word]) {
      return { contents: builtins[word] };
    }
    
    return null;
  }

  getContextualInfo(word, position, doc, uri) {
    const symbolAnalyzer = this.documentManager.getSymbolAnalyzer();
    const tree = symbolAnalyzer.getTree(uri);
    
    if (!tree) return null;
    
    // Get the node at the current position
    const offset = doc.offsetAt(position);
    const node = tree.rootNode.descendantForIndex(offset);
    
    if (!node) return null;
    
    // Try to understand the context from the AST
    let contextInfo = null;
    let currentNode = node;
    
    while (currentNode && !contextInfo) {
      switch (currentNode.type) {
        case 'member_expression':
        case 'property_access':
          contextInfo = this.getMemberExpressionInfo(currentNode, word, doc);
          break;
        case 'call_expression':
          contextInfo = this.getCallExpressionInfo(currentNode, word, doc);
          break;
        case 'assignment':
        case 'variable_declarator':
          contextInfo = this.getAssignmentInfo(currentNode, word, doc);
          break;
      }
      currentNode = currentNode.parent;
    }
    
    return contextInfo;
  }

  getMemberExpressionInfo(node, word, doc) {
    const text = doc.getText();
    const objectNode = node.childForFieldName('object');
    
    if (objectNode) {
      const objectName = text.substring(objectNode.startIndex, objectNode.endIndex);
      return {
        contents: {
          kind: 'markdown',
          value: `**${word}** *(Property)*\n\nProperty of \`${objectName}\``
        }
      };
    }
    
    return null;
  }

  getCallExpressionInfo(node, word, doc) {
    const text = doc.getText();
    const functionNode = node.childForFieldName('function');
    
    if (functionNode && text.substring(functionNode.startIndex, functionNode.endIndex).includes(word)) {
      return {
        contents: {
          kind: 'markdown',
          value: `**${word}** *(Function Call)*\n\nFunction being called`
        }
      };
    }
    
    return null;
  }

  getAssignmentInfo(node, word, doc) {
    const text = doc.getText();
    let declarationType = 'assignment';
    
    if (node.parent && node.parent.type === 'variable_declaration') {
      declarationType = node.parent.children[0].type; // const, let, var
    }
    
    return {
      contents: {
        kind: 'markdown',
        value: `**${word}** *(Variable)*\n\nDeclared with \`${declarationType}\``
      }
    };
  }
}

module.exports = HoverHandler;
