import { navigationHistory } from '../NavigationHistory.js';

export class NavigationManager {
  constructor(mergeEditor) {
    this.mergeEditor = mergeEditor;
    this.cursorUpdateTimer = null;
  }

  startCursorTracking() {
    // Set up periodic cursor position updates for navigation history
    if (this.cursorUpdateTimer) {
      clearInterval(this.cursorUpdateTimer);
    }
    
    this.cursorUpdateTimer = setInterval(() => {
      if (this.mergeEditor.mergeViewManager && this.mergeEditor.currentFile && !navigationHistory.isNavigating) {
        const pos = this.mergeEditor.mergeViewManager.getCursorPosition();
        navigationHistory.updateCurrentPosition(pos.line, pos.character);
      }
    }, 500); // Update every 500ms
  }

  stopCursorTracking() {
    if (this.cursorUpdateTimer) {
      clearInterval(this.cursorUpdateTimer);
      this.cursorUpdateTimer = null;
    }
  }

  async handleNavigateBack(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const position = navigationHistory.goBack();
    if (position) {
      await this.mergeEditor.loadFileContent(position.filePath, position.line, true);
      
      // Jump to the stored cursor position after loading
      setTimeout(() => {
        if (this.mergeEditor.mergeViewManager) {
          this.mergeEditor.mergeViewManager.jumpToPosition(position.line, position.character);
        }
        navigationHistory.clearNavigationFlag();
      }, 100);
    }
  }

  async handleNavigateForward(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const position = navigationHistory.goForward();
    if (position) {
      await this.mergeEditor.loadFileContent(position.filePath, position.line, true);
      
      // Jump to the stored cursor position after loading
      setTimeout(() => {
        if (this.mergeEditor.mergeViewManager) {
          this.mergeEditor.mergeViewManager.jumpToPosition(position.line, position.character);
        }
        navigationHistory.clearNavigationFlag();
      }, 100);
    }
  }

  async handleNavigateToHistory(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const { filePath, line, character } = event.detail;
    
    // Use the new navigateToPosition method to update the history state
    const position = navigationHistory.navigateToPosition(filePath, line, character);
    if (position) {
      await this.mergeEditor.loadFileContent(filePath, line, true);
      
      // Jump to the stored cursor position after loading
      setTimeout(() => {
        if (this.mergeEditor.mergeViewManager) {
          this.mergeEditor.mergeViewManager.jumpToPosition(line, character);
        }
        navigationHistory.clearNavigationFlag();
      }, 100);
    }
  }

  handleGoToDefinition(event) {
    const definition = event.detail;
    if (definition && definition.uri) {
      // Extract file path from URI
      const filePath = definition.uri.replace('file://', '');
      
      // Open the file and jump to position
      this.mergeEditor.loadFileContent(filePath).then(() => {
        if (this.mergeEditor.mergeViewManager && definition.range) {
          // Jump to the definition position
          this.mergeEditor.mergeViewManager.jumpToPosition(
            definition.range.start.line + 1,
            definition.range.start.character
          );
        }
      });
    }
  }

  handleShowReferences(event) {
    const references = event.detail;
    if (references && references.length > 0) {
      // For now, just log the references
      console.log('References found:', references);
      
      // TODO: Implement a references panel or quick pick dialog
      // to allow users to navigate through references
    }
  }

  scrollToLine(lineNumber) {
    if (!this.mergeEditor.mergeViewManager || !this.mergeEditor.mergeViewManager.mergeView || !this.mergeEditor.lineHighlight) {
      this.mergeEditor.pendingScrollToLine = lineNumber;
      return;
    }

    // Get the working editor (right side)
    const workingEditor = this.mergeEditor.mergeViewManager.mergeView.b;
    if (!workingEditor) {
      console.warn('MergeEditor: Working editor not available');
      return;
    }

    // Use the line highlight utility to scroll and highlight
    this.mergeEditor.lineHighlight.scrollToLine(workingEditor, lineNumber);
  }
}
