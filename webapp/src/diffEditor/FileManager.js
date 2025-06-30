import { navigationHistory } from './NavigationHistory.js';
import { EventHelper } from '../utils/EventHelper.js';

export class FileManager {
  constructor(diffEditor) {
    this.diffEditor = diffEditor;
    this.fileLoader = null;
  }

  setFileLoader(fileLoader) {
    this.fileLoader = fileLoader;
  }

  async loadFileContent(filePath, lineNumber = null, characterNumber = null) {
    if (!this.fileLoader) {
      console.error('File loader not initialized');
      return;
    }

    // Record the file switch in navigation history
    const fromFile = this.diffEditor.currentFile;
    const fromLine = this.diffEditor.navigationManager.getLastCursorPosition().line;
    const fromChar = this.diffEditor.navigationManager.getLastCursorPosition().character;
    const toLine = lineNumber || 1;
    const toChar = characterNumber || 1;

    this.diffEditor.isLoading = true;
    this.diffEditor.currentFile = filePath;

    try {
      const { headContent, workingContent } = await this.fileLoader.loadFileContent(filePath);
      this.diffEditor.headContent = headContent;
      this.diffEditor.workingContent = workingContent;
      this.diffEditor.isLoading = false;
      
      console.log('File content loaded:', {
        filePath,
        headLength: headContent.length,
        workingLength: workingContent.length
      });

      // Emit event to notify FileTree/RepoTree that a file has been loaded using EventHelper
      EventHelper.dispatchFileLoadedInEditor(filePath);

      // Record in navigation history
      this.diffEditor.navigationManager.recordFileSwitch(fromFile, fromLine, fromChar, filePath, toLine, toChar);

      // Wait for the editor to be ready, then scroll to position
      await this.diffEditor.updateComplete;
      const monacoEditor = this.diffEditor.shadowRoot.querySelector('monaco-diff-editor');
      if (monacoEditor && (lineNumber || characterNumber)) {
        monacoEditor.scrollToPosition(lineNumber || 1, characterNumber || 1);
      }

      // Clear navigation flag after navigation is complete
      setTimeout(() => {
        this.diffEditor.navigationManager.clearNavigationFlag();
      }, 100);
    } catch (error) {
      console.error('Failed to load file:', error);
      this.diffEditor.isLoading = false;
    }
  }

  async reloadIfCurrentFile(data) {
    const filePath = data.filePath;
    
    // Only reload if this is the currently open file
    if (filePath === this.diffEditor.currentFile) {
      console.log(`Checking if reload needed for ${filePath} due to external save`);
      
      // Get the current content from the editor
      const monacoEditor = this.diffEditor.shadowRoot.querySelector('monaco-diff-editor');
      const currentContent = monacoEditor?.getModifiedContent();
      
      // Load the new content from disk
      try {
        const { headContent, workingContent } = await this.fileLoader.loadFileContent(filePath);
        
        // Only reload if the content has actually changed
        if (currentContent !== workingContent) {
          console.log(`Content changed, reloading file ${filePath}`);
          
          // Store current cursor position
          const cursorPosition = this.diffEditor.navigationManager.getLastCursorPosition();
          
          // Update the content
          this.diffEditor.headContent = headContent;
          this.diffEditor.workingContent = workingContent;
          
          // Wait for the editor to update, then restore cursor position
          await this.diffEditor.updateComplete;
          if (monacoEditor) {
            monacoEditor.scrollToPosition(cursorPosition.line, cursorPosition.character);
          }
        } else {
          console.log(`Content unchanged, skipping reload for ${filePath}`);
        }
      } catch (error) {
        console.error('Failed to check file content:', error);
      }
    }
  }
}
