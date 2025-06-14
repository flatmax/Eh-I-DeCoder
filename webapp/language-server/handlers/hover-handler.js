// Enhanced hover request handler with dynamic symbol analysis
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
    const symbolInfo = this.getDynamicSymbolInfo(word, uri);
    if (symbolInfo) {
      return symbolInfo;
    }
    
    // Fall back to built-in JavaScript/browser APIs
    const builtinInfo = this.getBuiltinInfo(word);
    if (builtinInfo) {
      return builtinInfo;
    }
    
    // Try to infer from context
    const contextInfo = this.getContextualInfo(word, position, doc);
    if (contextInfo) {
      return contextInfo;
    }
    
    return null;
  }

  getDynamicSymbolInfo(word, uri) {
    const symbolAnalyzer = this.documentManager.getSymbolAnalyzer();
    const symbol = symbolAnalyzer.findSymbol(word, uri);
    
    if (!symbol) return null;
    
    let content = `**${symbol.name}** *(${symbol.kind})*\n\n`;
    
    // Add signature if available
    if (symbol.signature) {
      content += `\`\`\`javascript\n${symbol.signature}\n\`\`\`\n\n`;
    }
    
    // Add documentation
    if (symbol.documentation) {
      if (typeof symbol.documentation === 'string') {
        content += symbol.documentation;
      } else {
        // JSDoc format
        if (symbol.documentation.description) {
          content += symbol.documentation.description + '\n\n';
        }
        
        // Add parameter documentation
        if (symbol.params && symbol.documentation.tags) {
          const paramDocs = this.extractParamDocs(symbol.documentation.tags);
          if (paramDocs.length > 0) {
            content += '**Parameters:**\n';
            paramDocs.forEach(param => {
              content += `- \`${param.name}\`: ${param.description}\n`;
            });
            content += '\n';
          }
        }
        
        // Add return documentation
        if (symbol.documentation.tags && symbol.documentation.tags.returns) {
          content += `**Returns:** ${symbol.documentation.tags.returns}\n\n`;
        }
        
        // Add examples
        if (symbol.documentation.tags && symbol.documentation.tags.example) {
          content += `**Example:**\n\`\`\`javascript\n${symbol.documentation.tags.example}\n\`\`\`\n\n`;
        }
      }
    }
    
    // Add parameter information for functions
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
    
    // Add class methods if it's a class
    if (symbol.type === 'class' && symbol.methods && symbol.methods.length > 0) {
      content += '**Methods:**\n';
      symbol.methods.forEach(method => {
        content += `- \`${method}\`\n`;
      });
      content += '\n';
    }
    
    // Add import information
    if (symbol.type === 'import') {
      content += `Imported from: \`${symbol.source}\`\n`;
      if (symbol.importedName !== symbol.name) {
        content += `Original name: \`${symbol.importedName}\`\n`;
      }
    }
    
    // Add export information
    if (symbol.exported) {
      content += '*This symbol is exported*\n';
    }
    
    return {
      contents: {
        kind: 'markdown',
        value: content.trim()
      }
    };
  }

  extractParamDocs(tags) {
    const paramDocs = [];
    
    // Handle @param tags
    Object.keys(tags).forEach(tagName => {
      if (tagName.startsWith('param')) {
        const paramMatch = tags[tagName].match(/^(\w+)\s+(.*)/);
        if (paramMatch) {
          paramDocs.push({
            name: paramMatch[1],
            description: paramMatch[2]
          });
        }
      }
    });
    
    return paramDocs;
  }

  getBuiltinInfo(word) {
    const builtins = {
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
      }
    };
    
    if (builtins[word]) {
      return { contents: builtins[word] };
    }
    
    return null;
  }

  getContextualInfo(word, position, doc) {
    const text = doc.getText();
    const offset = doc.offsetAt(position);
    
    // Get surrounding context
    const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
    const lineEnd = text.indexOf('\n', offset);
    const line = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd);
    
    // Check if it's a method call
    const methodCallMatch = line.match(new RegExp(`(\\w+)\\.${word}\\s*\\(`));
    if (methodCallMatch) {
      const objectName = methodCallMatch[1];
      return {
        contents: {
          kind: 'markdown',
          value: `**${word}** *(Method)*\n\nMethod called on \`${objectName}\`\n\nLine: \`${line.trim()}\``
        }
      };
    }
    
    // Check if it's a property access
    const propertyMatch = line.match(new RegExp(`(\\w+)\\.${word}(?!\\s*\\()`));
    if (propertyMatch) {
      const objectName = propertyMatch[1];
      return {
        contents: {
          kind: 'markdown',
          value: `**${word}** *(Property)*\n\nProperty of \`${objectName}\`\n\nLine: \`${line.trim()}\``
        }
      };
    }
    
    // Check if it's a variable assignment
    const assignmentMatch = line.match(new RegExp(`(const|let|var)\\s+${word}\\s*=`));
    if (assignmentMatch) {
      const declarationType = assignmentMatch[1];
      return {
        contents: {
          kind: 'markdown',
          value: `**${word}** *(Variable)*\n\nDeclared with \`${declarationType}\`\n\nLine: \`${line.trim()}\``
        }
      };
    }
    
    return null;
  }
}

module.exports = HoverHandler;
