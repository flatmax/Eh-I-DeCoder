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
      // No selection, get word at cursor position
      const word = model.getWordAtPosition(position);
      if (word) {
        textToSend = word.word;
        console.log('MonacoKeyBindings: Using word at cursor:', textToSend);
      }
    }
    
    // If we have text to send, dispatch event to copy it to PromptView
    if (textToSend.trim()) {
      EventHelper.dispatchWordClicked(component, textToSend.trim());
    }
  }
}
