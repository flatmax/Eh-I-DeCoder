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
        if (editor.saveChanges) {
          editor.saveChanges();
        }
        return true; // Prevent other keymap handlers
      }
    },
    ...searchKeymap, // Add search keyboard shortcuts
    // Next chunk navigation (Alt+n) - now handled in MergeViewManager
    {
      key: "Alt-n",
      run: () => {
        if (editor.goToNextChunk) {
          editor.goToNextChunk();
        } else if (editor.mergeViewManager && editor.mergeViewManager.goToNextChunk) {
          editor.mergeViewManager.goToNextChunk();
        }
        return true;
      }
    },
    // Previous chunk navigation (Alt+p) - now handled in MergeViewManager
    {
      key: "Alt-p",
      run: () => {
        if (editor.goToPreviousChunk) {
          editor.goToPreviousChunk();
        } else if (editor.mergeViewManager && editor.mergeViewManager.goToPreviousChunk) {
          editor.mergeViewManager.goToPreviousChunk();
        }
        return true;
      }
    },
    indentWithTab,
    ...defaultKeymap
  ];
}
