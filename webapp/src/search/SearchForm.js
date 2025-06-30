import { html, css, LitElement } from 'lit';
import { EventHelper } from '../utils/EventHelper.js';

// Import Material Design Web Components
import '@material/web/button/filled-button.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/textfield/outlined-text-field.js';

export class SearchForm extends LitElement {
  static properties = {
    searchState: { type: Object }
  };

  constructor() {
    super();
    this.searchState = null;
  }

  /**
   * Focus the search input field and optionally set the search query
   * @param {string} [selectedText] - Optional text to set as the search query
   */
  focusInput(selectedText = '') {
    // Set the search query first if selected text is provided
    if (selectedText && selectedText.trim()) {
      this.searchState.searchQuery = selectedText.trim();
      this.searchState._notifyUpdate();
      this.requestUpdate();
    }
    
    this.updateComplete.then(() => {
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
        } else {
          // Fallback: try focusing the text field directly
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

  render() {
    if (!this.searchState) return html``;

    return html`
      <form class="search-form" @submit=${this.handleSearch}>
        <div class="input-row">
          <md-outlined-text-field
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
  `;
}

customElements.define('search-form', SearchForm);
