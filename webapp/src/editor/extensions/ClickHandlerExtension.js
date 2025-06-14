import { EditorView } from '@codemirror/view';
import { goToDefinition } from './utils/NavigationUtils.js';
import { getTextAtPosition } from './utils/TextUtils.js';

export function createClickHandlerExtension(languageClient, fileUri) {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if (event.button === 0 && (event.ctrlKey || event.metaKey)) {
        // Left click with Ctrl/Cmd - go to definition
        event.preventDefault();

        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos !== null) {
          view.dispatch({ selection: { anchor: pos } });
          goToDefinition(view, languageClient, fileUri);
          return true;
        }
      }
    },
    contextmenu(event, view) {
      if (event.ctrlKey || event.metaKey) {
        // Right click with Ctrl/Cmd - add word to prompt
        event.preventDefault();
        
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos !== null) {
          // Get the text at the clicked position (quoted string or word)
          const text = getTextAtPosition(view, pos);
          
          if (text.trim()) {
            // Dispatch event to add text to prompt
            document.dispatchEvent(new CustomEvent('word-clicked', {
              detail: { word: text.trim() },
              bubbles: true,
              composed: true
            }));
          }
          
          return true;
        }
      }
    }
  });
}
