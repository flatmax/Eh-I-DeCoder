import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import {extractResponseData} from './Utils.js';

/**
 * Represents a node in the file tree (either a file or directory)
 */
class TreeNode {
  /**
   * Create a new tree node
   * @param {string} name - The name of this node (filename or directory name)
   * @param {string} path - The full path to this node
   * @param {boolean} isFile - Whether this node represents a file (true) or directory (false)
   */
  constructor(name, path, isFile) {
    this.name = name;
    this.path = path;
    this.isFile = isFile;
    this.children = isFile ? null : new Map(); // Only directories have children
  }
  
  /**
   * Add a child node to this directory
   * @param {string} name - Child node name
   * @param {TreeNode} node - Child node to add
   */
  addChild(name, node) {
    if (this.isFile) throw new Error("Cannot add children to a file node");
    this.children.set(name, node);
  }
  
  /**
   * Get sorted children of this node
   * @returns {TreeNode[]} Sorted array of child nodes (directories first, then alphabetical)
   */
  getSortedChildren() {
    if (!this.children) return [];
    
    return Array.from(this.children.values())
      .sort((a, b) => {
        // Sort directories first, then by name
        if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
  }
}

export class FileTree extends JRPCClient {
  static properties = {
    files: { type: Array, state: true },
    addedFiles: { type: Array, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true },
    treeData: { type: Object, state: true },
    expandedDirs: { type: Object, state: true },
    serverURI: { type: String }
  };
  
  constructor() {
    super();
    this.files = [];
    this.addedFiles = [];
    this.loading = false;
    this.error = null;
    this.treeData = new TreeNode('root', '', false);
    this.expandedDirs = {}; // Track which directories are expanded
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  setupDone() {
    console.log('FileTree::setupDone');
    // Add a timeout before loading file tree to ensure connection is fully established
    this.loadFileTree();
  }
  
  // Expand all directories in the tree
  expandAll() {
    // Update state
    this.expandedDirs = {};
    this._setAllExpandedState(this.treeData, true);
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
    // Update state
    this.expandedDirs = {};
    this._setAllExpandedState(this.treeData, false);
    this.requestUpdate();
    
    // Directly manipulate DOM after update
    this.updateComplete.then(() => {
      const details = this.shadowRoot.querySelectorAll('details.directory-details');
      details.forEach(detail => {
        detail.open = false;
      });
    });
  }
  
  // Recursive helper to set expanded state for all directories
  _setAllExpandedState(node, expanded) {
    if (!node) return;
    
    // For non-root directories
    if (node.name !== 'root' && !node.isFile) {
      // Set expanded state for this directory
      this.expandedDirs[node.path] = expanded;
    }
    
    // If this is a directory with children, process them recursively
    if (!node.isFile && node.children && node.children.size > 0) {
      // Process all children recursively
      node.children.forEach(child => {
        this._setAllExpandedState(child, expanded);
      });
    }
  }
  
  // Expand all parent directories for a given file path
  _expandPathToFile(filePath) {
    if (!filePath) return;
    
    const parts = filePath.split('/');
    let currentPath = '';
    
    // For each part of the path except the last one (which is the file)
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
      // Mark this directory as expanded
      this.expandedDirs[currentPath] = true;
    }
  }
  
  async loadFileTree(scrollPosition = 0) {
    try {
      this.loading = true;
      this.error = null;
      
      // Get all files in the repository
      const allFilesResponse = await this.call['EditBlockCoder.get_all_relative_files']();
      
      // Extract file arrays using the utility function
      const all_files = extractResponseData(allFilesResponse, [], true);
      
      // Get files that are already added to the chat context
      const addedFilesResponse = await this.call['EditBlockCoder.get_inchat_relative_files']();
      
      // Handle the same structure for added files
      const added_files = extractResponseData(addedFilesResponse, [], true);
      
      // Store added files for highlighting
      this.addedFiles = added_files;
      
      // Store all files
      this.files = all_files;
      
      // Build the file tree structure from all files
      this.treeData = this.buildTreeFromPaths(this.files);
      
      // Initially collapse all directories
      this.expandedDirs = {};
      this._setAllExpandedState(this.treeData, false);
      
      // Then ensure directories with added files are expanded
      if (this.addedFiles && this.addedFiles.length > 0) {
        // For each added file, expand the path to it
        this.addedFiles.forEach(filePath => {
          this._expandPathToFile(filePath);
        });
      }
    } catch (error) {
      console.error('Error loading file tree:', error);
      this.error = `Failed to load file tree: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
      
      // Restore scroll position after update completes
      this.updateComplete.then(() => {
        const fileTreeContainer = this.shadowRoot.querySelector('.file-tree-container');
        if (fileTreeContainer && scrollPosition > 0) {
          fileTreeContainer.scrollTop = scrollPosition;
        }
      });
    }
  }
  
  // Note: loadAddedFiles() is no longer needed as we're handling this in loadFileTree()
  
  parseFileList(output) {
    // Split by lines and filter empty lines
    return output.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }
  
  buildTreeFromPaths(paths) {
    // Ensure paths is always an array
    if (!Array.isArray(paths)) {
      console.error('buildTreeFromPaths received non-array:', paths);
      paths = [];
    }
    
    // Create the root node
    const root = new TreeNode('root', '', false);
    
    // Process each path and add it to the tree
    paths.forEach(path => {
      if (!path) return; // Skip empty paths
      
      const parts = path.split('/').filter(part => part); // Filter out empty parts
      
      let currentNode = root;
      let currentPath = '';
      
      // For each path segment
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;
        
        // Update the current path
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        // Check if this node already exists
        if (!currentNode.children.has(part)) {
          // Create and add the new node
          const newNode = new TreeNode(part, currentPath, isLastPart);
          currentNode.addChild(part, newNode);
        }
        
        // Move to the next node
        currentNode = currentNode.children.get(part);
      }
    });
    
    return root;
  }
  
  // handleFileClick doesn't do anything now - users must click checkbox directly to add/remove files
  async handleFileClick(path, isFile) {
    // No action when clicking file name
  }
  
  // New method specifically for checkbox clicks
  async handleCheckboxClick(event, path) {
    // Stop propagation to prevent the parent div's click handler from being called
    event.stopPropagation();
    
    try {
      const isAdded = this.addedFiles.includes(path);
      
      if (isAdded) {
        // If the file is already added, drop it
        await this.call['EditBlockCoder.drop_rel_fname'](path);
      } else {
        // If the file is not added, add it
        await this.call['EditBlockCoder.add_rel_fname'](path);
      }
      
      // No need to update state or refresh - will happen via push notifications
    } catch (error) {
      console.error(`Error ${isAdded ? 'dropping' : 'adding'} file:`, error);
    }
  }
  
  // Handle notification when a file is added to the chat context
  add_rel_fname_notification(filePath) {
    console.log(`File added notification: ${filePath}`);
    
    // Add to our addedFiles if not already there
    if (!this.addedFiles.includes(filePath)) {
      this.addedFiles = [...this.addedFiles, filePath];
      
      // Expand path to newly added file
      this._expandPathToFile(filePath);
      this.requestUpdate();
    }
  }
  
  // Handle notification when a file is dropped from the chat context
  drop_rel_fname_notification(filePath) {
    console.log(`File dropped notification: ${filePath}`);
    
    // Remove from addedFiles if present
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
  
  renderTreeNode(node, path = '') {
    if (!node) return html``; // Handle null/undefined nodes
    
    // For TreeNode objects, the path is already stored in the node
    const nodePath = node.path;
    const isAdded = node.isFile && this.addedFiles.includes(nodePath);
    const hasChildren = !node.isFile && node.children && node.children.size > 0;
    
    // Get basic node classes
    const nodeClasses = {
      'file-node': true,
      'directory': !node.isFile,
      'file': node.isFile,
      // Add any additional classes from subclasses
      ...this.getAdditionalNodeClasses(node, nodePath)
    };
    
    if (node.name === 'root') {
      // Root node - just render its children
      return html`
        <div class="tree-root">
          ${node.getSortedChildren().map(child => this.renderTreeNode(child))}
        </div>
      `;
    }
    
    if (hasChildren) {
      // Directory with children - add expand/collapse functionality
      // Use the expandedDirs object to determine if this directory should be open
      const isOpen = !!this.expandedDirs[nodePath];
      
      return html`
        <details class="directory-details" ?open=${isOpen} @toggle=${(e) => {
          this.expandedDirs[nodePath] = e.target.open;
        }}>
          <summary class=${classMap(nodeClasses)}>
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
      // File or empty directory
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
