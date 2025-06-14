import { keymap } from '@codemirror/view';
import { goToDefinition, findReferences, openFindInFiles } from './utils/NavigationUtils.js';

export function createKeyBindingsExtension(languageClient, fileUri) {
  // Create navigation keybindings with highest precedence
  const navigationKeymap = keymap.of([
    {
      key: 'Alt-ArrowLeft',
      mac: 'Cmd-ArrowLeft',
      run: (view) => {
        // Dispatch navigate-back event
        view.dom.dispatchEvent(new CustomEvent('navigate-back', {
          bubbles: true,
          composed: true
        }));
        return true;
      },
      preventDefault: true,
      stopPropagation: true
    },
    {
      key: 'Alt-ArrowRight',
      mac: 'Cmd-ArrowRight',
      run: (view) => {
        // Dispatch navigate-forward event
        view.dom.dispatchEvent(new CustomEvent('navigate-forward', {
          bubbles: true,
          composed: true
        }));
        return true;
      },
      preventDefault: true,
      stopPropagation: true
    }
  ], {
    // Highest precedence to ensure these override default word navigation
    precedence: "highest"
  });

  // Create other keybindings with high precedence
  const otherKeymap = keymap.of([
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
  ], {
    precedence: "high"
  });

  // Return both keymaps, with navigation first to ensure highest priority
  return [navigationKeymap, otherKeymap];
}
