import { deepQuerySelector, getAllCustomElements } from '../Utils.js';
import { EventHelper } from '../utils/EventHelper.js';

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
      return;
    }
    
    // Only log for actual shortcuts we care about
    const isShortcut = (event.ctrlKey && event.key === 'p') || 
                      (event.ctrlKey && event.shiftKey && event.key === 'F');
    
    if (isShortcut) {
      console.log('Keyboard shortcut detected:', event.key, 'Ctrl:', event.ctrlKey, 'Shift:', event.shiftKey);
    }
    
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
      event.stopImmediatePropagation();
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
   * Get selected text from DiffEditor if available
   */
  _getSelectedTextFromDiffEditor() {
    try {
      const diffEditor = this.renderRoot.querySelector('diff-editor') || 
                        deepQuerySelector(this.renderRoot, 'diff-editor');
      
      if (diffEditor?.shadowRoot) {
        const monacoEditor = diffEditor.shadowRoot.querySelector('monaco-diff-editor');
        if (monacoEditor && typeof monacoEditor.getSelectedText === 'function') {
          return monacoEditor.getSelectedText();
        }
      }
      return '';
    } catch (error) {
      console.error('Error getting selected text from DiffEditor:', error);
      return '';
    }
  }

  /**
   * Get selected text from GitDiffView if available
   */
  _getSelectedTextFromGitDiffView() {
    try {
      // Look for git-merge-view in git-history-view
      const gitHistoryView = this.renderRoot.querySelector('git-history-view');
      if (gitHistoryView?.shadowRoot) {
        const GitDiffView = gitHistoryView.shadowRoot.querySelector('git-merge-view');
        if (GitDiffView && typeof GitDiffView.getSelectedText === 'function') {
          return GitDiffView.getSelectedText();
        }
      }
      
      // Fallback: direct search
      const GitDiffView = this.renderRoot.querySelector('git-merge-view') || 
                          deepQuerySelector(this.renderRoot, 'git-merge-view');
      
      if (GitDiffView && typeof GitDiffView.getSelectedText === 'function') {
        return GitDiffView.getSelectedText();
      }
      
      return '';
    } catch (error) {
      console.error('Error getting selected text from GitDiffView:', error);
      return '';
    }
  }

  /**
   * Get selected text from any available editor component
   */
  _getSelectedText() {
    return this._getSelectedTextFromDiffEditor() || 
           this._getSelectedTextFromGitDiffView();
  }

  /**
   * Focus the search input in FindInFiles using EventHelper
   */
  _focusSearchInput() {
    const selectedText = this._getSelectedText();
    console.log('_focusSearchInput ', selectedText)
    // Use EventHelper to dispatch the find in files request event
    EventHelper.dispatchRequestFindInFiles(this, selectedText);
  }
};
