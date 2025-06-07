import { html, css, LitElement } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

// Import Material Design Web Components
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';

export class SearchResults extends LitElement {
  static properties = {
    searchResults: { type: Array },
    expandedFiles: { type: Set },
    allExpanded: { type: Boolean },
    isSearching: { type: Boolean },
    searchQuery: { type: String },
    searchError: { type: String }
  };

  constructor() {
    super();
    this.searchResults = [];
    this.expandedFiles = new Set();
    this.allExpanded = false;
    this.isSearching = false;
    this.searchQuery = '';
    this.searchError = null;
  }

  handleExpandAll() {
    this.dispatchEvent(new CustomEvent('expand-all'));
  }

  handleCollapseAll() {
    this.dispatchEvent(new CustomEvent('collapse-all'));
  }

  handleFileHeaderClick(filePath) {
    this.dispatchEvent(new CustomEvent('file-header-click', {
      detail: { filePath }
    }));
  }

  handleOpenFile(filePath, lineNumber) {
    this.dispatchEvent(new CustomEvent('open-file', {
      detail: { filePath, lineNumber }
    }));
  }

  render() {
    if (!this.isSearching && this.searchResults?.length > 0) {
      return html`
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
      `;
    }

    if (!this.isSearching && this.searchResults?.length === 0 && !this.searchError && this.searchQuery) {
      return html`
        <div class="results-info no-results">
          <span class="material-symbols-outlined">search_off</span>
          <span>No matches found</span>
        </div>
      `;
    }

    return html``;
  }

  static styles = css`
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
  `;
}

customElements.define('search-results', SearchResults);
