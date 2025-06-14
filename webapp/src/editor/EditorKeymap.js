import {keymap} from '@codemirror/view';
import {defaultKeymap, indentWithTab} from '@codemirror/commands';
import {searchKeymap} from '@codemirror/search';
import {addCursorDown, addCursorUp} from './extensions/MultiCursorExtension.js';

export function createCommonKeymap(editor) {
  return [
    // Multi-cursor support - MUST come first to override defaults
    {
      key: "Shift-Alt-ArrowUp",
      run: addCursorUp,
      preventDefault: true
    },
    {
      key: "Shift-Alt-ArrowDown", 
      run: addCursorDown,
      preventDefault: true
    },
    // Save shortcut (Mod = Ctrl on Windows/Linux, Cmd on Mac)
    {
      key: "Mod-s",
      run: () => {
        editor.saveChanges();
        return true; // Prevent other keymap handlers
      }
    },
    ...searchKeymap, // Add search keyboard shortcuts
    // Next chunk navigation (Alt+n)
    {
      key: "Alt-n",
      run: () => {
        editor.goToNextChunk();
        return true;
      }
    },
    // Previous chunk navigation (Alt+p)
    {
      key: "Alt-p",
      run: () => {
        editor.goToPreviousChunk();
        return true;
      }
    },
    indentWithTab,
    ...defaultKeymap
  ];
}
