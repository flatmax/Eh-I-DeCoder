import { MergeView } from '@codemirror/merge';
import { basicSetup, EditorView } from 'codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { getLanguageExtension } from './LanguageExtensions.js';
import { createLanguageClientExtension } from './LanguageClientExtension.js';
import { createScrollbarChangeIndicator } from './ScrollbarChangeIndicator.js';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { addCursorUp, addCursorDown } from './extensions/MultiCursorExtension.js';
import { createKeyBindingsExtension } from './extensions/KeyBindingsExtension.js';
import { createClickHandlerExtension } from './extensions/ClickHandlerExtension.js';
import { search } from '@codemirror/search';

export class MergeViewManager {
  constructor(container, options = {}) {
    this.container = container;
    this.mergeView = null;
    this.options = options;
    this.onContentChange = options.onContentChange || (() => {});
    this.shadowRoot = options.shadowRoot || null;
    this.currentChunkIndex = -1;
    this.chunks = [];
  }

  initialize(filePath, headContent, workingContent, languageClient, languageClientConnected) {
    console.log('MergeViewManager.initialize called:', {
      filePath,
      headContentLength: headContent?.length,
      workingContentLength: workingContent?.length,
      container: this.container,
      shadowRoot: this.shadowRoot
    });
    
    this.destroy();
    
    // Clear container and ensure it has proper dimensions
    this.container.innerHTML = '';
    this.container.style.height = '100%';
    this.container.style.width = '100%';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.overflow = 'hidden';
    this.container.style.minHeight = '0';
    
    // Get language-specific extension
    const langExtension = getLanguageExtension(filePath);
    
    // Create navigation override keymap with absolute highest precedence
    const navigationOverrideKeymap = Prec.highest(keymap.of([
      {
        key: 'Alt-ArrowLeft',
        mac: 'Cmd-ArrowLeft',
        run: (view) => {
          // Dispatch navigate-back event
          view.dom.dispatchEvent(new CustomEvent('navigate-back', {
            bubbles: true,
            composed: true
          }));
          return true;
        },
        preventDefault: true,
        stopPropagation: true
      },
      {
        key: 'Alt-ArrowRight',
        mac: 'Cmd-ArrowRight',
        run: (view) => {
          // Dispatch navigate-forward event
          view.dom.dispatchEvent(new CustomEvent('navigate-forward', {
            bubbles: true,
            composed: true
          }));
          return true;
        },
        preventDefault: true,
        stopPropagation: true
      },
      {
        key: 'Alt-n',
        run: (view) => {
          this.goToNextChunk();
          return true;
        },
        preventDefault: true,
        stopPropagation: true
      },
      {
        key: 'Alt-p',
        run: (view) => {
          this.goToPreviousChunk();
          return true;
        },
        preventDefault: true,
        stopPropagation: true
      }
    ]));
    
    // Multi-cursor keymap with high precedence
    const multiCursorKeymap = keymap.of([
      {
        key: "Shift-Alt-ArrowUp",
        run: addCursorUp,
        preventDefault: true
      },
      {
        key: "Shift-Alt-ArrowDown",
        run: addCursorDown,
        preventDefault: true
      }
    ], {
      // High precedence to override any conflicting keymaps
      precedence: "highest"
    });
    
    // Configure search to appear at the top
    const searchConfig = {
      top: true
    };
    
    // Create base extensions with VS Code dark theme
    // IMPORTANT: navigationOverrideKeymap MUST be first to have highest priority
    const baseExtensions = [
      navigationOverrideKeymap, // Absolute highest priority navigation override
      multiCursorKeymap, // Put multi-cursor second with highest precedence
      basicSetup,
      search(searchConfig), // Override the search from basicSetup with our config
      oneDark,
      EditorView.theme({
        "&": {
          fontSize: "14px"
        },
        ".cm-scroller": {
          fontFamily: "Monaco, Menlo, 'Ubuntu Mono', monospace",
          scrollbarWidth: "thin",
          scrollbarColor: "#424242 #1e1e1e"
        },
        ".cm-scroller::-webkit-scrollbar": {
          width: "14px",
          height: "14px"
        },
        ".cm-scroller::-webkit-scrollbar-track": {
          background: "#1e1e1e"
        },
        ".cm-scroller::-webkit-scrollbar-thumb": {
          background: "#424242",
          border: "3px solid #1e1e1e",
          borderRadius: "7px"
        },
        ".cm-scroller::-webkit-scrollbar-thumb:hover": {
          background: "#4f4f4f"
        },
        ".cm-line": {
          padding: "0 4px"
        },
        ".cm-gutters": {
          backgroundColor: "#1e1e1e",
          color: "#858585",
          border: "none"
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#2d2d30"
        },
        ".cm-lineNumbers": {
          minWidth: "40px"
        },
        ".cm-lineNumbers .cm-gutterElement": {
          padding: "0 8px 0 16px"
        },
        // Multi-cursor styling
        ".cm-cursor-primary": {
          borderLeftColor: "#fff"
        },
        ".cm-cursor-secondary": {
          borderLeftColor: "#ff9b00"
        },
        // Search panel styling
        ".cm-search": {
          top: "0 !important",
          bottom: "auto !important"
        },
        ".cm-panels-top": {
          borderBottom: "1px solid #424242"
        }
      }),
      createKeyBindingsExtension(languageClient, filePath),
      createClickHandlerExtension(languageClient, `file://${filePath}`),
      createScrollbarChangeIndicator()
    ];

    // Add language extension if available
    if (langExtension) {
      baseExtensions.push(langExtension);
    }

    // Add language client extension to working editor if connected
    const workingExtensions = [...baseExtensions];
    if (languageClientConnected && languageClient) {
      try {
        workingExtensions.push(createLanguageClientExtension(languageClient, filePath));
      } catch (error) {
        console.error('Failed to create language client extension:', error);
      }
    }

    // Create the merge view
    try {
      console.log('Creating MergeView with:', {
        headLength: headContent?.length || 0,
        workingLength: workingContent?.length || 0,
        hasRoot: !!this.shadowRoot
      });

      const mergeViewConfig = {
        a: {
          doc: headContent || '',
          extensions: [
            ...baseExtensions,
            EditorView.editable.of(false)
          ]
        },
        b: {
          doc: workingContent || '',
          extensions: [
            ...workingExtensions,
            EditorView.updateListener.of((update) => {
              if (update.docChanged) {
                this.onContentChange();
              }
            })
          ]
        },
        parent: this.container,
        orientation: 'a-b',
        revertControls: 'a-to-b',
        renderRevertControl: () => {
          const button = document.createElement('button');
          button.className = 'cm-merge-revert';
          button.textContent = '⟶';
          button.title = 'Revert this change';
          return button;
        },
        highlightChanges: true,
        gutter: true,
        lineNumbers: true
      };

      // CRITICAL: Add root option for shadow DOM support
      if (this.shadowRoot) {
        mergeViewConfig.root = this.shadowRoot;
      }

      console.log('Creating MergeView with config:', mergeViewConfig);
      this.mergeView = new MergeView(mergeViewConfig);

      console.log('MergeView created successfully:', this.mergeView);

      // Ensure the merge view is properly sized
      if (this.mergeView) {
        // Force a layout update
        requestAnimationFrame(() => {
          if (this.mergeView && this.mergeView.a && this.mergeView.b) {
            console.log('Requesting measure for editors');
            this.mergeView.a.requestMeasure();
            this.mergeView.b.requestMeasure();
            
            // Force scrollbar visibility and proper sizing
            const scrollers = this.container.querySelectorAll('.cm-scroller');
            scrollers.forEach(scroller => {
              scroller.style.overflow = 'auto';
              scroller.style.scrollbarWidth = 'thin';
              scroller.style.height = '100%';
              scroller.style.flex = '1';
              scroller.style.minHeight = '0';
            });
            
            // Ensure editors have proper flex layout
            const editors = this.container.querySelectorAll('.cm-editor');
            editors.forEach(editor => {
              editor.style.height = '100%';
              editor.style.display = 'flex';
              editor.style.flexDirection = 'column';
              editor.style.minHeight = '0';
            });
            
            // Also check if the container has proper dimensions
            const rect = this.container.getBoundingClientRect();
            console.log('Container dimensions:', {
              width: rect.width,
              height: rect.height
            });

            // Initialize chunk navigation after the merge view is ready
            this.initializeChunkNavigation();
          }
        });

        // Focus the working editor
        if (this.mergeView.b) {
          this.mergeView.b.focus();
        }
      }
    } catch (error) {
      console.error('Error creating merge view:', error);
      console.error('Error stack:', error.stack);
      // Try to show error in container
      this.container.innerHTML = `<div style="color: red; padding: 20px;">Error creating merge view: ${error.message}</div>`;
    }
  }

  initializeChunkNavigation() {
    if (!this.mergeView) return;

    // Find all diff chunks by looking for merge view chunks
    this.chunks = [];
    this.currentChunkIndex = -1;

    try {
      // Use a more reliable method to find chunks
      this.findChunksFromMergeView();
      
      console.log('Found chunks for navigation:', this.chunks.length, this.chunks);
    } catch (error) {
      console.error('Error initializing chunk navigation:', error);
    }
  }

  findChunksFromMergeView() {
    if (!this.mergeView || !this.mergeView.b) return;

    const chunks = [];
    
    // Try to access the merge view's internal chunk data
    if (this.mergeView.chunks && Array.isArray(this.mergeView.chunks)) {
      // Use the merge view's chunks directly
      this.chunks = this.mergeView.chunks.map((chunk, index) => ({
        index,
        from: chunk.fromB || chunk.from,
        to: chunk.toB || chunk.to,
        type: chunk.type || 'change',
        lineStart: this.mergeView.b.state.doc.lineAt(chunk.fromB || chunk.from).number,
        lineEnd: this.mergeView.b.state.doc.lineAt(chunk.toB || chunk.to).number
      }));
    } else {
      // Fallback: scan for diff decorations in the working editor
      const state = this.mergeView.b.state;
      const doc = state.doc;
      
      // Look for diff-related decorations
      const decorations = state.facet(EditorView.decorations);
      const foundChunks = new Set(); // Use Set to avoid duplicates
      
      decorations.forEach(decoSet => {
        if (decoSet && typeof decoSet.iter === 'function') {
          decoSet.iter(0, doc.length, (from, to, value) => {
            const classes = value.class || '';
            if (classes.includes('cm-merge') || 
                classes.includes('cm-diff') ||
                classes.includes('cm-changed') ||
                classes.includes('cm-inserted') ||
                classes.includes('cm-deleted')) {
              
              const lineStart = doc.lineAt(from).number;
              const lineEnd = doc.lineAt(to).number;
              const chunkKey = `${lineStart}-${lineEnd}`;
              
              if (!foundChunks.has(chunkKey)) {
                foundChunks.add(chunkKey);
                chunks.push({
                  from,
                  to,
                  lineStart,
                  lineEnd,
                  type: classes.includes('cm-deleted') ? 'delete' :
                        classes.includes('cm-inserted') ? 'insert' : 'change'
                });
              }
            }
          });
        }
      });
      
      // Sort chunks by line position
      this.chunks = chunks.sort((a, b) => a.lineStart - b.lineStart);
    }
    
    // If we still don't have chunks, try a different approach
    if (this.chunks.length === 0) {
      this.findChunksFromLineComparison();
    }
  }

  findChunksFromLineComparison() {
    if (!this.mergeView || !this.mergeView.a || !this.mergeView.b) return;

    const headDoc = this.mergeView.a.state.doc;
    const workingDoc = this.mergeView.b.state.doc;
    
    const headLines = headDoc.toString().split('\n');
    const workingLines = workingDoc.toString().split('\n');
    
    const chunks = [];
    let currentChunk = null;
    
    // Simple line-by-line comparison to find differences
    const maxLines = Math.max(headLines.length, workingLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const headLine = headLines[i] || '';
      const workingLine = workingLines[i] || '';
      
      if (headLine !== workingLine) {
        if (!currentChunk) {
          // Start a new chunk
          const linePos = workingDoc.line(i + 1);
          currentChunk = {
            from: linePos.from,
            to: linePos.to,
            lineStart: i + 1,
            lineEnd: i + 1,
            type: 'change'
          };
        } else {
          // Extend current chunk
          const linePos = workingDoc.line(i + 1);
          currentChunk.to = linePos.to;
          currentChunk.lineEnd = i + 1;
        }
      } else if (currentChunk) {
        // End of current chunk
        chunks.push(currentChunk);
        currentChunk = null;
      }
    }
    
    // Add final chunk if it exists
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    this.chunks = chunks;
  }

  goToNextChunk() {
    if (!this.mergeView || !this.mergeView.b || this.chunks.length === 0) {
      console.log('No chunks available for navigation');
      return;
    }

    // Get current cursor position
    const currentPos = this.mergeView.b.state.selection.main.head;
    const currentLine = this.mergeView.b.state.doc.lineAt(currentPos).number;
    
    console.log('Current position:', currentPos, 'Current line:', currentLine);
    console.log('Available chunks:', this.chunks.map(c => `Line ${c.lineStart}-${c.lineEnd}`));
    
    // Find the next chunk after the current line
    let nextChunkIndex = this.chunks.findIndex(chunk => chunk.lineStart > currentLine);
    
    if (nextChunkIndex === -1) {
      // No chunk found after current position, wrap to first chunk
      nextChunkIndex = 0;
    }

    this.currentChunkIndex = nextChunkIndex;
    const targetChunk = this.chunks[nextChunkIndex];
    
    console.log('Navigating to chunk:', nextChunkIndex, 'Line:', targetChunk.lineStart);
    this.navigateToChunk(targetChunk);
  }

  goToPreviousChunk() {
    if (!this.mergeView || !this.mergeView.b || this.chunks.length === 0) {
      console.log('No chunks available for navigation');
      return;
    }

    // Get current cursor position
    const currentPos = this.mergeView.b.state.selection.main.head;
    const currentLine = this.mergeView.b.state.doc.lineAt(currentPos).number;
    
    console.log('Current position:', currentPos, 'Current line:', currentLine);
    
    // Find the previous chunk before the current line
    let prevChunkIndex = -1;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      if (this.chunks[i].lineStart < currentLine) {
        prevChunkIndex = i;
        break;
      }
    }
    
    if (prevChunkIndex === -1) {
      // No chunk found before current position, wrap to last chunk
      prevChunkIndex = this.chunks.length - 1;
    }

    this.currentChunkIndex = prevChunkIndex;
    const targetChunk = this.chunks[prevChunkIndex];
    
    console.log('Navigating to chunk:', prevChunkIndex, 'Line:', targetChunk.lineStart);
    this.navigateToChunk(targetChunk);
  }

  navigateToChunk(chunk) {
    if (!this.mergeView || !this.mergeView.b || !chunk) return;

    try {
      // Calculate the position at the start of the target line
      const targetLine = this.mergeView.b.state.doc.line(chunk.lineStart);
      const targetPos = targetLine.from;
      
      console.log(`Navigating to ${chunk.type} chunk at line ${chunk.lineStart}, position ${targetPos}`);
      
      // Move cursor to the beginning of the chunk line
      this.mergeView.b.dispatch({
        selection: { anchor: targetPos, head: targetPos },
        scrollIntoView: true,
        effects: EditorView.scrollIntoView(targetPos, { y: "center" })
      });

      // Focus the editor
      this.mergeView.b.focus();

    } catch (error) {
      console.error('Error navigating to chunk:', error);
    }
  }

  getWorkingContent() {
    if (!this.mergeView || !this.mergeView.b) return '';
    return this.mergeView.b.state.doc.toString();
  }

  getCursorPosition() {
    if (!this.mergeView || !this.mergeView.b) return { line: 1, character: 0 };
    
    const state = this.mergeView.b.state;
    const pos = state.selection.main.head;
    const line = state.doc.lineAt(pos);
    
    return {
      line: line.number,
      character: pos - line.from
    };
  }

  jumpToPosition(line, character) {
    if (!this.mergeView || !this.mergeView.b) return;
    
    try {
      const pos = this.mergeView.b.state.doc.line(line).from + character;
      this.mergeView.b.dispatch({
        selection: { anchor: pos, head: pos },
        scrollIntoView: true
      });
    } catch (error) {
      console.error('Error jumping to position:', error);
    }
  }

  destroy() {
    if (this.mergeView) {
      try {
        this.mergeView.destroy();
      } catch (error) {
        console.error('Error destroying merge view:', error);
      }
      this.mergeView = null;
    }
    this.chunks = [];
    this.currentChunkIndex = -1;
  }
}
