import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import {extractResponseData} from './Utils.js';
import {TreeNode} from './tree/TreeNode.js';
import {TreeBuilder} from './tree/TreeBuilder.js';
import {TreeExpansion} from './tree/TreeExpansion.js';

export class FileTree extends JRPCClient {
  static properties = {
    files: { type: Array, state: true },
    addedFiles: { type: Array, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true },
    treeData: { type: Object, state: true },
    serverURI: { type: String }
  };
  
  constructor() {
    super();
    this.files = [];
    this.addedFiles = [];
    this.loading = false;
    this.error = null;
    this.treeData = new TreeNode('root', '', false);
    this.treeExpansion = new TreeExpansion();
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  setupDone() {
    console.log('FileTree::setupDone');
    this.loadFileTree();
  }
  
  // Expand all directories in the tree
  expandAll() {
    this.treeExpansion.reset();
    this.treeExpansion.setAllExpandedState(this.treeData, true);
    this.requestUpdate();
    
    // Directly manipulate DOM after update
    this.updateComplete.then(() => {
      const details = this.shadowRoot.querySelectorAll('details.directory-details');
      details.forEach(detail => {
        detail.open = true;
      });
    });
  }
  
  // Collapse all directories in the tree
  collapseAll() {
    this.treeExpansion.reset();
    this.treeExpansion.setAllExpandedState(this.treeData, false);
    this.requestUpdate();
    
    // Directly manipulate DOM after update
    this.updateComplete.then(() => {
      const details = this.shadowRoot.querySelectorAll('details.directory-details');
      details.forEach(detail => {
        detail.open = false;
      });
    });
  }
  
  // Uncheck all checkboxes (remove all files from chat context)
  async uncheckAll() {
    try {
      // Create a copy of addedFiles to iterate over since we'll be modifying the original
      const filesToRemove = [...this.addedFiles];
      
      // Remove each file from the chat context
      for (const filePath of filesToRemove) {
        try {
          await this.call['EditBlockCoder.drop_rel_fname'](filePath);
        } catch (error) {
          console.error(`Error removing file ${filePath}:`, error);
        }
      }
    } catch (error) {
      console.error('Error unchecking all files:', error);
    }
  }
  
  async loadFileTree(scrollPosition = 0) {
    try {
      this.loading = true;
      this.error = null;
      
      // Get all files in the repository
      const allFilesResponse = await this.call['EditBlockCoder.get_all_relative_files']();
      const all_files = extractResponseData(allFilesResponse, [], true);
      
      // Get files that are already added to the chat context
      const addedFilesResponse = await this.call['EditBlockCoder.get_inchat_relative_files']();
      const added_files = extractResponseData(addedFilesResponse, [], true);
      
      // Store files
      this.addedFiles = added_files;
      this.files = all_files;
      
      // Build the file tree structure from all files
      this.treeData = TreeBuilder.buildTreeFromPaths(this.files);
      
      // Setup initial expansion state
      this.setupInitialExpansion();
      
    } catch (error) {
      console.error('Error loading file tree:', error);
      this.error = `Failed to load file tree: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
      
      // Restore scroll position after update completes
      this.restoreScrollPosition(scrollPosition);
    }
  }

  setupInitialExpansion() {
    // Initially collapse all directories
    this.treeExpansion.reset();
    this.treeExpansion.setAllExpandedState(this.treeData, false);
    
    // Then ensure directories with added files are expanded
    if (this.addedFiles && this.addedFiles.length > 0) {
      this.addedFiles.forEach(filePath => {
        this.treeExpansion.expandPathToFile(filePath);
      });
    }
  }

  restoreScrollPosition(scrollPosition) {
    this.updateComplete.then(() => {
      const fileTreeContainer = this.shadowRoot.querySelector('.file-tree-container');
      if (fileTreeContainer && scrollPosition > 0) {
        fileTreeContainer.scrollTop = scrollPosition;
      }
    });
  }
  
  // handleFileClick doesn't do anything now - users must click checkbox directly to add/remove files
  async handleFileClick(path, isFile) {
    // No action when clicking file name
  }
  
  // Handle checkbox clicks for adding/removing files
  async handleCheckboxClick(event, path) {
    event.stopPropagation();
    
    try {
      const isAdded = this.addedFiles.includes(path);
      
      if (isAdded) {
        await this.call['EditBlockCoder.drop_rel_fname'](path);
      } else {
        await this.call['EditBlockCoder.add_rel_fname'](path);
      }
    } catch (error) {
      console.error(`Error ${isAdded ? 'dropping' : 'adding'} file:`, error);
    }
  }
  
  // Handle notification when a file is added to the chat context
  add_rel_fname_notification(filePath) {
    console.log(`File added notification: ${filePath}`);
    
    if (!this.addedFiles.includes(filePath)) {
      this.addedFiles = [...this.addedFiles, filePath];
      this.treeExpansion.expandPathToFile(filePath);
      this.requestUpdate();
    }
  }
  
  // Handle notification when a file is dropped from the chat context
  drop_rel_fname_notification(filePath) {
    console.log(`File dropped notification: ${filePath}`);
    
    if (this.addedFiles.includes(filePath)) {
      this.addedFiles = this.addedFiles.filter(f => f !== filePath);
      this.requestUpdate();
    }
  }
  
  // Method to get additional node classes - can be overridden by subclasses
  getAdditionalNodeClasses(node, nodePath) {
    return {};
  }
  
  // Method to render additional indicators - can be overridden by subclasses
  renderAdditionalIndicators(node, nodePath) {
    return html``;
  }
  
  // Default context menu handler - can be overridden by subclasses
  handleContextMenu(event, path, isFile) {
    // Base class does nothing - subclasses can override
  }
  
  renderTreeNode(node, path = '') {
    if (!node) return html``;
    
    const nodePath = node.path;
    const isAdded = node.isFile && this.addedFiles.includes(nodePath);
    const hasChildren = !node.isFile && node.children && node.children.size > 0;
    
    const nodeClasses = {
      'file-node': true,
      'directory': !node.isFile,
      'file': node.isFile,
      ...this.getAdditionalNodeClasses(node, nodePath)
    };
    
    if (node.name === 'root') {
      return html`
        <div class="tree-root">
          ${node.getSortedChildren().map(child => this.renderTreeNode(child))}
        </div>
      `;
    }
    
    if (hasChildren) {
      const isOpen = this.treeExpansion.isExpanded(nodePath);
      
      return html`
        <details class="directory-details" ?open=${isOpen} @toggle=${(e) => {
          this.treeExpansion.setExpanded(nodePath, e.target.open);
        }}>
          <summary class=${classMap(nodeClasses)}
                   @contextmenu=${(event) => this.handleContextMenu(event, nodePath, node.isFile)}>
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
      return html`
        <div class=${classMap(nodeClasses)}
             @contextmenu=${(event) => this.handleContextMenu(event, nodePath, node.isFile)}>
          ${node.isFile ? html`<input type="checkbox" ?checked=${isAdded} class="file-checkbox" 
                               @click=${(e) => this.handleCheckboxClick(e, nodePath)}>` : ''}
          <md-icon class="material-symbols-outlined">description</md-icon>
          <span @click=${() => this.handleFileClick(nodePath, node.isFile)}>${node.name}</span>
          ${this.renderAdditionalIndicators(node, nodePath)}
        </div>
      `;
    }
  }
  
  render() {
    return html`
      <div class="file-tree-container">
        <div class="file-tree-header">
          <div class="tree-controls">
            <md-icon-button title="Uncheck All" @click=${() => this.uncheckAll()}>
              <md-icon class="material-symbols-outlined">check_box_outline_blank</md-icon>
            </md-icon-button>
            <md-icon-button title="Expand All" @click=${() => this.expandAll()}>
              <md-icon class="material-symbols-outlined">unfold_more</md-icon>
            </md-icon-button>
            <md-icon-button title="Collapse All" @click=${() => this.collapseAll()}>
              <md-icon class="material-symbols-outlined">unfold_less</md-icon>
            </md-icon-button>
            <md-icon-button title="Refresh" @click=${() => this.loadFileTree()}>
              <md-icon class="material-symbols-outlined">refresh</md-icon>
            </md-icon-button>
          </div>
        </div>
        
        ${this.loading ? 
          html`<div class="loading">Loading files...</div>` : 
          this.error ? 
            html`<div class="error">${this.error}</div>` :
            html`<div class="file-tree">${this.renderTreeNode(this.treeData)}</div>`
        }
      </div>
    `;
  }
  
  static styles = css`
    :host {
      display: block;
      height: 100%;
    }
    
    .file-tree-container {
      height: 100%;
      overflow: auto;
      background-color: #fff;
    }
    
    .file-tree-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 4px 8px;
      border-bottom: 1px solid #ccc;
    }
    
    .tree-controls {
      display: flex;
      gap: 2px;
    }
    
    .file-tree {
      padding: 8px;
    }
    
    .file-node {
      display: flex;
      align-items: center;
      padding: 6px 8px;
      cursor: pointer;
      border-radius: 4px;
      margin: 2px 0;
    }
    
    .file-node:hover {
      background-color: #f5f5f5;
    }
    
    .file-node md-icon {
      margin-right: 8px;
      font-size: 18px;
      font-family: 'Material Symbols Outlined';
      display: inline-flex;
      flex-shrink: 0;
      --md-icon-size: 18px;
      color: #616161;
    }
    
    .directory md-icon {
      color: #FFA000;  /* Amber color for folders */
    }
    
    .file md-icon {
      color: #2196F3;  /* Blue color for files */
    }
    
    .file-checkbox {
      margin-right: 4px;
      cursor: pointer;
    }
    
    .directory-details {
      margin-left: 0;
    }
    
    .directory-details summary {
      list-style: none;
    }
    
    .directory-details summary::marker,
    .directory-details summary::-webkit-details-marker {
      display: none;
    }
    
    .children-container {
      margin-left: 16px;
      border-left: 1px solid #ccc;
      padding-left: 8px;
    }
    
    .loading, .error {
      padding: 16px;
      text-align: center;
    }
    
    .error {
      color: red;
    }
  `;
}
