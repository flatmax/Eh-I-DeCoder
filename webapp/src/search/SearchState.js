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
    
    console.log('SearchState constructor called with updateCallback:', !!updateCallback);
  }

  _notifyUpdate() {
    console.log('SearchState._notifyUpdate called, updateCallback exists:', !!this.updateCallback);
    if (this.updateCallback) {
      this.updateCallback();
    }
  }

  startSearch() {
    console.log('SearchState.startSearch called');
    this.isSearching = true;
    this.searchResults = [];
    this.searchError = null;
    this.expandedFiles = new Set();
    this.allExpanded = false;
    this._notifyUpdate();
  }

  handleSearchResponse(response) {
    console.log('SearchState.handleSearchResponse called with:', response);
    this.isSearching = false;
    
    if (response.error) {
      this.searchError = response.error;
      console.error('Search error:', response.error);
    } else {
      // Extract search results using the utility function
      this.searchResults = extractResponseData(response, [], true);
      console.log(`Found matches in ${this.searchResults.length} files`);
    }
    this._notifyUpdate();
  }

  handleSearchError(error) {
    console.log('SearchState.handleSearchError called with:', error);
    this.isSearching = false;
    this.searchError = `Search failed: ${error.message || 'Unknown error'}`;
    console.error('Search error:', error);
    this._notifyUpdate();
  }

  expandAll() {
    console.log('SearchState.expandAll called');
    this.allExpanded = true;
    this.expandedFiles = new Set(this.searchResults.map(result => result.file));
    console.log('expandedFiles after expandAll:', this.expandedFiles);
    this._notifyUpdate();
  }

  collapseAll() {
    console.log('SearchState.collapseAll called');
    this.allExpanded = false;
    this.expandedFiles = new Set();
    console.log('expandedFiles after collapseAll:', this.expandedFiles);
    this._notifyUpdate();
  }

  toggleFileExpansion(filePath) {
    console.log('SearchState.toggleFileExpansion called with filePath:', filePath);
    console.log('expandedFiles before toggle:', this.expandedFiles);
    
    if (this.expandedFiles.has(filePath)) {
      this.expandedFiles.delete(filePath);
      console.log('File collapsed:', filePath);
    } else {
      this.expandedFiles.add(filePath);
      console.log('File expanded:', filePath);
    }
    
    console.log('expandedFiles after toggle:', this.expandedFiles);
    
    // Update allExpanded state based on current expansion
    this.allExpanded = this.expandedFiles.size === this.searchResults.length;
    console.log('allExpanded state:', this.allExpanded);
    
    this._notifyUpdate();
  }
}
