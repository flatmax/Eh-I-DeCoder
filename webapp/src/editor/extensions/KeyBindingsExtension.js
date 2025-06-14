import { keymap } from '@codemirror/view';
import { goToDefinition, findReferences, openFindInFiles } from './utils/NavigationUtils.js';

export function createKeyBindingsExtension(languageClient, fileUri) {
  return keymap.of([
    {
      key: 'F12',
      run: (view) => {
        goToDefinition(view, languageClient, fileUri);
        return true;
      }
    },
    {
      key: 'Ctrl-F12',
      mac: 'Cmd-F12',
      run: (view) => {
        findReferences(view, languageClient, fileUri);
        return true;
      }
    },
    {
      key: 'Mod-s',
      run: (view) => {
        // Dispatch a custom save event that the MergeEditor can handle
        view.dom.dispatchEvent(new CustomEvent('editor-save', {
          bubbles: true,
          composed: true
        }));
        return true; // Prevent browser's default save behavior
      }
    },
    {
      key: 'Ctrl-Shift-f',
      mac: 'Cmd-Shift-f',
      run: (view) => {
        openFindInFiles(view);
        return true;
      }
    }
  ]);
}
