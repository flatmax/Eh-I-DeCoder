import { navigationHistory } from './NavigationHistory.js';

export class NavigationManager {
  constructor(diffEditor) {
    this.diffEditor = diffEditor;
    this.lastCursorPosition = { line: 1, character: 1 };
  }

  handleNavigateToHistory(event) {
    const { filePath, line, character } = event.detail;
    
    // Navigate to the position in history
    const position = navigationHistory.navigateToPosition(filePath, line, character);
    if (position) {
      // Load the file at the specified position
      this.diffEditor.fileManager.loadFileContent(position.filePath, position.line, position.character);
    }
  }

  handleCursorPositionChanged(event) {
    const { line, character } = event.detail;
    this.lastCursorPosition = { line, character };
    
    // Update current position in navigation history
    navigationHistory.updateCurrentPosition(line, character);
  }

  handleNavigationBack(event) {
    const position = navigationHistory.goBack();
    if (position) {
      this.diffEditor.fileManager.loadFileContent(position.filePath, position.line, position.character);
    }
  }

  handleNavigationForward(event) {
    const position = navigationHistory.goForward();
    if (position) {
      this.diffEditor.fileManager.loadFileContent(position.filePath, position.line, position.character);
    }
  }

  recordFileSwitch(fromFile, fromLine, fromChar, toFile, toLine, toChar) {
    navigationHistory.recordFileSwitch(fromFile, fromLine, fromChar, toFile, toLine, toChar);
  }

  clearNavigationFlag() {
    navigationHistory.clearNavigationFlag();
  }

  getLastCursorPosition() {
    return this.lastCursorPosition;
  }
}
