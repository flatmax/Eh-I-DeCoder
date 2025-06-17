import { deepQuerySelector, getAllCustomElements } from '../Utils.js';

export const KeyboardShortcutsMixin = (superClass) => class extends superClass {
  connectedCallback() {
    super.connectedCallback();
    this.boundKeyboardHandler = this._handleKeyboardShortcuts.bind(this);
    document.addEventListener('keydown', this.boundKeyboardHandler);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.boundKeyboardHandler);
  }

  /**
   * Handle keyboard shortcuts globally
   */
  _handleKeyboardShortcuts(event) {
    // Check if fuzzy search is currently visible - if so, don't handle shortcuts
    const fuzzySearch = document.querySelector('fuzzy-search[visible]') || 
                       this._findVisibleFuzzySearch();
    
    if (fuzzySearch) {
      console.log('FuzzySearch is visible, skipping global shortcuts');
      return;
    }
    
    console.log('Keyboard shortcut detected:', event.key, 'Ctrl:', event.ctrlKey, 'Shift:', event.shiftKey);
    
    // Ctrl+P: Open fuzzy file search
    if (event.ctrlKey && event.key === 'p') {
      console.log('Ctrl+P detected - opening fuzzy search');
      event.preventDefault();
      event.stopPropagation();
      this._openFuzzySearch();
      return;
    }

    // Ctrl+Shift+F: Focus search input
    if (event.ctrlKey && event.shiftKey && event.key === 'F') {
      event.preventDefault();
      event.stopPropagation();
      this._focusSearchInput();
    }
  }

  /**
   * Find visible fuzzy search component
   */
  _findVisibleFuzzySearch() {
    // Check in this component's render root
    let fuzzySearch = this.renderRoot?.querySelector('fuzzy-search[visible]');
    if (fuzzySearch) return fuzzySearch;
    
    // Check in shadow roots recursively
    return this._findVisibleFuzzySearchRecursive(document.body);
  }

  /**
   * Recursively search for visible fuzzy search
   */
  _findVisibleFuzzySearchRecursive(root) {
    if (!root) return null;
    
    const fuzzySearch = root.querySelector('fuzzy-search[visible]');
    if (fuzzySearch) return fuzzySearch;
    
    const elementsWithShadow = Array.from(root.querySelectorAll('*')).filter(el => el.shadowRoot);
    
    for (const element of elementsWithShadow) {
      const found = this._findVisibleFuzzySearchRecursive(element.shadowRoot);
      if (found) return found;
    }
    
    return null;
  }

  /**
   * Open fuzzy file search
   */
  _openFuzzySearch() {
    console.log('_openFuzzySearch called');
    
    // Check if this component has openFuzzySearch method (FileTree components)
    if (typeof this.openFuzzySearch === 'function') {
      console.log('Using local openFuzzySearch method');
      this.openFuzzySearch();
      return;
    }
    
    // Get all files from the file tree
    const files = this._getAllFiles();
    console.log('Found files for fuzzy search:', files.length);
    
    // Find or create fuzzy search component
    let fuzzySearch = this.renderRoot.querySelector('fuzzy-search');
    if (!fuzzySearch) {
      // Try alternative search strategies
      fuzzySearch = deepQuerySelector(this.renderRoot, 'fuzzy-search');
    }
    
    if (!fuzzySearch) {
      console.log('FuzzySearch component not available - files found:', files.length);
      // Could emit an event here for other components to handle
      window.dispatchEvent(new CustomEvent('fuzzy-search-requested', {
        detail: { files }
      }));
      return;
    }

    console.log('Found fuzzy search component, showing with files:', files.length);
    fuzzySearch.show(files);
  }

  /**
   * Get all files from the available file trees
   */
  _getAllFiles() {
    const files = [];
    
    // If this component has files property, use it
    if (this.files && Array.isArray(this.files)) {
      files.push(...this.files);
    }
    
    // Try to get files from RepoTree first
    const repoTree = this.renderRoot.querySelector('repo-tree') || 
                    deepQuerySelector(this.renderRoot, 'repo-tree');
    
    if (repoTree && repoTree.files) {
      files.push(...repoTree.files);
    } else {
      // Fallback to FileTree
      const fileTree = this.renderRoot.querySelector('file-tree') || 
                      deepQuerySelector(this.renderRoot, 'file-tree');
      
      if (fileTree && fileTree.files) {
        files.push(...fileTree.files);
      }
    }

    // Remove duplicates and filter out empty entries
    return [...new Set(files)].filter(file => file && typeof file === 'string');
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
        console.log('FindInFiles component not found after all attempts');
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
