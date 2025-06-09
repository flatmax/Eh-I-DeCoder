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
      console.log('KeyboardShortcutsMixin: Searching for MergeEditor...');
      
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
      
      console.log('KeyboardShortcutsMixin: No MergeEditor found or no getSelectedText method');
      return '';
    } catch (error) {
      console.error('Error getting selected text from MergeEditor:', error);
      return '';
    }
  }

  /**
   * Get selected text from GitMergeView if available
   * @returns {string} The selected text, or empty string if no selection
   */
  _getSelectedTextFromGitMergeView() {
    try {
      console.log('KeyboardShortcutsMixin: Searching for GitMergeView...');
      
      // Look for git-merge-view component in git history view
      const gitHistoryView = this.renderRoot.querySelector('git-history-view');
      if (gitHistoryView) {
        console.log('Found git-history-view, searching for git-merge-view inside...');
        
        // Search in git-history-view's shadow root
        let gitMergeView = null;
        if (gitHistoryView.shadowRoot) {
          gitMergeView = gitHistoryView.shadowRoot.querySelector('git-merge-view');
        }
        
        if (!gitMergeView) {
          // Try renderRoot as fallback
          gitMergeView = gitHistoryView.renderRoot?.querySelector('git-merge-view');
        }
        
        if (gitMergeView) {
          console.log('Found git-merge-view, checking for getSelectedText method...');
          if (typeof gitMergeView.getSelectedText === 'function') {
            const selectedText = gitMergeView.getSelectedText();
            console.log('Found selected text in GitMergeView:', selectedText);
            return selectedText;
          } else {
            console.log('GitMergeView found but no getSelectedText method');
          }
        } else {
          console.log('No git-merge-view found inside git-history-view');
        }
      }
      
      // Fallback: direct search for git-merge-view
      const gitMergeView = this.renderRoot.querySelector('git-merge-view');
      if (gitMergeView && typeof gitMergeView.getSelectedText === 'function') {
        const selectedText = gitMergeView.getSelectedText();
        console.log('Found selected text in GitMergeView (direct search):', selectedText);
        return selectedText;
      }
      
      // Try a deep search if not found directly
      const deepGitMergeView = deepQuerySelector(this.renderRoot, 'git-merge-view');
      if (deepGitMergeView && typeof deepGitMergeView.getSelectedText === 'function') {
        const selectedText = deepGitMergeView.getSelectedText();
        console.log('Found selected text in GitMergeView (deep search):', selectedText);
        return selectedText;
      }
      
      console.log('KeyboardShortcutsMixin: No GitMergeView found or no getSelectedText method');
      return '';
    } catch (error) {
      console.error('Error getting selected text from GitMergeView:', error);
      return '';
    }
  }

  /**
   * Get selected text from any available editor component
   * @returns {string} The selected text, or empty string if no selection
   */
  _getSelectedText() {
    console.log('KeyboardShortcutsMixin: Getting selected text from editors...');
    
    // Try MergeEditor first
    let selectedText = this._getSelectedTextFromMergeEditor();
    if (selectedText) {
      console.log('KeyboardShortcutsMixin: Using selected text from MergeEditor:', selectedText);
      return selectedText;
    }
    
    // Try GitMergeView
    selectedText = this._getSelectedTextFromGitMergeView();
    if (selectedText) {
      console.log('KeyboardShortcutsMixin: Using selected text from GitMergeView:', selectedText);
      return selectedText;
    }
    
    console.log('KeyboardShortcutsMixin: No selected text found in any editor');
    return '';
  }

  /**
   * Focus the search input in FindInFiles
   */
  _focusSearchInput() {
    // Get selected text from any available editor BEFORE switching modes
    console.log('KeyboardShortcutsMixin: Getting selected text before mode switch...');
    const selectedText = this._getSelectedText();
    console.log('KeyboardShortcutsMixin: Selected text to pass to search:', selectedText);
    
    // Check if we're in git history mode and need to switch to file explorer mode
    const wasInGitHistoryMode = this.gitHistoryMode;
    
    if (wasInGitHistoryMode) {
      console.log('Switching from git history mode to file explorer mode to access search');
      // Switch to file explorer mode to access the sidebar with find-in-files
      this.gitHistoryMode = false;
      this.requestUpdate();
    }
    
    // Switch to the search tab (index 1)
    this.activeTabIndex = 1;
    this.requestUpdate();
    
    // Wait for the DOM update to complete
    this.updateComplete.then(() => {
      // Try multiple times with delays to account for lazy loading
      this._tryFocusSearchInput(0, selectedText, wasInGitHistoryMode);
    });
  }

  /**
   * Try to focus search input with retries
   * @param {number} attempt - Current attempt number
   * @param {string} selectedText - Text to populate in the search input
   * @param {boolean} wasInGitHistoryMode - Whether we switched from git history mode
   */
  _tryFocusSearchInput(attempt, selectedText = '', wasInGitHistoryMode = false) {
    const maxAttempts = 5;
    const delay = attempt * 100; // Increasing delay: 0ms, 100ms, 200ms, etc.
    
    setTimeout(() => {
      console.log(`Attempt ${attempt + 1}: Searching for find-in-files component...`);
      console.log(`Attempt ${attempt + 1}: Selected text to pass: "${selectedText}"`);
      
      let findInFiles = null;
      
      // Strategy 1: Direct search in renderRoot
      findInFiles = this.renderRoot.querySelector('find-in-files');
      if (findInFiles) {
        console.log('Found find-in-files in renderRoot (direct)');
      }
      
      // Strategy 2: Search in shadowRoot if available
      if (!findInFiles && this.shadowRoot) {
        findInFiles = this.shadowRoot.querySelector('find-in-files');
        if (findInFiles) {
          console.log('Found find-in-files in shadowRoot (direct)');
        }
      }
      
      // Strategy 3: Search in container's shadow root
      if (!findInFiles) {
        const container = this.renderRoot.querySelector('.container');
        if (container && container.shadowRoot) {
          findInFiles = container.shadowRoot.querySelector('find-in-files');
          if (findInFiles) {
            console.log('Found find-in-files in container shadowRoot');
          }
        }
      }
      
      // Strategy 4: Search in sidebar's shadow root
      if (!findInFiles) {
        const sidebar = this.renderRoot.querySelector('app-sidebar');
        if (sidebar && sidebar.shadowRoot) {
          findInFiles = sidebar.shadowRoot.querySelector('find-in-files');
          if (findInFiles) {
            console.log('Found find-in-files in sidebar shadowRoot');
          }
        }
      }
      
      // Strategy 5: Recursive deep search
      if (!findInFiles) {
        findInFiles = this._findInFilesRecursive(this.renderRoot);
        if (findInFiles) {
          console.log('Found find-in-files via recursive search');
        }
      }
      
      // Strategy 6: Search from document root (fallback)
      if (!findInFiles) {
        findInFiles = this._findInFilesRecursive(document.body);
        if (findInFiles) {
          console.log('Found find-in-files via document body search');
        }
      }
      
      // Strategy 7: Use the utility function as last resort
      if (!findInFiles) {
        findInFiles = deepQuerySelector(this.renderRoot, 'find-in-files');
        if (findInFiles) {
          console.log('Found find-in-files via deepQuerySelector utility');
        }
      }
      
      if (findInFiles && typeof findInFiles.focusSearchInput === 'function') {
        console.log(`Successfully found FindInFiles component on attempt ${attempt + 1}`);
        console.log(`Calling focusSearchInput with text: "${selectedText}"`);
        findInFiles.focusSearchInput(selectedText);
        
        // If we switched from git history mode, show a brief message
        if (wasInGitHistoryMode) {
          console.log('Search opened from git history mode - use Ctrl+G to return to git history');
        }
        
        return;
      }
      
      // If not found and we haven't reached max attempts, try again
      if (attempt < maxAttempts - 1) {
        console.log(`FindInFiles not found, retrying... (attempt ${attempt + 1}/${maxAttempts})`);
        this._tryFocusSearchInput(attempt + 1, selectedText, wasInGitHistoryMode);
      } else {
        console.warn('FindInFiles component not found after all attempts');
        
        // Enhanced debug: log the component hierarchy
        console.warn('=== DEBUG INFO ===');
        console.warn('this.renderRoot:', this.renderRoot);
        console.warn('this.shadowRoot:', this.shadowRoot);
        
        // Log all custom elements we can find
        const allElements = getAllCustomElements(this.renderRoot);
        console.warn('All custom elements in renderRoot:', allElements);
        
        if (this.shadowRoot) {
          const shadowElements = getAllCustomElements(this.shadowRoot);
          console.warn('All custom elements in shadowRoot:', shadowElements);
        }
        
        // Log container info
        const container = this.renderRoot.querySelector('.container');
        if (container) {
          console.warn('Found .container:', container);
          if (container.shadowRoot) {
            const containerElements = getAllCustomElements(container.shadowRoot);
            console.warn('All custom elements in container shadowRoot:', containerElements);
          }
        }
        
        // Log sidebar info
        const sidebar = this.renderRoot.querySelector('app-sidebar');
        if (sidebar) {
          console.warn('Found app-sidebar:', sidebar);
          if (sidebar.shadowRoot) {
            const sidebarElements = getAllCustomElements(sidebar.shadowRoot);
            console.warn('All custom elements in sidebar shadowRoot:', sidebarElements);
          }
        }
        
        // Try to find any element with 'find' in the name
        const findElements = Array.from(this.renderRoot.querySelectorAll('*'))
          .filter(el => el.tagName.toLowerCase().includes('find'))
          .map(el => el.tagName.toLowerCase());
        console.warn('Elements with "find" in name:', findElements);
        
        // If we switched modes but couldn't find the component, we might want to switch back
        if (wasInGitHistoryMode) {
          console.warn('Could not find search component after switching from git history mode');
        }
      }
    }, delay);
  }

  /**
   * Recursively search for find-in-files component in all shadow roots
   * @param {Element} root - Root element to search from
   * @returns {Element|null} The find-in-files element if found
   */
  _findInFilesRecursive(root) {
    if (!root) return null;
    
    // Check direct children first
    const directFind = root.querySelector('find-in-files');
    if (directFind) return directFind;
    
    // Check all elements with shadow roots
    const elementsWithShadow = Array.from(root.querySelectorAll('*')).filter(el => el.shadowRoot);
    
    for (const element of elementsWithShadow) {
      // Recursively search in shadow root
      const found = this._findInFilesRecursive(element.shadowRoot);
      if (found) return found;
    }
    
    return null;
  }
};
