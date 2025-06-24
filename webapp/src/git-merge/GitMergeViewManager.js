import {LineHighlight} from '../editor/LineHighlight.js';

export class GitMergeViewManager {
  constructor(gitMergeView) {
    this.view = gitMergeView;
    this.lineHighlight = null;
  }

  initialize() {
    this.lineHighlight = new LineHighlight(this.view.shadowRoot);
  }

  cleanup() {
    // Monaco handles its own cleanup
  }

  updateMergeView() {
    // Monaco updates automatically through property binding
    // No need to recreate the view
    const monacoEditor = this.view.shadowRoot.querySelector('monaco-diff-editor');
    if (!monacoEditor) return;
    
    // For unified view in git editor mode, we're showing only modified content
    if (this.view.gitEditorMode || this.view.unifiedView) {
      // Monaco diff editor always shows side-by-side
      // For unified view, we set original to empty
      monacoEditor.updateContent('', this.view.toContent || '', this.view.getLanguageFromFile(this.view.selectedFile));
    }
  }

  getCurrentContent() {
    const monacoEditor = this.view.shadowRoot.querySelector('monaco-diff-editor');
    return monacoEditor?.getModifiedContent() || '';
  }

  goToNextChunk() {
    // Monaco doesn't directly expose chunk navigation
    // Would need to implement using the diff information
    console.warn('Chunk navigation not yet implemented for Monaco');
  }

  goToPreviousChunk() {
    console.warn('Chunk navigation not yet implemented for Monaco');
  }
}
