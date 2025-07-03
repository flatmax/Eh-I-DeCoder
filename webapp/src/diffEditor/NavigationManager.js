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

  handleNavigationTrackPrevious(event) {
    const previousTrackId = navigationHistory.switchToPreviousTrack();
    console.log(`Switched to track ${previousTrackId}`);
    
    // If there's a current file in the new track, navigate to it
    const track = navigationHistory.getCurrentTrack();
    if (track && track.current) {
      this.diffEditor.fileManager.loadFileContent(track.current.filePath, track.current.line, track.current.character);
    }
  }

  handleNavigationTrackNext(event) {
    const nextTrackId = navigationHistory.switchToNextTrack();
    console.log(`Switched to track ${nextTrackId}`);
    
    // If there's a current file in the new track, navigate to it
    const track = navigationHistory.getCurrentTrack();
    if (track && track.current) {
      this.diffEditor.fileManager.loadFileContent(track.current.filePath, track.current.line, track.current.character);
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
