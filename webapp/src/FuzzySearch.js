import { LitElement, html, css } from 'lit';

export class FuzzySearch extends LitElement {
  static properties = {
    visible: { type: Boolean },
    files: { type: Array },
    filteredFiles: { type: Array, state: true },
    searchTerm: { type: String, state: true },
    selectedIndex: { type: Number, state: true }
  };

  constructor() {
    super();
    this.visible = false;
    this.files = [];
    this.filteredFiles = [];
    this.searchTerm = '';
    this.selectedIndex = 0;
    this.boundKeyHandler = this.handleKeyDown.bind(this);
  }

  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 100px;
      z-index: 1000;
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.2s ease, visibility 0.2s ease;
    }

    :host([visible]) {
      visibility: visible;
      opacity: 1;
    }

    .fuzzy-search-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      width: 600px;
      max-width: 90vw;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .search-input {
      padding: 16px;
      border: none;
      font-size: 16px;
      outline: none;
      border-bottom: 1px solid #eee;
    }

    .results-container {
      flex: 1;
      overflow-y: auto;
      max-height: 400px;
    }

    .result-item {
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      align-items: center;
      transition: background-color 0.1s ease;
    }

    .result-item:hover,
    .result-item.selected {
      background-color: #f5f5f5;
    }

    .result-item.selected {
      background-color: #e3f2fd;
    }

    .file-icon {
      margin-right: 12px;
      color: #666;
      font-size: 18px;
    }

    .file-path {
      flex: 1;
      font-family: monospace;
      font-size: 14px;
    }

    .file-name {
      font-weight: 500;
      color: #333;
    }

    .file-directory {
      color: #666;
      font-size: 12px;
      margin-top: 2px;
    }

    .no-results {
      padding: 20px;
      text-align: center;
      color: #666;
      font-style: italic;
    }

    .search-hint {
      padding: 8px 16px;
      background: #f8f9fa;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  `;

  updated(changedProperties) {
    if (changedProperties.has('visible')) {
      console.log('FuzzySearch visibility changed to:', this.visible);
      if (this.visible) {
        // Add global key listener when visible
        document.addEventListener('keydown', this.boundKeyHandler, true);
        this.updateComplete.then(() => {
          const input = this.shadowRoot.querySelector('.search-input');
          if (input) {
            input.focus();
            console.log('FuzzySearch input focused');
          }
        });
      } else {
        // Remove global key listener when hidden
        document.removeEventListener('keydown', this.boundKeyHandler, true);
      }
    }
    
    if (changedProperties.has('files')) {
      console.log('FuzzySearch files updated:', this.files.length);
      this.filteredFiles = this.files.slice(0, 50);
    }
  }

  show(files = []) {
    console.log('FuzzySearch.show() called with files:', files.length);
    this.files = files;
    this.searchTerm = '';
    this.selectedIndex = 0;
    this.filteredFiles = files.slice(0, 50); // Show first 50 files initially
    this.visible = true;
    
    this.updateComplete.then(() => {
      const input = this.shadowRoot.querySelector('.search-input');
      if (input) {
        input.focus();
        console.log('Input focused after show()');
      }
    });
  }

  hide() {
    console.log('FuzzySearch.hide() called');
    this.visible = false;
    this.searchTerm = '';
    this.filteredFiles = [];
    this.selectedIndex = 0;
  }

  handleKeyDown(event) {
    // Only handle keys when visible
    if (!this.visible) return;
    
    console.log('FuzzySearch key pressed:', event.key);
    
    // Stop propagation to prevent other handlers from interfering
    event.stopPropagation();
    
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.hide();
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredFiles.length - 1);
        this.scrollToSelected();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.scrollToSelected();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.filteredFiles.length > 0) {
          this.selectFile(this.filteredFiles[this.selectedIndex]);
        }
        break;
      default:
        // For regular typing, let the input handle it
        if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
          // Focus the input if it's not already focused
          const input = this.shadowRoot.querySelector('.search-input');
          if (input && document.activeElement !== input) {
            input.focus();
          }
        }
        break;
    }
  }

  handleInput(event) {
    this.searchTerm = event.target.value;
    this.selectedIndex = 0;
    this.filterFiles();
  }

  filterFiles() {
    if (!this.searchTerm.trim()) {
      this.filteredFiles = this.files.slice(0, 50);
      return;
    }

    const searchLower = this.searchTerm.toLowerCase();
    const filtered = this.files
      .filter(file => file.toLowerCase().includes(searchLower))
      .sort((a, b) => {
        // Prioritize files where the search term appears in the filename
        const aFileName = a.split('/').pop().toLowerCase();
        const bFileName = b.split('/').pop().toLowerCase();
        
        const aInFileName = aFileName.includes(searchLower);
        const bInFileName = bFileName.includes(searchLower);
        
        if (aInFileName && !bInFileName) return -1;
        if (!aInFileName && bInFileName) return 1;
        
        // Then sort by how early the match appears
        const aIndex = a.toLowerCase().indexOf(searchLower);
        const bIndex = b.toLowerCase().indexOf(searchLower);
        
        if (aIndex !== bIndex) return aIndex - bIndex;
        
        // Finally sort alphabetically
        return a.localeCompare(b);
      })
      .slice(0, 50); // Limit to 50 results

    this.filteredFiles = filtered;
  }

  scrollToSelected() {
    this.updateComplete.then(() => {
      const selectedElement = this.shadowRoot.querySelector('.result-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    });
  }

  selectFile(filePath) {
    console.log('FuzzySearch file selected:', filePath);
    // Emit custom event with selected file
    this.dispatchEvent(new CustomEvent('file-selected', {
      detail: { filePath },
      bubbles: true,
      composed: true
    }));
    
    this.hide();
  }

  handleBackdropClick(event) {
    if (event.target === this) {
      this.hide();
    }
  }

  renderFileItem(file, index) {
    const fileName = file.split('/').pop();
    const directory = file.substring(0, file.lastIndexOf('/'));
    
    return html`
      <div 
        class="result-item ${index === this.selectedIndex ? 'selected' : ''}"
        @click=${() => this.selectFile(file)}
        @mouseenter=${() => { this.selectedIndex = index; }}
      >
        <span class="file-icon">📄</span>
        <div class="file-path">
          <div class="file-name">${fileName}</div>
          ${directory ? html`<div class="file-directory">${directory}</div>` : ''}
        </div>
      </div>
    `;
  }

  render() {
    if (!this.visible) {
      return html``;
    }
    
    return html`
      <div class="fuzzy-search-container" @click=${(e) => e.stopPropagation()}>
        <input
          class="search-input"
          type="text"
          placeholder="Search files..."
          .value=${this.searchTerm}
          @input=${this.handleInput}
        />
        
        <div class="results-container">
          ${this.filteredFiles.length > 0
            ? this.filteredFiles.map((file, index) => this.renderFileItem(file, index))
            : html`<div class="no-results">
                ${this.searchTerm ? 'No files found' : 'Start typing to search files...'}
              </div>`
          }
        </div>
        
        <div class="search-hint">
          Use ↑↓ to navigate, Enter to select, Esc to close
        </div>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.handleBackdropClick.bind(this));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleBackdropClick.bind(this));
    // Make sure to remove the global listener if component is destroyed while visible
    document.removeEventListener('keydown', this.boundKeyHandler, true);
  }
}

customElements.define('fuzzy-search', FuzzySearch);
