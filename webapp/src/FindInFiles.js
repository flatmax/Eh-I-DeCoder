import { html, css, LitElement } from 'lit';
import { JRPCClient } from '@flatmax/jrpc-oo';
import { repeat } from 'lit/directives/repeat.js';
import { extractResponseData } from './Utils.js';

// Import Material Design Web Components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/progress/circular-progress.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';

export class FindInFiles extends JRPCClient {
  static properties = {
    searchQuery: { type: String, state: true },
    searchResults: { type: Array, state: true },
    isSearching: { type: Boolean, state: true },
    searchError: { type: String, state: true },
    useWordMatch: { type: Boolean, state: true },
    useRegex: { type: Boolean, state: true },
    respectGitignore: { type: Boolean, state: true },
    caseSensitive: { type: Boolean, state: true },
    serverURI: { type: String },
    expandedFiles: { type: Set, state: true },
    allExpanded: { type: Boolean, state: true }
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
    this.caseSensitive = false; // Default to case-insensitive search
    this.expandedFiles = new Set();
    this.allExpanded = false;
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  /**
   * Focus the search input field and optionally set the search query
   * @param {string} [selectedText] - Optional text to set as the search query
   */
  focusSearchInput(selectedText = '') {
    this.updateComplete.then(() => {
      // Set the search query if selected text is provided
      if (selectedText && selectedText.trim()) {
        this.searchQuery = selectedText.trim();
        this.requestUpdate();
      }
      
      const textField = this.shadowRoot.querySelector('md-outlined-text-field');
      if (textField) {
        // For Material Design Web Components, we need to focus the internal input
        const input = textField.shadowRoot?.querySelector('input');
        if (input) {
          input.focus();
          // If we set text, select it all for easy replacement
          if (selectedText && selectedText.trim()) {
            input.select();
          }
          console.log('Search input focused successfully', selectedText ? `with text: "${selectedText}"` : '');
        } else {
          // Fallback: try focusing the text field directly
          textField.focus();
          console.log('Search text field focused (fallback)', selectedText ? `with text: "${selectedText}"` : '');
        }
      } else {
        console.warn('Search text field not found');
      }
    });
  }
  
  async handleSearch(e) {
    e?.preventDefault();
    
    const query = this.searchQuery?.trim();
    if (!query) return;
    
    this.isSearching = true;
    this.searchResults = [];
    this.searchError = null;
    this.expandedFiles = new Set();
    this.allExpanded = false;
    
    try {
      console.log(`Searching for "${query}" (word: ${this.useWordMatch}, regex: ${this.useRegex}, respectGitignore: ${this.respectGitignore}, caseSensitive: ${this.caseSensitive})`);
      const response = await this.call['Repo.search_files'](
        query, 
        this.useWordMatch, 
        this.useRegex,
        this.respectGitignore,
        !this.caseSensitive  // pass the inverse as ignore_case
      );
      
      if (response.error) {
        this.searchError = response.error;
        console.error('Search error:', response.error);
      } else {
        // Extract search results using the utility function
        this.searchResults = extractResponseData(response, [], true);
        
        console.log(`Found matches in ${this.searchResults.length} files`);
      }
    } catch (error) {
      this.searchError = `Search failed: ${error.message || 'Unknown error'}`;
      console.error('Search error:', error);
    } finally {
      this.isSearching = false;
    }
  }
  
  handleExpandAll() {
    this.allExpanded = true;
    this.expandedFiles = new Set(this.searchResults.map(result => result.file));
    this.requestUpdate();
  }
  
  handleCollapseAll() {
    this.allExpanded = false;
    this.expandedFiles = new Set();
    this.requestUpdate();
  }
  
  handleFileHeaderClick(filePath) {
    if (this.expandedFiles.has(filePath)) {
      this.expandedFiles.delete(filePath);
    } else {
      this.expandedFiles.add(filePath);
    }
    
    // Update allExpanded state based on current expansion
    this.allExpanded = this.expandedFiles.size === this.searchResults.length;
    
    this.requestUpdate();
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
            <md-outlined-text-field
              label="Search in files..."
              .value=${this.searchQuery || ''} 
              @input=${e => this.searchQuery = e.target.value}
              @keydown=${e => e.key === 'Enter' && this.handleSearch(e)}
              ?disabled=${this.isSearching}
              style="flex-grow: 1;"
            ></md-outlined-text-field>
            
            <md-filled-button
              type="submit"
              ?disabled=${this.isSearching || !this.searchQuery?.trim()}
            >
              ${this.isSearching ? 
                'Searching...' : 
                html`<span class="material-symbols-outlined">search</span>`
              }
            </md-filled-button>
          </div>
          <div class="options-row">
            <div class="checkbox-option" title="Whole words only">
              <md-checkbox
                ?checked=${this.useWordMatch}
                @change=${e => this.useWordMatch = e.target.checked}
                ?disabled=${this.isSearching}
              ></md-checkbox>
              <label>
                <span class="mdi mdi-text-box-search" style="font-size: 16px;"></span>
                <span class="option-text">Word</span>
              </label>
            </div>
            
            <div class="checkbox-option">
              <md-checkbox
                ?checked=${this.useRegex}
                @change=${e => this.useRegex = e.target.checked}
                ?disabled=${this.isSearching}
              ></md-checkbox>
              <label>Regex</label>
            </div>
            
            <div class="checkbox-option">
              <md-checkbox
                ?checked=${this.respectGitignore}
                @change=${e => this.respectGitignore = e.target.checked}
                ?disabled=${this.isSearching}
              ></md-checkbox>
              <label>.gitignore</label>
            </div>
            <button 
              class="case-sensitive-button" 
              @click=${() => this.isSearching ? null : (this.caseSensitive = !this.caseSensitive)}
              ?disabled=${this.isSearching}
              title="${this.caseSensitive ? 'Case sensitive (click to disable)' : 'Case insensitive (click to enable)'}"
            >
              <span class="mdi mdi-case-sensitive-alt ${this.caseSensitive ? 'active' : 'inactive'}"></span>
              <span>Aa</span>
            </button>
          </div>
        </form>
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
        
        ${!this.isSearching && this.searchResults?.length > 0 ? html`
          <div class="results-header">
            <div class="results-info">
              ${this.searchResults.length} file${this.searchResults.length !== 1 ? 's' : ''}
            </div>
            <div class="results-controls">
              <md-icon-button 
                title="Expand All" 
                @click=${this.handleExpandAll}
                ?disabled=${this.allExpanded}
              >
                <md-icon class="material-symbols-outlined">unfold_more</md-icon>
              </md-icon-button>
              <md-icon-button 
                title="Collapse All" 
                @click=${this.handleCollapseAll}
                ?disabled=${this.expandedFiles.size === 0}
              >
                <md-icon class="material-symbols-outlined">unfold_less</md-icon>
              </md-icon-button>
            </div>
          </div>
          
          ${repeat(this.searchResults, result => result.file, result => {
            const isExpanded = this.expandedFiles.has(result.file);
            return html`
              <div class="file-result">
                <div class="file-header" @click=${() => this.handleFileHeaderClick(result.file)}>
                  <md-icon class="material-symbols-outlined expand-icon">
                    ${isExpanded ? 'expand_less' : 'expand_more'}
                  </md-icon>
                  <span class="file-path">${result.file}</span>
                  <span class="match-count">${result.matches.length}</span>
                </div>
                
                ${isExpanded ? html`
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
                ` : ''}
              </div>
            `;
          })}
        ` : ''}
        
        ${!this.isSearching && this.searchResults?.length === 0 && !this.searchError && this.searchQuery ? html`
          <div class="results-info no-results">
            <span class="material-symbols-outlined">search_off</span>
            <span>No matches found</span>
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
    
    .search-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .input-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .options-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    
    .checkbox-option {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .checkbox-option label {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
    }
    
    .checkbox-option .mdi {
      font-size: 16px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    
    .option-text {
      font-size: 12px;
    }
    
    .case-sensitive-button {
      display: flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 4px;
      padding: 2px 6px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 12px;
    }
    
    .case-sensitive-button:hover {
      background-color: var(--md-sys-color-surface-variant, #f5f1fa);
    }
    
    .case-sensitive-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .case-sensitive-button .mdi {
      font-size: 14px;
    }
    
    .case-sensitive-button .active {
      color: var(--md-sys-color-primary, #6200ee);
    }
    
    .case-sensitive-button .inactive {
      color: var(--md-sys-color-outline, #79747e);
      opacity: 0.7;
    }
    
    .results-container {
      flex-grow: 1;
      overflow-y: auto;
      padding: 8px;
    }
    
    .results-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .results-controls {
      display: flex;
      gap: 2px;
    }
    
    .results-info {
      color: var(--md-sys-color-on-surface-variant, #49454f);
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }
    
    .no-results {
      justify-content: center;
      padding: 16px;
      font-size: 14px;
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
    
    .file-result {
      margin-bottom: 4px;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    
    .file-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      background-color: var(--md-sys-color-surface-variant, #e7e0ec);
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .file-header:hover {
      background-color: var(--md-sys-color-surface-variant, #d9d1e0);
    }
    
    .expand-icon {
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-size: 16px;
      transition: transform 0.2s;
    }
    
    .file-path {
      font-weight: 500;
      flex-grow: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 12px;
    }
    
    .match-count {
      background-color: var(--md-sys-color-primary, #6750a4);
      color: var(--md-sys-color-on-primary, white);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 10px;
      min-width: 12px;
      text-align: center;
      font-weight: 500;
    }
    
    .match-list {
      background-color: var(--md-sys-color-surface, #ffffff);
    }
    
    .match-item {
      padding: 4px 8px;
      border-top: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      font-family: 'Roboto Mono', monospace;
      white-space: pre-wrap;
      overflow-x: auto;
      display: flex;
      cursor: pointer;
      transition: background-color 0.2s;
      font-size: 11px;
    }
    
    .match-item:hover {
      background-color: var(--md-sys-color-surface-variant, #f5f1fa);
    }
    
    .match-item:first-child {
      border-top: none;
    }
    
    .line-number {
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin-right: 8px;
      user-select: none;
      min-width: 30px;
      text-align: right;
    }
    
    .line-content {
      flex-grow: 1;
    }
    
    .loading-indicator {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 60px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
}
