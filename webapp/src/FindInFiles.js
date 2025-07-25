import { html, css, LitElement } from 'lit';
import { JRPCClient } from '@flatmax/jrpc-oo';
import { SearchForm } from './search/SearchForm.js';
import { SearchResults } from './search/SearchResults.js';
import { SearchState } from './search/SearchState.js';
import { EventHelper } from './utils/EventHelper.js';

// Import Material Design Web Components
import '@material/web/progress/circular-progress.js';

export class FindInFiles extends JRPCClient {
  static properties = {
    ...SearchState.properties,
    serverURI: { type: String },
    isConnected: { type: Boolean, state: true }
  };

  constructor() {
    super();
    this.searchState = new SearchState(() => this.updateStateFromSearchState());
    this.initializeProperties();
    this.isConnected = false;
  }
  
  initializeProperties() {
    // Initialize all properties from SearchState
    Object.keys(SearchState.properties).forEach(prop => {
      this[prop] = this.searchState[prop];
    });
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  /**
   * Called when JRPC connection is established and ready
   */
  setupDone() {
    console.log('FindInFiles::setupDone - Connection ready');
    this.isConnected = true;
  }
  
  /**
   * Called when remote is up but not yet ready
   */
  remoteIsUp() {
    console.log('FindInFiles::remoteIsUp - Remote connected');
    // Don't perform searches yet - wait for setupDone
  }
  
  /**
   * Called when remote disconnects
   */
  remoteDisconnected() {
    console.log('FindInFiles::remoteDisconnected');
    this.isConnected = false;
    if (this.isSearching) {
      this.searchState.handleSearchError(new Error('Connection lost during search'));
    }
  }
  
  /**
   * Focus the search input field and optionally set the search query
   * @param {string} [selectedText] - Optional text to set as the search query
   */
  focusSearchInput(selectedText = '') {
    this.updateComplete.then(() => {
      const searchForm = this.shadowRoot.querySelector('search-form');
      if (searchForm) {
        searchForm.focusInput(selectedText);
        
        // If selectedText is provided, automatically execute the search
        if (selectedText && selectedText.trim() && this.isConnected) {
          // Small delay to ensure the input is focused and updated
          setTimeout(() => {
            this.handleSearch(selectedText.trim(), {
              useWordMatch: this.searchState.useWordMatch,
              useRegex: this.searchState.useRegex,
              respectGitignore: this.searchState.respectGitignore,
              caseSensitive: this.searchState.caseSensitive
            });
          }, 100);
        }
      }
    });
  }
  
  async handleSearch(query, options) {
    if (!this.isConnected || !this.call) {
      console.warn('Cannot search - not connected');
      this.searchState.handleSearchError(new Error('Not connected to server'));
      return;
    }
    
    this.searchState.startSearch();
    
    try {
      const response = await this.call['Repo.search_files'](
        query, 
        options.useWordMatch, 
        options.useRegex,
        options.respectGitignore,
        !options.caseSensitive  // pass the inverse as ignore_case
      );
      
      this.searchState.handleSearchResponse(response);
    } catch (error) {
      this.searchState.handleSearchError(error);
    }
  }
  
  handleExpandAll() {
    this.searchState.expandAll();
  }
  
  handleCollapseAll() {
    this.searchState.collapseAll();
  }
  
  handleFileHeaderClick(filePath) {
    this.searchState.toggleFileExpansion(filePath);
  }
  
  handleOpenFile(filePath, lineNumber = null) {
    // Ensure lineNumber is a number (if it exists)
    if (lineNumber !== null) {
      lineNumber = parseInt(lineNumber, 10);
      if (isNaN(lineNumber)) {
        console.warn(`FindInFiles: Invalid line number format: ${lineNumber}`);
        lineNumber = null;
      }
    }
    
    // Use EventHelper for consistent event dispatching
    EventHelper.dispatchOpenFile(this, filePath, lineNumber);
  }
  
  updateStateFromSearchState() {
    // Sync component properties with search state
    Object.keys(SearchState.properties).forEach(prop => {
      this[prop] = this.searchState[prop];
    });
    this.requestUpdate();
  }
  
  render() {
    // Convert Set to Array for better LitElement property change detection
    const expandedFilesArray = Array.from(this.expandedFiles || []);
    
    return html`
      <div class="search-container">
        <search-form
          .searchState=${this.searchState}
          @search=${e => this.isConnected ? this.handleSearch(e.detail.query, e.detail.options) : null}
        ></search-form>
      </div>
      
      <div class="results-container">
        ${this.searchError ? html`
          <div class="error-message">
            <span class="material-symbols-outlined">error</span>
            ${this.searchError}
          </div>
        ` : ''}
        
        ${this.isSearching ? html`
          <div class="loading-indicator">
            <md-circular-progress indeterminate></md-circular-progress>
          </div>
        ` : ''}
        
        <search-results
          .searchResults=${this.searchResults}
          .expandedFiles=${this.expandedFiles}
          .expandedFilesArray=${expandedFilesArray}
          .allExpanded=${this.allExpanded}
          .isSearching=${this.isSearching}
          .searchQuery=${this.searchQuery}
          .searchError=${this.searchError}
          @expand-all=${this.handleExpandAll}
          @collapse-all=${this.handleCollapseAll}
          @file-header-click=${e => this.handleFileHeaderClick(e.detail.filePath)}
          @open-file=${e => this.handleOpenFile(e.detail.filePath, e.detail.lineNumber)}
        ></search-results>
      </div>
    `;
  }
  
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      background-color: var(--md-sys-color-surface, #ffffff);
      color: var(--md-sys-color-on-surface, #1d1b20);
      --md-sys-color-primary: #6750a4;
      --md-sys-color-on-primary: #ffffff;
      --md-sys-color-surface-variant: #e7e0ec;
      --md-sys-color-on-surface-variant: #49454f;
      --md-sys-color-outline: #79747e;
      --md-sys-color-outline-variant: #cac4d0;
      --md-sys-color-error: #b3261e;
      --md-sys-color-error-container: #f9dedc;
      --md-sys-color-on-error: #ffffff;
    }
    
    .search-container {
      padding: 8px;
      background-color: var(--md-sys-color-surface, #ffffff);
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    }
    
    .results-container {
      flex-grow: 1;
      overflow-y: auto;
      padding: 8px;
    }
    
    .error-message {
      color: var(--md-sys-color-on-error-container, #410e0b);
      background-color: var(--md-sys-color-error-container, #f9dedc);
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }
    
    .loading-indicator {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 60px;
    }
  `;
}
