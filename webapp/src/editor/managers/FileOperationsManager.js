import { navigationHistory } from '../NavigationHistory.js';

export class FileOperationsManager {
  constructor(mergeEditor) {
    this.mergeEditor = mergeEditor;
  }

  async loadFileContent(filePath, lineNumber = null, isNavigating = false) {
    if (!this.mergeEditor.fileLoader) {
      console.error('File loader not initialized');
      return;
    }

    // If we're already loading this file with the same line number, don't load again
    if (this.mergeEditor.loadingPromise && this.mergeEditor.currentFile === filePath && this.mergeEditor.pendingScrollToLine === lineNumber) {
      return this.mergeEditor.loadingPromise;
    }

    // Get cursor position before switching files
    let fromLine = 1;
    let fromChar = 0;
    if (this.mergeEditor.mergeViewManager && this.mergeEditor.currentFile) {
      const pos = this.mergeEditor.mergeViewManager.getCursorPosition();
      fromLine = pos.line;
      fromChar = pos.character;
    }

    // Store the line number for later scrolling if provided
    if (lineNumber !== null) {
      this.mergeEditor.pendingScrollToLine = lineNumber;
    } else {
      this.mergeEditor.pendingScrollToLine = null;
    }

    this.mergeEditor.isLoading = true;
    this.mergeEditor.previousFile = this.mergeEditor.currentFile;
    this.mergeEditor.currentFile = filePath;

    // Create and store the loading promise
    this.mergeEditor.loadingPromise = this.performFileLoad(filePath, fromLine, fromChar, lineNumber || 1, 0, isNavigating);
    
    try {
      await this.mergeEditor.loadingPromise;
    } finally {
      this.mergeEditor.loadingPromise = null;
    }
  }

  async performFileLoad(filePath, fromLine, fromChar, toLine, toChar, isNavigating) {
    try {
      const { headContent, workingContent } = await this.mergeEditor.fileLoader.loadFileContent(filePath);
      this.mergeEditor.headContent = headContent;
      this.mergeEditor.workingContent = workingContent;
      this.mergeEditor.originalWorkingContent = workingContent;
      
      // Stop cursor tracking while switching files
      this.mergeEditor.navigationManager.stopCursorTracking();
      
      // Destroy existing merge view manager if switching files
      if (this.mergeEditor.mergeViewManager) {
        this.mergeEditor.mergeViewManager.destroy();
        this.mergeEditor.mergeViewManager = null;
      }
      
      this.mergeEditor.hasChanges = false;
      this.mergeEditor.isLoading = false;
      
      // Record file switch in navigation history (unless we're navigating)
      if (!isNavigating) {
        navigationHistory.recordFileSwitch(
          this.mergeEditor.previousFile,
          fromLine,
          fromChar,
          filePath,
          toLine,
          toChar
        );
      }
      
      // Emit event to notify tree components about the file change
      this.dispatchFileLoadedEvent(filePath);
      
      // The merge view will be initialized in updated() lifecycle
      // and any pending scroll will be handled there
    } catch (error) {
      console.error('Failed to load file:', error);
      this.mergeEditor.isLoading = false;
      this.mergeEditor.pendingScrollToLine = null; // Clear pending scroll on error
      throw error;
    }
  }

  async saveFile() {
    const editor = this.mergeEditor;
    if (!editor.currentFile || !editor.hasChanges || !editor.fileLoader || !editor.mergeViewManager) return;

    editor.isLoading = true;

    try {
      const content = editor.mergeViewManager.getWorkingContent();
      await editor.fileLoader.saveFileContent(editor.currentFile, content);
      
      editor.originalWorkingContent = content;
      editor.workingContent = content;
      editor.hasChanges = false;
      editor.isLoading = false;
      
      // Notify user of successful save
      editor.dispatchEvent(new CustomEvent('file-saved', {
        detail: { filePath: editor.currentFile },
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      console.error('Failed to save file:', error);
      editor.isLoading = false;
    }
  }

  async reloadFile() {
    const editor = this.mergeEditor;
    if (!editor.currentFile) return;
    
    // Confirm if there are unsaved changes
    if (editor.hasChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to reload?');
      if (!confirm) return;
    }
    
    await this.loadFileContent(editor.currentFile);
  }

  reloadIfCurrentFile(data) {
    const filePath = data.filePath;
    const editor = this.mergeEditor;
    
    // Only reload if this is the currently open file
    if (filePath === editor.currentFile) {
      console.log(`Reloading current file ${filePath} due to external save`);
      
      // Get current cursor position to restore after reload
      let currentLine = 1;
      let currentChar = 0;
      if (editor.mergeViewManager) {
        const pos = editor.mergeViewManager.getCursorPosition();
        currentLine = pos.line;
        currentChar = pos.character;
      }
      
      // Reload the file content
      this.loadFileContent(filePath, null, true).then(() => {
        // Restore cursor position after reload
        setTimeout(() => {
          if (editor.mergeViewManager) {
            editor.mergeViewManager.jumpToPosition(currentLine, currentChar);
          }
        }, 100);
      });
    }
  }

  dispatchFileLoadedEvent(filePath) {
    this.mergeEditor.dispatchEvent(new CustomEvent('file-loaded-in-editor', {
      detail: { filePath },
      bubbles: true,
      composed: true
    }));
  }
}
