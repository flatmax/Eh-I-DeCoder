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
      console.log('Hover content received:', content);
      
      return {
        pos,
        above: true,
        create() {
          const dom = document.createElement('div');
          dom.className = 'cm-tooltip-hover';
          
          // Enhanced markdown rendering
          const htmlContent = formatHoverContent(content);
          console.log('Formatted HTML content:', htmlContent);
          
          dom.innerHTML = htmlContent;
          return { dom };
        }
      };
    } catch (error) {
      console.error('Hover error:', error);
      return null;
    }
  });

  // Key bindings for go to definition, save, and find in files
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
    },
    {
      key: 'Mod-s',
      run: (view) => {
        console.log('Mod-s pressed in editor - dispatching save event');
        // Dispatch a custom save event that the MergeEditor can handle
        view.dom.dispatchEvent(new CustomEvent('editor-save', {
          bubbles: true,
          composed: true
        }));
        return true; // Prevent browser's default save behavior
      }
    },
    {
      key: 'Ctrl-Shift-f',
      mac: 'Cmd-Shift-f',
      run: (view) => {
        console.log('Ctrl-Shift-f/Cmd-Shift-f pressed in editor');
        openFindInFiles(view);
        return true;
      }
    }
  ]);

  // Handle Ctrl/Cmd + click for go-to-definition
  const clickHandler = EditorView.domEventHandlers({
    mousedown(event, view) {
      if (event.button === 0 && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();

        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos !== null) {
          view.dispatch({ selection: { anchor: pos } });
          goToDefinition(view);
          return true;
        }
      }
    }
  });

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

  function openFindInFiles(view) {
    console.log('openFindInFiles called');
    
    // Get selected text if any
    const selection = view.state.selection.main;
    let selectedText = '';
    
    if (!selection.empty) {
      selectedText = view.state.doc.sliceString(selection.from, selection.to);
      console.log('Selected text for find in files:', selectedText);
    }
    
    // Dispatch event to open find in files with selected text
    view.dom.dispatchEvent(new CustomEvent('open-find-in-files', {
      detail: { selectedText },
      bubbles: true,
      composed: true
    }));
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
    clickHandler,
    documentSyncPlugin,
    EditorView.theme({
      '.cm-tooltip-hover': {
        backgroundColor: '#2d2d30',
        color: '#cccccc',
        border: '1px solid #3e3e42',
        borderRadius: '4px',
        padding: '8px 12px',
        maxWidth: '600px',
        fontSize: '13px',
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        lineHeight: '1.4',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: '1000'
      },
      '.cm-tooltip-hover h1, .cm-tooltip-hover h2, .cm-tooltip-hover h3': {
        margin: '0 0 8px 0',
        color: '#4ec9b0'
      },
      '.cm-tooltip-hover code': {
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        padding: '2px 4px',
        borderRadius: '3px',
        fontSize: '12px'
      },
      '.cm-tooltip-hover pre': {
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        padding: '8px',
        borderRadius: '4px',
        margin: '4px 0',
        overflow: 'auto',
        fontSize: '12px'
      },
      '.cm-tooltip-hover strong': {
        color: '#4ec9b0',
        fontWeight: '600'
      },
      '.cm-tooltip-hover em': {
        color: '#9cdcfe',
        fontStyle: 'italic'
      },
      '.cm-tooltip-hover ul, .cm-tooltip-hover ol': {
        margin: '4px 0',
        paddingLeft: '16px'
      },
      '.cm-tooltip-hover li': {
        margin: '2px 0'
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
  if (!content) return '';
  
  if (typeof content === 'string') {
    // Handle plain text content
    return convertMarkdownToHtml(content);
  } else if (content.kind === 'markdown') {
    // Handle markdown content
    return convertMarkdownToHtml(content.value || '');
  }
  
  return '';
}

function convertMarkdownToHtml(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Convert code blocks first (to avoid conflicts with inline code)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
  });
  
  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Convert bold text
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic text
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Convert line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<') || html.startsWith('<br>')) {
    html = '<p>' + html + '</p>';
  }
  
  // Clean up empty paragraphs and fix nested lists
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<ul>.*<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>.*<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1');
  
  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function offsetToPosition(doc, offset) {
  const line = doc.lineAt(offset);
  return {
    line: line.number - 1,
    character: offset - line.from
  };
}
