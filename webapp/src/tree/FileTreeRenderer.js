import {html} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '../FuzzySearch.js';

export class FileTreeRenderer {
  constructor(host) {
    this.host = host;
  }

  renderHeaderControls() {
    const controls = this.host.getHeaderControls();
    
    return html`
      <div class="tree-controls">
        ${controls.showUncheckAll ? html`
          <md-icon-button title="Uncheck All" @click=${() => this.host.uncheckAll()}>
            <md-icon class="material-symbols-outlined">check_box_outline_blank</md-icon>
          </md-icon-button>
        ` : ''}
        ${controls.showExpandAll ? html`
          <md-icon-button title="Expand All" @click=${() => this.host.expandAll()}>
            <md-icon class="material-symbols-outlined">unfold_more</md-icon>
          </md-icon-button>
        ` : ''}
        ${controls.showCollapseAll ? html`
          <md-icon-button title="Collapse All" @click=${() => this.host.collapseAll()}>
            <md-icon class="material-symbols-outlined">unfold_less</md-icon>
          </md-icon-button>
        ` : ''}
        ${controls.showRefresh ? html`
          <md-icon-button title="Refresh" @click=${() => this.host.loadFileTree()}>
            <md-icon class="material-symbols-outlined">refresh</md-icon>
          </md-icon-button>
        ` : ''}
        ${controls.showLineCountToggle ? html`
          <md-icon-button 
            title="${this.host.showLineCounts ? 'Hide Line Counts' : 'Show Line Counts'}" 
            @click=${() => this.host.toggleLineCounts()}
            class="${this.host.showLineCounts ? 'active' : ''}">
            <md-icon class="material-symbols-outlined">format_list_numbered</md-icon>
          </md-icon-button>
        ` : ''}
        <md-icon-button title="Search Files (Ctrl+P)" @click=${() => this.host.openFuzzySearch()}>
          <md-icon class="material-symbols-outlined">search</md-icon>
        </md-icon-button>
      </div>
    `;
  }

  renderTreeNode(node, path = '') {
    if (!node) return html``;
    
    const nodePath = node.path;
    const isAdded = node.isFile && this.host.addedFiles.includes(nodePath);
    const hasChildren = !node.isFile && node.children && node.children.size > 0;
    
    const nodeClasses = {
      'file-node': true,
      'directory': !node.isFile,
      'file': node.isFile,
      ...this.host.getAdditionalNodeClasses(node, nodePath)
    };
    
    if (node.name === 'root') {
      return html`
        <div class="tree-root">
          ${node.getSortedChildren().map(child => this.renderTreeNode(child))}
        </div>
      `;
    }
    
    if (hasChildren) {
      const isOpen = this.host.treeExpansion.isExpanded(nodePath);
      
      return html`
        <details class="directory-details" ?open=${isOpen} @toggle=${(e) => {
          this.host.treeExpansion.setExpanded(nodePath, e.target.open);
        }}>
          <summary class=${classMap(nodeClasses)}
                   @contextmenu=${(event) => this.host.handleContextMenu(event, nodePath, node.isFile)}>
            <md-icon class="material-symbols-outlined">
              ${isOpen ? 'folder_open' : 'folder'}
            </md-icon>
            <span>${node.name}</span>
          </summary>
          <div class="children-container">
            ${node.getSortedChildren().map(child => this.renderTreeNode(child))}
          </div>
        </details>
      `;
    } else {
      const lineCount = this.host.showLineCounts ? this.host.lineCounts[nodePath] : null;
      
      return html`
        <div class=${classMap(nodeClasses)}
             @contextmenu=${(event) => this.host.handleContextMenu(event, nodePath, node.isFile)}>
          ${node.isFile ? html`<input type="checkbox" ?checked=${isAdded} class="file-checkbox" 
                               @click=${(e) => this.host.handleCheckboxClick(e, nodePath)}>` : ''}
          <md-icon class="material-symbols-outlined">description</md-icon>
          <span @click=${() => this.host.handleFileClick(nodePath, node.isFile)}>${node.name}</span>
          ${lineCount !== null && lineCount !== undefined && lineCount >= 0 ? html`
            <span class="line-count">
              <md-icon class="material-symbols-outlined">format_list_numbered</md-icon>
              ${lineCount}
            </span>
          ` : ''}
          ${this.host.renderAdditionalIndicators(node, nodePath)}
        </div>
      `;
    }
  }

  render() {
    return html`
      <div class="file-tree-container">
        ${this.host.renderAdditionalHeaderContent()}
        <div class="file-tree-header">
          ${this.renderHeaderControls()}
        </div>
        
        ${this.host.loading ? 
          html`<div class="loading">Loading files...</div>` : 
          this.host.error ? 
            html`<div class="error">${this.host.error}</div>` :
            html`<div class="file-tree">${this.renderTreeNode(this.host.treeData)}</div>`
        }
        
        ${this.host.renderAdditionalContent()}
        
        <fuzzy-search 
          ?visible=${this.host.fuzzySearchVisible || false}
          .files=${this.host.files || []}
          @file-selected=${this.host.handleFuzzySearchFileSelected}
          @hide-requested=${this.host.closeFuzzySearch}
        ></fuzzy-search>
      </div>
    `;
  }
}
