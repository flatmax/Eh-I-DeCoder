import {EditorView, keymap} from '@codemirror/view';
import {EditorState} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {MergeView, unifiedMergeView, goToNextChunk, goToPreviousChunk} from '@codemirror/merge';
import {search} from '@codemirror/search';
import {commonEditorTheme} from './EditorThemes.js';
import {createCommonKeymap} from './EditorKeymap.js';
import {getLanguageExtension} from './LanguageExtensions.js';

export class MergeViewManager {
  constructor(shadowRoot, filePath) {
    this.shadowRoot = shadowRoot;
    this.filePath = filePath;
    this.mergeView = null;
    this.wordClickHandler = null;
  }

  destroy() {
    if (this.mergeView) {
      this.mergeView.destroy();
      this.mergeView = null;
    }
  }

  /**
   * Set the handler function for word clicks
   * @param {Function} handler - Function to call when a word is Ctrl+clicked
   */
  setWordClickHandler(handler) {
    this.wordClickHandler = handler;
  }

  /**
   * Get the word at a specific position in the editor
   * @param {EditorView} view - The CodeMirror view
   * @param {number} pos - The position in the document
   * @returns {string|null} - The word at the position, or null if not found
   */
  getWordAtPosition(view, pos) {
    const doc = view.state.doc;
    const line = doc.lineAt(pos);
    const lineText = line.text;
    const lineStart = line.from;
    const relativePos = pos - lineStart;
    
    // Regular expression to match identifiers, keywords, and other code elements
    // Matches letters, numbers, underscores, dollar signs, and hyphens (common in various languages)
    const wordRegex = /[a-zA-Z_$][a-zA-Z0-9_$-]*/g;
    let match;
    
    while ((match = wordRegex.exec(lineText)) !== null) {
      const wordStart = match.index;
      const wordEnd = match.index + match[0].length;
      
      // Check if the click position is within this word
      if (relativePos >= wordStart && relativePos <= wordEnd) {
        return match[0];
      }
    }
    
    return null;
  }

  /**
   * Create a click handler extension for CodeMirror
   * @returns {Extension} - CodeMirror extension for handling clicks
   */
  createClickHandler() {
    return EditorView.domEventHandlers({
      mousedown: (event, view) => {
        // Only handle Ctrl+click (or Cmd+click on Mac)
        if (!(event.ctrlKey || event.metaKey)) {
          return false;
        }
        
        // Get the position of the click
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos === null) {
          return false;
        }
        
        // Get the word at this position
        const word = this.getWordAtPosition(view, pos);
        if (word && this.wordClickHandler) {
          // Prevent default behavior and call our handler
          event.preventDefault();
          event.stopPropagation();
          this.wordClickHandler(word);
          return true;
        }
        
        return false;
      }
    });
  }

  createMergeView(container, headContent, workingContent, unifiedView, editor, readOnly = false) {
    // Destroy existing merge view
    this.destroy();
    
    // Clear container
    container.innerHTML = '';
    
    try {
      // Create search configuration with panel at top
      const searchConfig = search({
        top: true // This places the search panel at the top instead of bottom
      });
      
      // Common keyboard shortcuts
      const commonKeymap = createCommonKeymap(editor);
      
      if (unifiedView) {
        // Create unified view (single editor with the unifiedMergeView extension)
        this.mergeView = new EditorView({
          doc: workingContent || '',
          extensions: [
            basicSetup,
            searchConfig,
            getLanguageExtension(this.filePath),
            ...commonEditorTheme,
            keymap.of(commonKeymap),
            this.createClickHandler(),
            ...(readOnly ? [EditorState.readOnly.of(true)] : []),
            unifiedMergeView({
              original: headContent || '',
              highlightChanges: true,
              gutter: true,
              mergeControls: !readOnly
            })
          ],
          parent: container,
          root: this.shadowRoot
        });
      } else {
        // Create side-by-side MergeView
        this.mergeView = new MergeView({
          a: {
            doc: headContent || '',
            extensions: [
              basicSetup,
              searchConfig,
              getLanguageExtension(this.filePath),
              EditorState.readOnly.of(true), // Left pane is always read-only
              ...commonEditorTheme,
              this.createClickHandler()
            ]
          },
          b: {
            doc: workingContent || '',
            extensions: [
              basicSetup,
              searchConfig,
              getLanguageExtension(this.filePath),
              ...commonEditorTheme,
              keymap.of(commonKeymap),
              this.createClickHandler(),
              ...(readOnly ? [EditorState.readOnly.of(true)] : [])
            ]
          },
          // Enhanced merge view options
          revertControls: !readOnly,
          highlightChanges: true,
          gutter: true,
          lineNumbers: true,
          parent: container,
          root: this.shadowRoot
        });
      }
      
      console.log(`MergeView created successfully (mode: ${unifiedView ? 'unified' : 'side-by-side'}, readOnly: ${readOnly})`);
      return this.mergeView;
    } catch (error) {
      console.error('Error creating MergeView:', error);
      throw error;
    }
  }

  getCurrentContent(unifiedView) {
    if (!this.mergeView) return '';
    
    if (unifiedView) {
      return this.mergeView.state.doc.toString();
    } else if (this.mergeView.b) {
      return this.mergeView.b.state.doc.toString();
    }
    return '';
  }

  // Navigate to next chunk in the diff view and center it
  goToNextChunk(unifiedView) {
    if (!this.mergeView) return;
    
    if (!unifiedView && this.mergeView.b) {
      const view = this.mergeView.b;
      goToNextChunk(view);
      this._centerActiveSelection(view);
    } else if (unifiedView) {
      const view = this.mergeView;
      goToNextChunk(view);
      this._centerActiveSelection(view);
    }
  }
  
  // Navigate to previous chunk in the diff view and center it
  goToPreviousChunk(unifiedView) {
    if (!this.mergeView) return;
    
    if (!unifiedView && this.mergeView.b) {
      const view = this.mergeView.b;
      goToPreviousChunk(view);
      this._centerActiveSelection(view);
    } else if (unifiedView) {
      const view = this.mergeView;
      goToPreviousChunk(view);
      this._centerActiveSelection(view);
    }
  }
  
  // Helper method to center the current selection/cursor in view
  _centerActiveSelection(view) {
    const selection = view.state.selection.main;
    view.dispatch({
      effects: EditorView.scrollIntoView(selection, {
        y: "center"
      })
    });
  }

  scrollToLine(lineNumber, unifiedView) {
    if (!this.mergeView || !lineNumber) return;
    
    // Determine which view to use based on mode
    const view = unifiedView ? this.mergeView : this.mergeView.b;
    return view;
  }
}
