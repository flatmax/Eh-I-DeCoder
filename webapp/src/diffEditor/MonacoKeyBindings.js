import { EventHelper } from '../utils/EventHelper.js';

export class MonacoKeyBindings {
  setupKeyBindings(diffEditor, component) {
    if (!diffEditor) return;

    const modifiedEditor = diffEditor.getModifiedEditor();
    const originalEditor = diffEditor.getOriginalEditor();

    // Add save action to modified editor
    this._addSaveAction(modifiedEditor, component);
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
}
