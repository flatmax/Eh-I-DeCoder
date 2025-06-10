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
    this.mergeViewManager = new MergeViewManager(this.view.shadowRoot, '');
  }

  cleanup() {
    this.mergeViewManager?.destroy();
  }

  updateMergeView() {
    const container = this.view.shadowRoot.querySelector('.merge-container');
    if (!container || !this.mergeViewManager) return;
    
    try {
      this.mergeViewManager.filePath = this.view.selectedFile;
      
      // Determine if this is read-only mode
      let readOnly = this.view.gitHistoryMode && !this.view.hasConflicts;
      
      // For rebase todo mode, make it editable
      if (this.view.rebaseTodoMode) {
        readOnly = false;
      }
      
      this.mergeViewManager.createMergeView(
        container,
        this.view.fromContent || '',
        this.view.toContent || '',
        this.view.unifiedView || this.view.rebaseTodoMode, // Force unified view for rebase todo
        this.view,
        readOnly
      );
    } catch (error) {
      console.error('Error creating MergeView:', error);
      this.view.error = `Failed to create merge view: ${error.message}`;
      this.view.requestUpdate();
    }
  }

  getCurrentContent() {
    if (!this.mergeViewManager) return '';
    return this.mergeViewManager.getCurrentContent(this.view.unifiedView || this.view.rebaseTodoMode);
  }

  goToNextChunk() {
    this.mergeViewManager?.goToNextChunk(this.view.unifiedView);
  }

  goToPreviousChunk() {
    this.mergeViewManager?.goToPreviousChunk(this.view.unifiedView);
  }
}
