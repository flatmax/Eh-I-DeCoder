import { ViewPlugin, Decoration, EditorView, keymap } from '@codemirror/view';
import { StateField, StateEffect } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { hoverTooltip } from '@codemirror/view';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';

export function createLanguageClientExtension(languageClient, filePath) {
  console.log('Creating language client extension for:', filePath);
  const fileUri = `file://${filePath}`;
  let documentVersion = 0;
  
  // State field for tracking diagnostics
  const diagnosticsState = StateField.define({
    create() {
      return Decoration.none;
    },
    update(diagnostics, tr) {
      // Update diagnostics based on language server messages
      return diagnostics;
    }
  });

  // Completion source
  async function completionSource(context) {
    if (!languageClient.connected) return null;
    
    const pos = context.pos;
    const line = context.state.doc.lineAt(pos);
    const position = {
      line: line.number - 1,
      character: pos - line.from
    };
    
    try {
      const completions = await languageClient.completion(fileUri, position);
      if (!completions || !Array.isArray(completions)) return null;
      
      return {
        from: context.matchBefore(/\w*/)?.from ?? pos,
        options: completions.map(item => ({
          label: item.label,
          type: getCompletionType(item.kind),
          detail: item.detail,
          info: item.documentation
        }))
      };
    } catch (error) {
      console.error('Completion error:', error);
      return null;
    }
  }

  // Hover tooltip
  const hoverTooltipExtension = hoverTooltip(async (view, pos) => {
    if (!languageClient.connected) return null;
    
    const line = view.state.doc.lineAt(pos);
    const position = {
      line: line.number - 1,
      character: pos - line.from
    };
    
    try {
      const hover = await languageClient.hover(fileUri, position);
      if (!hover || !hover.contents) return null;
      
      const content = hover.contents.value || hover.contents;
      return {
        pos,
        above: true,
        create() {
          const dom = document.createElement('div');
          dom.className = 'cm-tooltip-hover';
          dom.innerHTML = formatHoverContent(content);
          return { dom };
        }
      };
    } catch (error) {
      console.error('Hover error:', error);
      return null;
    }
  });

  // Key bindings for go to definition
  const keyBindings = keymap.of([
    {
      key: 'F12',
      run: (view) => {
        console.log('F12 pressed in editor');
        goToDefinition(view);
        return true;
      }
    },
    {
      key: 'Ctrl-F12',
      mac: 'Cmd-F12',
      run: (view) => {
        console.log('Ctrl-F12/Cmd-F12 pressed in editor');
        findReferences(view);
        return true;
      }
    }
  ]);

  async function goToDefinition(view) {
    console.log('goToDefinition called');
    if (!languageClient.connected) {
      console.log('Language client not connected');
      return;
    }
    
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    const position = {
      line: line.number - 1,
      character: pos - line.from
    };
    
    // Get word at cursor for logging
    const wordAt = view.state.wordAt(pos);
    const word = wordAt ? view.state.doc.sliceString(wordAt.from, wordAt.to) : 'unknown';
    console.log(`Requesting definition for "${word}" at line ${position.line + 1}, char ${position.character}`);
    
    try {
      const definition = await languageClient.definition(fileUri, position);
      console.log('Definition response:', definition);
      
      if (definition) {
        // Emit event to open file at definition location
        view.dom.dispatchEvent(new CustomEvent('go-to-definition', {
          detail: definition,
          bubbles: true,
          composed: true
        }));
      } else {
        console.log('No definition found');
      }
    } catch (error) {
      console.error('Go to definition error:', error);
    }
  }

  async function findReferences(view) {
    console.log('findReferences called');
    if (!languageClient.connected) {
      console.log('Language client not connected');
      return;
    }
    
    const pos = view.state.selection.main.head;
    const line = view.state.doc.lineAt(pos);
    const position = {
      line: line.number - 1,
      character: pos - line.from
    };
    
    try {
      const references = await languageClient.references(fileUri, position);
      console.log('References response:', references);
      
      if (references && references.length > 0) {
        // Emit event to show references
        view.dom.dispatchEvent(new CustomEvent('show-references', {
          detail: references,
          bubbles: true,
          composed: true
        }));
      } else {
        console.log('No references found');
      }
    } catch (error) {
      console.error('Find references error:', error);
    }
  }

  // Document sync plugin
  const documentSyncPlugin = ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.initialize();
    }
    
    async initialize() {
      // Send didOpen when document is first opened
      const text = this.view.state.doc.toString();
      const languageId = getLanguageId(filePath);
      
      try {
        await languageClient.didOpen(fileUri, languageId, documentVersion, text);
        console.log('Document opened in language server:', fileUri);
      } catch (error) {
        console.error('Failed to open document:', error);
      }
    }
    
    update(update) {
      if (!update.docChanged || !languageClient.connected) return;
      
      // Increment version
      documentVersion++;
      
      // Build content changes
      const contentChanges = [];
      update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        contentChanges.push({
          range: {
            start: offsetToPosition(update.startState.doc, fromA),
            end: offsetToPosition(update.startState.doc, toA)
          },
          text: inserted.toString()
        });
      });
      
      // Send didChange
      languageClient.didChange(fileUri, documentVersion, contentChanges).catch(error => {
        console.error('Failed to sync document changes:', error);
      });
    }
    
    destroy() {
      // Send didClose when document is closed
      languageClient.didClose(fileUri).catch(error => {
        console.error('Failed to close document:', error);
      });
    }
  });

  // Listen for diagnostics
  window.addEventListener('language-diagnostics', (event) => {
    if (event.detail.uri === fileUri) {
      // Handle diagnostics for this file
      console.log('Diagnostics received:', event.detail.diagnostics);
    }
  });

  console.log('Language client extension created with keybindings');

  return [
    diagnosticsState,
    autocompletion({ override: [completionSource] }),
    hoverTooltipExtension,
    keyBindings,
    documentSyncPlugin,
    EditorView.theme({
      '.cm-tooltip-hover': {
        backgroundColor: '#f8f8f8',
        border: '1px solid #ddd',
        borderRadius: '3px',
        padding: '4px 8px',
        maxWidth: '500px',
        fontSize: '14px',
        fontFamily: 'monospace'
      }
    })
  ];
}

// Helper functions
function getLanguageId(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascriptreact',
    'ts': 'typescript',
    'tsx': 'typescriptreact',
    'py': 'python',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'md': 'markdown'
  };
  return languageMap[ext] || 'plaintext';
}

function getCompletionType(kind) {
  // Map LSP CompletionItemKind to CodeMirror completion types
  const kindMap = {
    1: 'text',
    2: 'method',
    3: 'function',
    4: 'constructor',
    5: 'field',
    6: 'variable',
    7: 'class',
    8: 'interface',
    9: 'module',
    10: 'property',
    11: 'unit',
    12: 'value',
    13: 'enum',
    14: 'keyword',
    15: 'snippet',
    16: 'color',
    17: 'file',
    18: 'reference'
  };
  return kindMap[kind] || 'text';
}

function formatHoverContent(content) {
  if (typeof content === 'string') {
    // Simple text content
    return content.replace(/\n/g, '<br>');
  } else if (content.kind === 'markdown') {
    // Markdown content - simple conversion
    return content.value
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }
  return '';
}

function offsetToPosition(doc, offset) {
  const line = doc.lineAt(offset);
  return {
    line: line.number - 1,
    character: offset - line.from
  };
}
