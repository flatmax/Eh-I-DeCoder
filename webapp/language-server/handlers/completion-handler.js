// Completion request handler
const BaseHandler = require('./base-handler');
const { COMPLETION_ITEM_KIND } = require('../constants');

class CompletionHandler extends BaseHandler {
  handle(ws, id, params) {
    const { textDocument, position } = params;
    const doc = this.documentManager.getDocument(textDocument.uri);
    
    if (!doc) {
      this.sendResponse(ws, id, []);
      return;
    }
    
    // Get the text before the cursor
    const text = doc.getText();
    const offset = doc.offsetAt(position);
    const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
    const lineText = text.substring(lineStart, offset);
    
    // Basic completions based on context
    const completions = [];
    
    // If typing after a dot, suggest properties/methods
    if (lineText.endsWith('.')) {
      this.addMethodCompletions(completions);
    } else {
      this.addGeneralCompletions(completions);
    }
    
    this.sendResponse(ws, id, completions);
  }

  addMethodCompletions(completions) {
    completions.push(
      {
        label: 'log',
        kind: COMPLETION_ITEM_KIND.Method,
        detail: 'log(message)',
        documentation: 'Outputs a message to the console'
      },
      {
        label: 'error',
        kind: COMPLETION_ITEM_KIND.Method,
        detail: 'error(message)',
        documentation: 'Outputs an error message to the console'
      },
      {
        label: 'warn',
        kind: COMPLETION_ITEM_KIND.Method,
        detail: 'warn(message)',
        documentation: 'Outputs a warning message to the console'
      }
    );
  }

  addGeneralCompletions(completions) {
    completions.push(
      {
        label: 'console',
        kind: COMPLETION_ITEM_KIND.Module,
        detail: 'Console module',
        documentation: 'Provides access to the console'
      },
      {
        label: 'function',
        kind: COMPLETION_ITEM_KIND.Keyword,
        detail: 'function keyword',
        documentation: 'Declares a function'
      },
      {
        label: 'const',
        kind: COMPLETION_ITEM_KIND.Keyword,
        detail: 'const keyword',
        documentation: 'Declares a constant'
      },
      {
        label: 'let',
        kind: COMPLETION_ITEM_KIND.Keyword,
        detail: 'let keyword',
        documentation: 'Declares a block-scoped variable'
      }
    );
  }
}

module.exports = CompletionHandler;
