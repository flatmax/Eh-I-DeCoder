import {EditorView} from '@codemirror/view';
import {EditorSelection} from '@codemirror/state';

export class LineHighlight {
  constructor(shadowRoot) {
    this.shadowRoot = shadowRoot;
  }

  /**
   * Add highlight style to the shadow DOM if not already present
   */
  addHighlightStyle() {
    if (!this.shadowRoot.querySelector('style.highlight-styles')) {
      const style = document.createElement('style');
      style.className = 'highlight-styles';
      style.textContent = `
        .line-highlight-effect {
          background-color: rgba(255, 255, 0, 0.3) !important;
          outline: 2px solid gold !important;
          animation: pulse-highlight 1.5s ease-in-out;
        }
        @keyframes pulse-highlight {
          0%, 100% { background-color: rgba(255, 255, 0, 0.3); }
          50% { background-color: rgba(255, 255, 0, 0.5); }
        }
      `;
      this.shadowRoot.appendChild(style);
    }
  }

  /**
   * Find the DOM element for a specific line
   * @param {EditorView} view - The editor view
   * @param {number} lineNum - Line number to find
   * @return {HTMLElement|null} The line element or null if not found
   */
  findLineElement(view, lineNum) {
    try {
      // Get line info
      const line = view.state.doc.line(lineNum);
      
      // Find the DOM element using the line's position
      const posDOM = view.domAtPos(line.from);
      if (posDOM && posDOM.node) {
        // Find the line element by walking up the DOM tree
        let lineElement = posDOM.node;
        while (lineElement && !lineElement.classList?.contains('cm-line')) {
          lineElement = lineElement.parentElement;
        }
        return lineElement;
      }
    } catch (error) {
      console.error('Error finding line element:', error);
    }
    return null;
  }

  /**
   * Scrolls to a specific line in the editor
   * @param {EditorView} view - The editor view
   * @param {number} lineNumber - The line number to scroll to
   */
  scrollToLine(view, lineNumber) {
    if (!view || !lineNumber) return;
    
    // Convert string to integer if needed
    if (typeof lineNumber === 'string') {
      lineNumber = parseInt(lineNumber, 10);
    }
    
    if (!view.state) return;
    
    try {
      // Get document line count and clamp line number
      const lineCount = view.state.doc.lines;
      const line = Math.min(lineNumber, lineCount);
      
      // Get position of the line
      const pos = view.state.doc.line(line).from;
      
      // Dispatch command to scroll and select the line
      view.dispatch({
        selection: EditorSelection.create([EditorSelection.range(pos, pos)]),
        scrollIntoView: true,
        effects: EditorView.scrollIntoView(pos, { y: "center" })
      });
      
      // Focus the editor
      view.focus();
      
      // Add visual highlight to the line
      this.addHighlightStyle();
      const lineElement = this.findLineElement(view, line);
      if (lineElement) {
        lineElement.classList.add('line-highlight-effect');
        setTimeout(() => {
          lineElement.classList.remove('line-highlight-effect');
        }, 8000);
      }
    } catch (error) {
      console.error('Error scrolling to line:', error);
    }
  }
}
