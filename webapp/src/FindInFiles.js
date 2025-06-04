import { html, css, LitElement } from 'lit';
import { JRPCClient } from '@flatmax/jrpc-oo';
import { repeat } from 'lit/directives/repeat.js';

export class FindInFiles extends JRPCClient {
  static properties = {
    searchQuery: { type: String, state: true },
    searchResults: { type: Array, state: true },
    isSearching: { type: Boolean, state: true },
    searchError: { type: String, state: true },
    useWordMatch: { type: Boolean, state: true },
    useRegex: { type: Boolean, state: true },
    respectGitignore: { type: Boolean, state: true },
    serverURI: { type: String }
  };

  constructor() {
    super();
    this.searchQuery = '';
    this.searchResults = [];
    this.isSearching = false;
    this.searchError = null;
    this.useWordMatch = false;
    this.useRegex = false;
    this.respectGitignore = true; // Default to respecting .gitignore
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  async handleSearch(e) {
    e?.preventDefault();
    
    const query = this.searchQuery?.trim();
    if (!query) return;
    
    this.isSearching = true;
    this.searchResults = [];
    this.searchError = null;
    
    try {
      console.log(`Searching for "${query}" (word: ${this.useWordMatch}, regex: ${this.useRegex}, respectGitignore: ${this.respectGitignore})`);
      const response = await this.call['Repo.search_files'](
        query, 
        this.useWordMatch, 
        this.useRegex,
        this.respectGitignore
      );
      
      if (response.error) {
        this.searchError = response.error;
        console.error('Search error:', response.error);
      } else {
        // Extract search results, handling both direct array responses
        // and UUID-wrapped objects (similar to FileTree component)
        if (typeof response === 'object' && !Array.isArray(response)) {
          // Check if this is a result with a 'results' property
          if (response.results) {
            this.searchResults = response.results;
          } else {
            // Check if this is a UUID-wrapped object
            const keys = Object.keys(response);
            if (keys.length > 0) {
              this.searchResults = Array.isArray(response[keys[0]]) ? response[keys[0]] : [];
            } else {
              this.searchResults = [];
            }
          }
        } else if (Array.isArray(response)) {
          this.searchResults = response;
        } else {
          this.searchResults = [];
        }
        
        console.log(`Found matches in ${this.searchResults.length} files`);
      }
    } catch (error) {
      this.searchError = `Search failed: ${error.message || 'Unknown error'}`;
      console.error('Search error:', error);
    } finally {
      this.isSearching = false;
    }
  }
  
  handleOpenFile(filePath, lineNumber = null) {
    console.log(`FindInFiles: handleOpenFile called with:`, { 
      filePath, 
      lineNumber, 
      lineNumberType: typeof lineNumber 
    });
    
    // Ensure lineNumber is a number (if it exists)
    if (lineNumber !== null) {
      lineNumber = parseInt(lineNumber, 10);
      if (isNaN(lineNumber)) {
        console.warn(`FindInFiles: Invalid line number format: ${lineNumber}`);
        lineNumber = null;
      } else {
        console.log(`FindInFiles: Converted line number to: ${lineNumber}`);
      }
    }
    
    // Dispatch custom event to be handled by MainWindow
    const event = new CustomEvent('open-file', {
      bubbles: true,
      composed: true,
      detail: { filePath, lineNumber }
    });
    console.log(`FindInFiles: Dispatching open-file event:`, event.detail);
    this.dispatchEvent(event);
  }
  
  render() {
    return html`
      <div class="search-container">
        <form class="search-form" @submit=${this.handleSearch}>
          <div class="input-row">
            <input 
              type="text" 
              class="search-input" 
              placeholder="Search in files..." 
              .value=${this.searchQuery || ''} 
              @input=${e => this.searchQuery = e.target.value}
              ?disabled=${this.isSearching}
            >
            <button 
              type="submit" 
              class="search-button" 
              ?disabled=${this.isSearching || !this.searchQuery?.trim()}
            >
              ${this.isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
          <div class="options-row">
            <label class="checkbox-option">
              <input 
                type="checkbox" 
                ?checked=${this.useWordMatch} 
                @change=${e => this.useWordMatch = e.target.checked}
                ?disabled=${this.isSearching}
              >
              Whole words only
            </label>
            <label class="checkbox-option">
              <input 
                type="checkbox" 
                ?checked=${this.useRegex} 
                @change=${e => this.useRegex = e.target.checked}
                ?disabled=${this.isSearching}
              >
              Regular expression
            </label>
            <label class="checkbox-option">
              <input 
                type="checkbox" 
                ?checked=${this.respectGitignore} 
                @change=${e => this.respectGitignore = e.target.checked}
                ?disabled=${this.isSearching}
              >
              Respect .gitignore
            </label>
          </div>
        </form>
      </div>
      
      <div class="results-container">
        ${this.searchError ? html`
          <div class="error-message">
            ${this.searchError}
          </div>
        ` : ''}
        
        ${this.isSearching ? html`
          <div class="loading-indicator">
            <div class="spinner"></div>
          </div>
        ` : ''}
        
        ${!this.isSearching && this.searchResults?.length > 0 ? html`
          <div class="results-info">
            Found matches in ${this.searchResults.length} file${this.searchResults.length !== 1 ? 's' : ''}
          </div>
          
          ${repeat(this.searchResults, result => result.file, result => html`
            <div class="file-result">
              <div class="file-header" @click=${() => this.handleOpenFile(result.file)}>
                <span class="file-icon">📄</span>
                <span class="file-path">${result.file}</span>
                <span class="match-count">${result.matches.length}</span>
              </div>
              
              <div class="match-list">
                ${repeat(result.matches, match => `${result.file}-${match.line_num}`, match => html`
                  <div 
                    class="match-item"
                    @click=${() => this.handleOpenFile(result.file, match.line_num)}
                  >
                    <span class="line-number">${match.line_num}</span>
                    <span class="line-content">${match.line}</span>
                  </div>
                `)}
              </div>
            </div>
          `)}
        ` : ''}
        
        ${!this.isSearching && this.searchResults?.length === 0 && !this.searchError && this.searchQuery ? html`
          <div class="results-info">
            No matches found for "${this.searchQuery}"
          </div>
        ` : ''}
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
    }
    
    .search-container {
      padding: 16px;
      background-color: var(--md-sys-color-surface-variant, #f5f5f5);
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #e0e0e0);
    }
    
    .search-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .input-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .search-input {
      flex-grow: 1;
      border: 1px solid var(--md-sys-color-outline, #9e9e9e);
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 16px;
    }
    
    .search-button {
      background-color: var(--md-sys-color-primary, #6200ee);
      color: var(--md-sys-color-on-primary, white);
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .search-button:hover {
      background-color: var(--md-sys-color-primary, #7626fc);
    }
    
    .search-button:disabled {
      background-color: var(--md-sys-color-on-surface, #9e9e9e);
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .options-row {
      display: flex;
      gap: 16px;
    }
    
    .checkbox-option {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .results-container {
      flex-grow: 1;
      overflow-y: auto;
      padding: 16px;
    }
    
    .results-info {
      margin-bottom: 16px;
      font-style: italic;
      color: var(--md-sys-color-on-surface-variant, #666);
    }
    
    .error-message {
      color: var(--md-sys-color-error, #b00020);
      background-color: var(--md-sys-color-error-container, #ffdad6);
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    
    .file-result {
      margin-bottom: 16px;
    }
    
    .file-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background-color: var(--md-sys-color-surface-variant, #e7e0ec);
      border-radius: 4px;
      cursor: pointer;
    }
    
    .file-header:hover {
      background-color: var(--md-sys-color-surface-variant, #d9d1e0);
    }
    
    .file-icon {
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    
    .file-path {
      font-weight: bold;
      flex-grow: 1;
    }
    
    .match-count {
      background-color: var(--md-sys-color-primary, #6200ee);
      color: var(--md-sys-color-on-primary, white);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 12px;
    }
    
    .match-list {
      background-color: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .match-item {
      padding: 8px 16px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      font-family: monospace;
      white-space: pre-wrap;
      overflow-x: auto;
      display: flex;
      cursor: pointer;
    }
    
    .match-item:hover {
      background-color: var(--md-sys-color-surface-variant, #f5f1fa);
    }
    
    .match-item:last-child {
      border-bottom: none;
    }
    
    .line-number {
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin-right: 16px;
      user-select: none;
      min-width: 40px;
      text-align: right;
    }
    
    .line-content {
      flex-grow: 1;
    }
    
    .loading-indicator {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 50px;
    }
    
    .spinner {
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-left-color: var(--md-sys-color-primary, #6200ee);
      border-radius: 50%;
      width: 24px;
      height: 24px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
}

customElements.define('find-in-files', FindInFiles);
