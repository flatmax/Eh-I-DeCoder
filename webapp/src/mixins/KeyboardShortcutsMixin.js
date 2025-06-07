import { deepQuerySelector, getAllCustomElements } from '../Utils.js';

export const KeyboardShortcutsMixin = (superClass) => class extends superClass {
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this._handleKeyboardShortcuts.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this._handleKeyboardShortcuts.bind(this));
  }

  /**
   * Handle keyboard shortcuts globally
   */
  _handleKeyboardShortcuts(event) {
    // Ctrl+Shift+F: Focus search input
    if (event.ctrlKey && event.shiftKey && event.key === 'F') {
      event.preventDefault();
      this._focusSearchInput();
    }
  }

  /**
   * Get selected text from the MergeEditor if available
   * @returns {string} The selected text, or empty string if no selection
   */
  _getSelectedTextFromMergeEditor() {
    try {
      // Look for merge-editor component
      const mergeEditor = this.renderRoot.querySelector('merge-editor');
      if (mergeEditor && typeof mergeEditor.getSelectedText === 'function') {
        const selectedText = mergeEditor.getSelectedText();
        console.log('Found selected text in MergeEditor:', selectedText);
        return selectedText;
      }
      
      // Try a deep search if not found directly
      const deepMergeEditor = deepQuerySelector(this.renderRoot, 'merge-editor');
      if (deepMergeEditor && typeof deepMergeEditor.getSelectedText === 'function') {
        const selectedText = deepMergeEditor.getSelectedText();
        console.log('Found selected text in MergeEditor (deep search):', selectedText);
        return selectedText;
      }
      
      return '';
    } catch (error) {
      console.error('Error getting selected text from MergeEditor:', error);
      return '';
    }
  }

  /**
   * Focus the search input in FindInFiles
   */
  _focusSearchInput() {
    // Get selected text from MergeEditor first
    const selectedText = this._getSelectedTextFromMergeEditor();
    
    // Switch to the search tab (index 1)
    this.activeTabIndex = 1;
    this.requestUpdate();
    
    // Wait for the DOM update to complete
    this.updateComplete.then(() => {
      // Try multiple times with delays to account for lazy loading
      this._tryFocusSearchInput(0, selectedText);
    });
  }

  /**
   * Try to focus search input with retries
   * @param {number} attempt - Current attempt number
   * @param {string} selectedText - Text to populate in the search input
   */
  _tryFocusSearchInput(attempt, selectedText = '') {
    const maxAttempts = 5;
    const delay = attempt * 100; // Increasing delay: 0ms, 100ms, 200ms, etc.
    
    setTimeout(() => {
      // First try renderRoot
      let findInFiles = this.renderRoot.querySelector('find-in-files');
      
      if (!findInFiles) {
        // Try looking in the sidebar's shadow root
        const sidebar = this.renderRoot.querySelector('app-sidebar');
        if (sidebar && sidebar.shadowRoot) {
          findInFiles = sidebar.shadowRoot.querySelector('find-in-files');
        }
      }
      
      if (!findInFiles) {
        // Try a deep search through all shadow roots using the utility function
        findInFiles = deepQuerySelector(this.renderRoot, 'find-in-files');
      }
      
      if (findInFiles && typeof findInFiles.focusSearchInput === 'function') {
        console.log(`Found FindInFiles component on attempt ${attempt + 1}`);
        findInFiles.focusSearchInput(selectedText);
        return;
      }
      
      // If not found and we haven't reached max attempts, try again
      if (attempt < maxAttempts - 1) {
        console.log(`FindInFiles not found, retrying... (attempt ${attempt + 1}/${maxAttempts})`);
        this._tryFocusSearchInput(attempt + 1, selectedText);
      } else {
        console.warn('FindInFiles component not found after all attempts');
        
        // Final debug: log all custom elements we can find using the utility function
        const allElements = getAllCustomElements(this.renderRoot);
        console.warn('All custom elements found:', allElements);
      }
    }, delay);
  }
};
