import { EventHelper } from '../utils/EventHelper.js';

export class MonacoKeyBindings {
  setupKeyBindings(diffEditor, component) {
    if (!diffEditor) return;

    const modifiedEditor = diffEditor.getModifiedEditor();
    const originalEditor = diffEditor.getOriginalEditor();

    // Add save action to modified editor
    this._addSaveAction(modifiedEditor, component);
    
    // Add find in files action to both editors
    this._addFindInFilesAction(modifiedEditor, component);
    this._addFindInFilesAction(originalEditor, component);
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

  _addFindInFilesAction(editor, component) {
    editor.addAction({
      id: 'find-in-files',
      label: 'Find in Files',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.6,
      run: (editor) => {
        // Get selected text from the editor
        const selection = editor.getSelection();
        let selectedText = '';
        
        if (selection && !selection.isEmpty()) {
          selectedText = editor.getModel().getValueInRange(selection);
        }
        
        // Emit find-in-files event with selected text using EventHelper
        EventHelper.dispatchRequestFindInFiles(component, selectedText);
      }
    });
  }
}
