import { html, css, LitElement } from 'lit';
import { EventHelper } from '../utils/EventHelper.js';

import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/icon/icon.js';

export class SearchForm extends LitElement {
  static properties = {
    searchState: { type: Object }
  };

  constructor() {
    super();
    this.searchState = null;
  }

  focusInput(selectedText = '') {
    if (selectedText && selectedText.trim()) {
      this.searchState.searchQuery = selectedText.trim();
      this.searchState._notifyUpdate();
      this.requestUpdate();
    }
    
    this.updateComplete.then(() => {
      const textField = this.shadowRoot.querySelector('#search-input');
      if (textField) {
        const input = textField.shadowRoot?.querySelector('input');
        if (input) {
          input.focus();
          if (selectedText && selectedText.trim()) {
            input.select();
          }
        } else {
          textField.focus();
        }
      }
    });
  }

  handleSearch(e) {
    e?.preventDefault();
    
    const query = this.searchState.searchQuery?.trim();
    if (!query) return;
    
    const options = {
      useWordMatch: this.searchState.useWordMatch,
      useRegex: this.searchState.useRegex,
      respectGitignore: this.searchState.respectGitignore,
      caseSensitive: this.searchState.caseSensitive
    };
    
    EventHelper.dispatch(this, 'search', { query, options });
  }

  handleInputChange(e) {
    this.searchState.searchQuery = e.target.value;
    this.searchState._notifyUpdate();
    this.requestUpdate();
  }

  handleReplaceInputChange(e) {
    this.searchState.replaceQuery = e.target.value;
    this.searchState._notifyUpdate();
    this.requestUpdate();
  }

  handleToggleReplace() {
    this.searchState.toggleShowReplace();
    this.requestUpdate();
  }

  handleReplaceAll() {
    const searchQuery = this.searchState.searchQuery?.trim();
    const replaceQuery = this.searchState.replaceQuery;
    
    if (!searchQuery) return;
    
    const filePaths = this.searchState.searchResults.map(result => result.file);
    
    if (filePaths.length === 0) {
      console.warn('No files to replace in');
      return;
    }
    
    const options = {
      useWordMatch: this.searchState.useWordMatch,
      useRegex: this.searchState.useRegex,
      caseSensitive: this.searchState.caseSensitive
    };
    
    EventHelper.dispatch(this, 'replace-all', { 
      searchQuery, 
      replaceQuery, 
      filePaths,
      options 
    });
  }

  handleReplaceInFile(filePath) {
    const searchQuery = this.searchState.searchQuery?.trim();
    const replaceQuery = this.searchState.replaceQuery;
    
    if (!searchQuery) return;
    
    const options = {
      useWordMatch: this.searchState.useWordMatch,
      useRegex: this.searchState.useRegex,
      caseSensitive: this.searchState.caseSensitive
    };
    
    EventHelper.dispatch(this, 'replace-in-file', { 
      searchQuery, 
      replaceQuery, 
      filePath,
      options 
    });
  }

  render() {
    if (!this.searchState) return html``;

    const hasSearchResults = this.searchState.searchResults && this.searchState.searchResults.length > 0;
    const canReplace = this.searchState.searchQuery?.trim() && hasSearchResults && !this.searchState.isReplacing;

    return html`
      <form class="search-form" @submit=${this.handleSearch}>
        <div class="input-row">
          <md-outlined-text-field
            id="search-input"
            label="Search in files..."
            .value=${this.searchState.searchQuery || ''} 
            @input=${this.handleInputChange}
            @keydown=${e => e.key === 'Enter' && this.handleSearch(e)}
            ?disabled=${this.searchState.isSearching}
            style="flex-grow: 1;"
          ></md-outlined-text-field>
          
          <md-filled-button
            type="submit"
            ?disabled=${this.searchState.isSearching || !this.searchState.searchQuery?.trim()}
          >
            ${this.searchState.isSearching ? 
              'Searching...' : 
              html`<span class="material-symbols-outlined">search</span>`
            }
          </md-filled-button>
        </div>
        
        <button 
          type="button"
          class="replace-toggle"
          @click=${this.handleToggleReplace}
          title="${this.searchState.showReplace ? 'Hide replace options' : 'Show replace options'}"
        >
          <span class="mdi ${this.searchState.showReplace ? 'mdi-chevron-down' : 'mdi-chevron-right'} toggle-icon"></span>
          <span class="toggle-label">Replace</span>
        </button>
        
        ${this.searchState.showReplace ? html`
          <div class="replace-section">
            <div class="input-row">
              <md-outlined-text-field
                id="replace-input"
                label="Replace with..."
                .value=${this.searchState.replaceQuery || ''} 
                @input=${this.handleReplaceInputChange}
                ?disabled=${this.searchState.isReplacing}
                style="flex-grow: 1;"
              ></md-outlined-text-field>
              
              <md-filled-button
                type="button"
                @click=${this.handleReplaceAll}
                ?disabled=${!canReplace}
              >
                ${this.searchState.isReplacing ? 
                  'Replacing...' : 
                  html`<span class="material-symbols-outlined">find_replace</span>`
                }
              </md-filled-button>
            </div>
            
            ${this.searchState.replaceSuccess ? html`
              <div class="success-message">
                <span class="mdi mdi-check-circle"></span>
                ${this.searchState.replaceSuccess}
              </div>
            ` : ''}
            
            ${this.searchState.replaceError ? html`
              <div class="error-message">
                <span class="mdi mdi-alert-circle"></span>
                ${this.searchState.replaceError}
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        <div class="options-row">
          <div class="checkbox-option" title="Whole words only">
            <md-checkbox
              ?checked=${this.searchState.useWordMatch}
              @change=${e => this.searchState.useWordMatch = e.target.checked}
              ?disabled=${this.searchState.isSearching}
            ></md-checkbox>
            <label>
              <span class="mdi mdi-text-box-search" style="font-size: 16px;"></span>
              <span class="option-text">└─┘</span>
            </label>
          </div>
          
          <div class="checkbox-option">
            <md-checkbox
              ?checked=${this.searchState.useRegex}
              @change=${e => this.searchState.useRegex = e.target.checked}
              ?disabled=${this.searchState.isSearching}
            ></md-checkbox>
            <label><code>.*</code></label>
          </div>
          
          <div class="checkbox-option">
            <md-checkbox
              ?checked=${this.searchState.respectGitignore}
              @change=${e => this.searchState.respectGitignore = e.target.checked}
              ?disabled=${this.searchState.isSearching}
            ></md-checkbox>
            <label>.gitignore</label>
          </div>
          <button 
            type="button"
            class="case-sensitive-button" 
            @click=${() => this.searchState.isSearching ? null : (this.searchState.caseSensitive = !this.searchState.caseSensitive)}
            ?disabled=${this.searchState.isSearching}
            title="${this.searchState.caseSensitive ? 'Case sensitive (click to disable)' : 'Case insensitive (click to enable)'}"
          >
            <span class="mdi mdi-case-sensitive-alt ${this.searchState.caseSensitive ? 'active' : 'inactive'}"></span>
            <span>Aa</span>
          </button>
        </div>
      </form>
    `;
  }

  static styles = css`
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
    
    .replace-toggle {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: none;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-size: 13px;
      font-family: inherit;
      transition: background-color 0.2s ease;
      width: fit-content;
    }
    
    .replace-toggle:hover {
      background-color: var(--md-sys-color-surface-variant, #e7e0ec);
    }
    
    .replace-toggle:active {
      background-color: var(--md-sys-color-outline-variant, #cac4d0);
    }
    
    .toggle-icon {
      font-size: 18px;
      transition: transform 0.2s ease;
    }
    
    .toggle-label {
      font-weight: 500;
    }
    
    .replace-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 8px;
      background-color: var(--md-sys-color-surface-variant, #e7e0ec);
      border-radius: 8px;
      animation: slideDown 0.2s ease;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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
    
    .success-message {
      color: var(--md-sys-color-on-tertiary-container, #1d4e1d);
      background-color: var(--md-sys-color-tertiary-container, #d4edda);
      padding: 8px 12px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }
    
    .success-message .mdi {
      color: #28a745;
      font-size: 16px;
    }
    
    .error-message {
      color: var(--md-sys-color-on-error-container, #410e0b);
      background-color: var(--md-sys-color-error-container, #f9dedc);
      padding: 8px 12px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }
    
    .error-message .mdi {
      font-size: 16px;
    }
  `;
}

customElements.define('search-form', SearchForm);
