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
  }

  destroy() {
    if (this.mergeView) {
      this.mergeView.destroy();
      this.mergeView = null;
    }
  }

  createMergeView(container, headContent, workingContent, unifiedView, editor) {
    // Destroy existing merge view
    this.destroy();
    
    // Clear container
    container.innerHTML = '';
    
    if (!headContent && !workingContent) return null;
    
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
          doc: workingContent,
          extensions: [
            basicSetup,
            searchConfig,
            getLanguageExtension(this.filePath),
            ...commonEditorTheme,
            keymap.of(commonKeymap),
            unifiedMergeView({
              original: headContent,
              highlightChanges: true,
              gutter: true,
              mergeControls: true
            })
          ],
          parent: container,
          root: this.shadowRoot
        });
      } else {
        // Create side-by-side MergeView
        this.mergeView = new MergeView({
          a: {
            doc: headContent,
            extensions: [
              basicSetup,
              searchConfig,
              getLanguageExtension(this.filePath),
              EditorState.readOnly.of(true), // Make left pane read-only
              ...commonEditorTheme
            ]
          },
          b: {
            doc: workingContent,
            extensions: [
              basicSetup,
              searchConfig,
              getLanguageExtension(this.filePath),
              ...commonEditorTheme,
              keymap.of(commonKeymap)
            ]
          },
          // Enhanced merge view options
          revertControls: true,
          highlightChanges: true,
          gutter: true,
          lineNumbers: true,
          parent: container,
          root: this.shadowRoot
        });
      }
      
      console.log(`MergeView created successfully (mode: ${unifiedView ? 'unified' : 'side-by-side'})`);
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
