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
   */
  _getSelectedTextFromMergeEditor() {
    try {
      const mergeEditor = this.renderRoot.querySelector('merge-editor') || 
                         deepQuerySelector(this.renderRoot, 'merge-editor');
      
      if (mergeEditor && typeof mergeEditor.getSelectedText === 'function') {
        return mergeEditor.getSelectedText();
      }
      return '';
    } catch (error) {
      console.error('Error getting selected text from MergeEditor:', error);
      return '';
    }
  }

  /**
   * Get selected text from GitMergeView if available
   */
  _getSelectedTextFromGitMergeView() {
    try {
      // Look for git-merge-view in git-history-view
      const gitHistoryView = this.renderRoot.querySelector('git-history-view');
      if (gitHistoryView?.shadowRoot) {
        const gitMergeView = gitHistoryView.shadowRoot.querySelector('git-merge-view');
        if (gitMergeView && typeof gitMergeView.getSelectedText === 'function') {
          return gitMergeView.getSelectedText();
        }
      }
      
      // Fallback: direct search
      const gitMergeView = this.renderRoot.querySelector('git-merge-view') || 
                          deepQuerySelector(this.renderRoot, 'git-merge-view');
      
      if (gitMergeView && typeof gitMergeView.getSelectedText === 'function') {
        return gitMergeView.getSelectedText();
      }
      
      return '';
    } catch (error) {
      console.error('Error getting selected text from GitMergeView:', error);
      return '';
    }
  }

  /**
   * Get selected text from any available editor component
   */
  _getSelectedText() {
    return this._getSelectedTextFromMergeEditor() || this._getSelectedTextFromGitMergeView();
  }

  /**
   * Focus the search input in FindInFiles
   */
  _focusSearchInput() {
    const selectedText = this._getSelectedText();
    const wasInGitHistoryMode = this.gitHistoryMode;
    
    if (wasInGitHistoryMode) {
      this.gitHistoryMode = false;
      this.requestUpdate();
    }
    
    // Switch to the search tab
    this.activeTabIndex = 1;
    this.requestUpdate();
    
    this.updateComplete.then(() => {
      this._tryFocusSearchInput(0, selectedText);
    });
  }

  /**
   * Try to focus search input with retries
   */
  _tryFocusSearchInput(attempt, selectedText = '') {
    const maxAttempts = 5;
    const delay = attempt * 100;
    
    setTimeout(() => {
      const findInFiles = this._findFindInFilesComponent();
      
      if (findInFiles && typeof findInFiles.focusSearchInput === 'function') {
        findInFiles.focusSearchInput(selectedText);
        return;
      }
      
      if (attempt < maxAttempts - 1) {
        this._tryFocusSearchInput(attempt + 1, selectedText);
      } else {
        console.warn('FindInFiles component not found after all attempts');
      }
    }, delay);
  }

  /**
   * Find the FindInFiles component using multiple strategies
   */
  _findFindInFilesComponent() {
    // Strategy 1: Direct search in renderRoot
    let findInFiles = this.renderRoot.querySelector('find-in-files');
    if (findInFiles) return findInFiles;
    
    // Strategy 2: Search in shadowRoot
    if (this.shadowRoot) {
      findInFiles = this.shadowRoot.querySelector('find-in-files');
      if (findInFiles) return findInFiles;
    }
    
    // Strategy 3: Search in sidebar's shadow root
    const sidebar = this.renderRoot.querySelector('app-sidebar');
    if (sidebar?.shadowRoot) {
      findInFiles = sidebar.shadowRoot.querySelector('find-in-files');
      if (findInFiles) return findInFiles;
    }
    
    // Strategy 4: Recursive search
    findInFiles = this._findInFilesRecursive(this.renderRoot);
    if (findInFiles) return findInFiles;
    
    // Strategy 5: Deep query selector utility
    return deepQuerySelector(this.renderRoot, 'find-in-files');
  }

  /**
   * Recursively search for find-in-files component in all shadow roots
   */
  _findInFilesRecursive(root) {
    if (!root) return null;
    
    const directFind = root.querySelector('find-in-files');
    if (directFind) return directFind;
    
    const elementsWithShadow = Array.from(root.querySelectorAll('*')).filter(el => el.shadowRoot);
    
    for (const element of elementsWithShadow) {
      const found = this._findInFilesRecursive(element.shadowRoot);
      if (found) return found;
    }
    
    return null;
  }
};
