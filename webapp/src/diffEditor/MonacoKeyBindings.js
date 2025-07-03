import { EventHelper } from '../utils/EventHelper.js';

export class MonacoKeyBindings {
  setupKeyBindings(diffEditor, component) {
    if (!diffEditor) return;

    const modifiedEditor = diffEditor.getModifiedEditor();
    const originalEditor = diffEditor.getOriginalEditor();

    // Add save action to modified editor
    this._addSaveAction(modifiedEditor, component);
    
    // Add Ctrl+Right-click handler to both editors
    this._addCtrlRightClickHandler(modifiedEditor, component);
    this._addCtrlRightClickHandler(originalEditor, component);
  }

  _addSaveAction(editor, component) {
    editor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: (editor) => {
        // Emit save event with the modified content using EventHelper
        EventHelper.dispatchSaveFile(component, editor.getValue());
      }
    });
  }

  _addCtrlRightClickHandler(editor, component) {
    editor.onContextMenu((e) => {
      // Check if Ctrl key is pressed
      if (e.event.ctrlKey || e.event.metaKey) {
        // Prevent the default context menu
        e.event.preventDefault();
        e.event.stopPropagation();
        
        // Handle the Ctrl+Right-click
        this._handleCtrlRightClick(editor, e, component);
        return;
      }
      
      // Allow normal context menu for non-Ctrl clicks
    });
  }

  _handleCtrlRightClick(editor, contextMenuEvent, component) {
    const position = contextMenuEvent.target.position;
    const model = editor.getModel();
    
    if (!position || !model) {
      return;
    }

    let textToSend = '';
    
    // First, try to get selected text
    const selection = editor.getSelection();
    if (selection && !selection.isEmpty()) {
      textToSend = model.getValueInRange(selection);
      console.log('MonacoKeyBindings: Using selected text:', textToSend);
    } else {
      // No selection, check if we're inside a string
      const stringContent = this._getStringAtPosition(model, position);
      if (stringContent) {
        textToSend = stringContent;
        console.log('MonacoKeyBindings: Using string content:', textToSend);
      } else {
        // Not in a string, get word at cursor position
        const word = model.getWordAtPosition(position);
        if (word) {
          textToSend = word.word;
          console.log('MonacoKeyBindings: Using word at cursor:', textToSend);
        }
      }
    }
    
    // If we have text to send, dispatch event to copy it to PromptView
    if (textToSend.trim()) {
      EventHelper.dispatchWordClicked(component, textToSend.trim());
    }
  }

  /**
   * Extract the entire string content if the cursor is positioned inside a string
   * @param {monaco.editor.ITextModel} model - The Monaco editor model
   * @param {monaco.IPosition} position - The cursor position
   * @returns {string|null} The string content or null if not inside a string
   */
  _getStringAtPosition(model, position) {
    const line = model.getLineContent(position.lineNumber);
    const column = position.column - 1; // Convert to 0-based index
    
    // Common string delimiters
    const stringDelimiters = ['"', "'", '`'];
    
    for (const delimiter of stringDelimiters) {
      const stringContent = this._extractStringWithDelimiter(line, column, delimiter);
      if (stringContent !== null) {
        return stringContent;
      }
    }
    
    return null;
  }

  /**
   * Extract string content for a specific delimiter, including the delimiters
   * @param {string} line - The line content
   * @param {number} column - The column position (0-based)
   * @param {string} delimiter - The string delimiter (", ', or `)
   * @returns {string|null} The string content including delimiters or null if not inside a string with this delimiter
   */
  _extractStringWithDelimiter(line, column, delimiter) {
    // Find all occurrences of the delimiter in the line
    const positions = [];
    for (let i = 0; i < line.length; i++) {
      if (line[i] === delimiter) {
        // Check if it's escaped (simple check - doesn't handle all edge cases)
        let isEscaped = false;
        let backslashCount = 0;
        for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) {
          backslashCount++;
        }
        isEscaped = backslashCount % 2 === 1;
        
        if (!isEscaped) {
          positions.push(i);
        }
      }
    }
    
    // Find the string boundaries that contain the cursor position
    for (let i = 0; i < positions.length - 1; i += 2) {
      const startPos = positions[i];
      const endPos = positions[i + 1];
      
      if (startPos < column && column < endPos) {
        // Cursor is inside this string - return content INCLUDING the delimiters
        return line.substring(startPos, endPos + 1); // Include both start and end delimiters
      }
    }
    
    return null;
  }
}
