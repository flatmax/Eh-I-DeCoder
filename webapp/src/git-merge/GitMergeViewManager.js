import {LineHighlight} from '../editor/LineHighlight.js';
import {MergeViewManager} from '../editor/MergeViewManager.js';

export class GitMergeViewManager {
  constructor(gitMergeView) {
    this.view = gitMergeView;
    this.lineHighlight = null;
    this.mergeViewManager = null;
  }

  initialize() {
    this.lineHighlight = new LineHighlight(this.view.shadowRoot);
    this.mergeViewManager = new MergeViewManager(this.view.shadowRoot.querySelector('.merge-container'), {
      shadowRoot: this.view.shadowRoot,
      onContentChange: () => {
        // Notify the view that content has changed
        if (this.view.onContentChange) {
          this.view.onContentChange();
        }
      }
    });
  }

  cleanup() {
    this.mergeViewManager?.destroy();
  }

  updateMergeView() {
    const container = this.view.shadowRoot.querySelector('.merge-container');
    if (!container || !this.mergeViewManager) return;
    
    try {
      // Recreate the MergeViewManager with the container
      this.mergeViewManager.container = container;
      
      // Determine if this is read-only mode
      let readOnly = this.view.gitHistoryMode && !this.view.hasConflicts;
      
      // For git editor mode, make it editable
      if (this.view.gitEditorMode) {
        readOnly = false;
      }
      
      // Initialize the merge view with the correct parameters
      this.mergeViewManager.initialize(
        this.view.selectedFile || '',
        this.view.fromContent || '',
        this.view.toContent || '',
        this.view.languageClient,
        this.view.languageClientConnected
      );
    } catch (error) {
      console.error('Error creating MergeView:', error);
      this.view.error = `Failed to create merge view: ${error.message}`;
      this.view.requestUpdate();
    }
  }

  getCurrentContent() {
    if (!this.mergeViewManager) return '';
    return this.mergeViewManager.getWorkingContent();
  }

  goToNextChunk() {
    // TODO: Implement chunk navigation if needed
    console.warn('goToNextChunk not implemented');
  }

  goToPreviousChunk() {
    // TODO: Implement chunk navigation if needed
    console.warn('goToPreviousChunk not implemented');
  }
}
