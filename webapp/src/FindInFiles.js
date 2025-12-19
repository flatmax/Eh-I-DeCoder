import { html, css, LitElement } from 'lit';
import { JRPCClient } from '@flatmax/jrpc-oo';
import { SearchForm } from './search/SearchForm.js';
import { SearchResults } from './search/SearchResults.js';
import { SearchState } from './search/SearchState.js';
import { EventHelper } from './utils/EventHelper.js';
import { extractResponseData } from './Utils.js';

import '@material/web/progress/circular-progress.js';

export class FindInFiles extends JRPCClient {
  static properties = {
    ...SearchState.properties,
    serverURI: { type: String },
    isConnected: { type: Boolean, state: true },
    checkedFiles: { type: Set, state: true }
  };

  constructor() {
    super();
    this.searchState = new SearchState(() => this.updateStateFromSearchState());
    this.initializeProperties();
    this.isConnected = false;
    this.checkedFiles = new Set();
  }
  
  initializeProperties() {
    Object.keys(SearchState.properties).forEach(prop => {
      this[prop] = this.searchState[prop];
    });
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    console.log('FindInFiles: Adding event listeners for file context changes');
    window.addEventListener('file-added-to-context', this.handleFileAddedToContext.bind(this));
    window.addEventListener('file-dropped-from-context', this.handleFileDroppedFromContext.bind(this));
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    console.log('FindInFiles: Removing event listeners');
    window.removeEventListener('file-added-to-context', this.handleFileAddedToContext.bind(this));
    window.removeEventListener('file-dropped-from-context', this.handleFileDroppedFromContext.bind(this));
  }
  
  async setupDone() {
    console.log('FindInFiles::setupDone - Connection ready');
    this.isConnected = true;
    
    await this.loadInchatFiles();
  }
  
  remoteIsUp() {
    console.log('FindInFiles::remoteIsUp - Remote connected');
  }
  
  remoteDisconnected() {
    console.log('FindInFiles::remoteDisconnected');
    this.isConnected = false;
    if (this.isSearching) {
      this.searchState.handleSearchError(new Error('Connection lost during search'));
    }
    if (this.isReplacing) {
      this.searchState.handleReplaceError(new Error('Connection lost during replace'));
    }
  }
  
  async loadInchatFiles() {
    if (!this.isConnected || !this.call) {
      console.warn('Cannot load inchat files - not connected');
      return;
    }
    
    try {
      console.log('FindInFiles: Loading inchat files...');
      const response = await this.call['EditBlockCoder.get_inchat_relative_files']();
      const inchatFiles = extractResponseData(response, [], true);
      console.log('FindInFiles: Inchat files loaded:', inchatFiles);
      
      this.checkedFiles = new Set(inchatFiles);
      this.requestUpdate();
    } catch (error) {
      console.error('FindInFiles: Error loading inchat files:', error);
    }
  }
  
  focusSearchInput(selectedText = '') {
    this.updateComplete.then(() => {
      const searchForm = this.shadowRoot.querySelector('search-form');
      if (searchForm) {
        searchForm.focusInput(selectedText);
        
        if (selectedText && selectedText.trim() && this.isConnected) {
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
        !options.caseSensitive
      );
      
      this.searchState.handleSearchResponse(response);
    } catch (error) {
      this.searchState.handleSearchError(error);
    }
  }
  
  async handleReplaceAll(searchQuery, replaceQuery, filePaths, options) {
    if (!this.isConnected || !this.call) {
      console.warn('Cannot replace - not connected');
      this.searchState.handleReplaceError(new Error('Not connected to server'));
      return;
    }
    
    this.searchState.startReplace();
    
    try {
      const response = await this.call['Repo.replace_in_files'](
        searchQuery,
        replaceQuery,
        filePaths,
        options.useWordMatch,
        options.useRegex,
        !options.caseSensitive
      );
      
      this.searchState.handleReplaceResponse(response);
      
      if (!this.searchState.replaceError) {
        await this.handleSearch(searchQuery, options);
      }
    } catch (error) {
      this.searchState.handleReplaceError(error);
    }
  }
  
  async handleReplaceInFile(searchQuery, replaceQuery, filePath, options) {
    if (!this.isConnected || !this.call) {
      console.warn('Cannot replace - not connected');
      this.searchState.handleReplaceError(new Error('Not connected to server'));
      return;
    }
    
    this.searchState.startReplace();
    
    try {
      const response = await this.call['Repo.replace_in_files'](
        searchQuery,
        replaceQuery,
        [filePath],
        options.useWordMatch,
        options.useRegex,
        !options.caseSensitive
      );
      
      this.searchState.handleReplaceResponse(response);
      
      if (!this.searchState.replaceError) {
        await this.handleSearch(searchQuery, options);
      }
    } catch (error) {
      this.searchState.handleReplaceError(error);
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
    if (lineNumber !== null) {
      lineNumber = parseInt(lineNumber, 10);
      if (isNaN(lineNumber)) {
        console.warn(`FindInFiles: Invalid line number format: ${lineNumber}`);
        lineNumber = null;
      }
    }
    
    EventHelper.dispatchOpenFile(this, filePath, lineNumber);
  }
  
  handleFileCheckboxChange(filePath, checked) {
    console.log(`FindInFiles: Checkbox changed for ${filePath}, checked: ${checked}`);
    
    if (checked) {
      console.log(`FindInFiles: Dispatching request-add-file-to-context for ${filePath}`);
      EventHelper.dispatchWindowEvent('request-add-file-to-context', { filePath });
    } else {
      console.log(`FindInFiles: Dispatching request-drop-file-from-context for ${filePath}`);
      EventHelper.dispatchWindowEvent('request-drop-file-from-context', { filePath });
    }
  }
  
  handleFileAddedToContext(event) {
    const { filePath } = event.detail;
    console.log(`FindInFiles: Received file-added-to-context event for ${filePath}`);
    
    this.checkedFiles = new Set([...this.checkedFiles, filePath]);
    this.requestUpdate();
  }
  
  handleFileDroppedFromContext(event) {
    const { filePath } = event.detail;
    console.log(`FindInFiles: Received file-dropped-from-context event for ${filePath}`);
    
    const newSet = new Set(this.checkedFiles);
    newSet.delete(filePath);
    this.checkedFiles = newSet;
    this.requestUpdate();
  }
  
  add_rel_fname_notification(filePath) {
    console.log(`FindInFiles: File added notification: ${filePath}`);
  }

  drop_rel_fname_notification(filePath) {
    console.log(`FindInFiles: File dropped notification: ${filePath}`);
  }
  
  updateStateFromSearchState() {
    Object.keys(SearchState.properties).forEach(prop => {
      this[prop] = this.searchState[prop];
    });
    this.requestUpdate();
  }
  
  render() {
    const expandedFilesArray = Array.from(this.expandedFiles || []);
    const checkedFilesArray = Array.from(this.checkedFiles || []);
    
    return html`
      <div class="search-container">
        <search-form
          .searchState=${this.searchState}
          @search=${e => this.isConnected ? this.handleSearch(e.detail.query, e.detail.options) : null}
          @replace-all=${e => this.isConnected ? this.handleReplaceAll(e.detail.searchQuery, e.detail.replaceQuery, e.detail.filePaths, e.detail.options) : null}
          @replace-in-file=${e => this.isConnected ? this.handleReplaceInFile(e.detail.searchQuery, e.detail.replaceQuery, e.detail.filePath, e.detail.options) : null}
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
          .checkedFiles=${this.checkedFiles}
          .checkedFilesArray=${checkedFilesArray}
          .allExpanded=${this.allExpanded}
          .isSearching=${this.isSearching}
          .searchQuery=${this.searchQuery}
          .searchError=${this.searchError}
          @expand-all=${this.handleExpandAll}
          @collapse-all=${this.handleCollapseAll}
          @file-header-click=${e => this.handleFileHeaderClick(e.detail.filePath)}
          @open-file=${e => this.handleOpenFile(e.detail.filePath, e.detail.lineNumber)}
          @file-checkbox-change=${e => this.handleFileCheckboxChange(e.detail.filePath, e.detail.checked)}
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
