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
   * Focus the search input in FindInFiles
   */
  _focusSearchInput() {
    // Switch to the search tab (index 1)
    this.activeTabIndex = 1;
    this.requestUpdate();
    
    // Wait for the DOM update to complete
    this.updateComplete.then(() => {
      const findInFiles = this.shadowRoot.querySelector('find-in-files');
      if (findInFiles) {
        findInFiles.updateComplete.then(() => {
          const textField = findInFiles.shadowRoot.querySelector('md-outlined-text-field');
          if (textField) {
            textField.focus();
            console.log('Search input focused');
          } else {
            console.warn('md-outlined-text-field not found in FindInFiles');
          }
        });
      } else {
        console.warn('FindInFiles component not found');
      }
    });
  }
};
