import { extractResponseData } from '../Utils.js';

export class SearchState {
  static properties = {
    searchQuery: { type: String, state: true },
    searchResults: { type: Array, state: true },
    isSearching: { type: Boolean, state: true },
    searchError: { type: String, state: true },
    useWordMatch: { type: Boolean, state: true },
    useRegex: { type: Boolean, state: true },
    respectGitignore: { type: Boolean, state: true },
    caseSensitive: { type: Boolean, state: true },
    expandedFiles: { type: Set, state: true },
    allExpanded: { type: Boolean, state: true }
  };

  constructor(updateCallback = null) {
    this.updateCallback = updateCallback;
    this.searchQuery = '';
    this.searchResults = [];
    this.isSearching = false;
    this.searchError = null;
    this.useWordMatch = false;
    this.useRegex = false;
    this.respectGitignore = true; // Default to respecting .gitignore
    this.caseSensitive = false; // Default to case-insensitive search
    this.expandedFiles = new Set();
    this.allExpanded = false;
  }

  _notifyUpdate() {
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  startSearch() {
    this.isSearching = true;
    this.searchResults = [];
    this.searchError = null;
    this.expandedFiles = new Set();
    this.allExpanded = false;
    this._notifyUpdate();
  }

  handleSearchResponse(response) {
    this.isSearching = false;
    
    if (response.error) {
      this.searchError = response.error;
      console.error('Search error:', response.error);
    } else {
      // Extract search results using the utility function
      this.searchResults = extractResponseData(response, [], true);
    }
    this._notifyUpdate();
  }

  handleSearchError(error) {
    this.isSearching = false;
    this.searchError = `Search failed: ${error.message || 'Unknown error'}`;
    console.error('Search error:', error);
    this._notifyUpdate();
  }

  expandAll() {
    this.allExpanded = true;
    this.expandedFiles = new Set(this.searchResults.map(result => result.file));
    this._notifyUpdate();
  }

  collapseAll() {
    this.allExpanded = false;
    this.expandedFiles = new Set();
    this._notifyUpdate();
  }

  toggleFileExpansion(filePath) {
    if (this.expandedFiles.has(filePath)) {
      this.expandedFiles.delete(filePath);
    } else {
      this.expandedFiles.add(filePath);
    }
    
    // Update allExpanded state based on current expansion
    this.allExpanded = this.expandedFiles.size === this.searchResults.length;
    
    this._notifyUpdate();
  }
}
