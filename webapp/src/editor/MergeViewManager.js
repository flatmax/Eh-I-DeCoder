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

export class MergeViewManager {
  constructor(container, options = {}) {
    this.container = container;
    this.mergeView = null;
    this.options = options;
    this.onContentChange = options.onContentChange || (() => {});
    this.shadowRoot = options.shadowRoot || null;
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
    
    // Create base extensions with VS Code dark theme
    // IMPORTANT: navigationOverrideKeymap MUST be first to have highest priority
    const baseExtensions = [
      navigationOverrideKeymap, // Absolute highest priority navigation override
      multiCursorKeymap, // Put multi-cursor second with highest precedence
      basicSetup,
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
  }
}
