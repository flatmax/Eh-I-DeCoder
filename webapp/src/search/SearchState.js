import { extractResponseData } from '../Utils.js';

export class SearchState {
  static properties = {
    searchQuery: { type: String, state: true },
    replaceQuery: { type: String, state: true },
    searchResults: { type: Array, state: true },
    isSearching: { type: Boolean, state: true },
    isReplacing: { type: Boolean, state: true },
    searchError: { type: String, state: true },
    replaceError: { type: String, state: true },
    replaceSuccess: { type: String, state: true },
    useWordMatch: { type: Boolean, state: true },
    useRegex: { type: Boolean, state: true },
    respectGitignore: { type: Boolean, state: true },
    caseSensitive: { type: Boolean, state: true },
    showReplace: { type: Boolean, state: true },
    expandedFiles: { type: Set, state: true },
    allExpanded: { type: Boolean, state: true }
  };

  constructor(updateCallback = null) {
    this.updateCallback = updateCallback;
    this.searchQuery = '';
    this.replaceQuery = '';
    this.searchResults = [];
    this.isSearching = false;
    this.isReplacing = false;
    this.searchError = null;
    this.replaceError = null;
    this.replaceSuccess = null;
    this.useWordMatch = false;
    this.useRegex = false;
    this.respectGitignore = true;
    this.caseSensitive = false;
    this.showReplace = false;
    this.expandedFiles = new Set();
    this.allExpanded = false;
    this._updateScheduled = false;
  }

  _notifyUpdate() {
    if (this._updateScheduled) return;
    
    this._updateScheduled = true;
    
    requestAnimationFrame(() => {
      this._updateScheduled = false;
      if (this.updateCallback) {
        this.updateCallback();
      }
    });
  }

  startSearch() {
    this.isSearching = true;
    this.searchResults = [];
    this.searchError = null;
    this.replaceError = null;
    this.replaceSuccess = null;
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

  startReplace() {
    this.isReplacing = true;
    this.replaceError = null;
    this.replaceSuccess = null;
    this._notifyUpdate();
  }

  handleReplaceResponse(response) {
    this.isReplacing = false;
    
    if (response.error) {
      this.replaceError = response.error;
      console.error('Replace error:', response.error);
    } else {
      const result = extractResponseData(response, {});
      if (result.total_replacements !== undefined) {
        this.replaceSuccess = `Replaced ${result.total_replacements} occurrence(s) in ${result.files_modified} file(s)`;
      } else {
        this.replaceSuccess = 'Replace completed';
      }
    }
    this._notifyUpdate();
  }

  handleReplaceError(error) {
    this.isReplacing = false;
    this.replaceError = `Replace failed: ${error.message || 'Unknown error'}`;
    console.error('Replace error:', error);
    this._notifyUpdate();
  }

  toggleShowReplace() {
    this.showReplace = !this.showReplace;
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
    const newExpandedFiles = new Set(this.expandedFiles);
    
    if (newExpandedFiles.has(filePath)) {
      newExpandedFiles.delete(filePath);
    } else {
      newExpandedFiles.add(filePath);
    }
    
    this.expandedFiles = newExpandedFiles;
    this.allExpanded = this.expandedFiles.size === this.searchResults.length;
    
    this._notifyUpdate();
  }
}
