import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';

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
    this.treeData = {};
    this.expandedDirs = {}; // Track which directories are expanded
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  remoteIsUp() {
    console.log('FileTree::remoteIsUp');
    // Add a timeout before loading file tree to ensure connection is fully established
    setTimeout(() => {
      this.loadFileTree();
    }, 500);
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
  _setAllExpandedState(node, expanded, path = '') {
    if (!node) return;
    
    const nodePath = path ? `${path}/${node.name}` : node.name;
    
    if (!node.isFile && node.children && Object.keys(node.children).length > 0) {
      // Set expanded state for this directory
      this.expandedDirs[nodePath] = expanded;
      
      // Process all children recursively
      Object.values(node.children).forEach(child => {
        this._setAllExpandedState(child, expanded, nodePath);
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
      
      // Extract the array from the response object (which has a UUID key)
      let all_files = [];
      if (typeof allFilesResponse === 'object' && !Array.isArray(allFilesResponse)) {
        // Get the first key (UUID) and extract the array
        const keys = Object.keys(allFilesResponse);
        if (keys.length > 0) {
          all_files = allFilesResponse[keys[0]] || [];
        }
      } else if (Array.isArray(allFilesResponse)) {
        all_files = allFilesResponse;
      }
      
      // Get files that are already added to the chat context
      const addedFilesResponse = await this.call['EditBlockCoder.get_inchat_relative_files']();
      
      // Handle the same structure for added files
      let added_files = [];
      if (typeof addedFilesResponse === 'object' && !Array.isArray(addedFilesResponse)) {
        const keys = Object.keys(addedFilesResponse);
        if (keys.length > 0) {
          added_files = addedFilesResponse[keys[0]] || [];
        }
      } else if (Array.isArray(addedFilesResponse)) {
        added_files = addedFilesResponse;
      }
      
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
    
    const root = { name: 'root', children: {}, isFile: false };
    
    paths.forEach(path => {
      if (!path) return; // Skip empty paths
      
      const parts = path.split('/');
      let current = root;
      
      parts.forEach((part, i) => {
        if (!part) return; // Skip empty parts
        
        if (!current.children) {
          current.children = {};
        }
        
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: parts.slice(0, i + 1).join('/'),
            children: {},
            isFile: i === parts.length - 1
          };
        }
        current = current.children[part];
      });
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
    
    const nodePath = path ? `${path}/${node.name}` : node.name;
    const isAdded = node.isFile && this.addedFiles.includes(nodePath);
    const hasChildren = node.children && Object.keys(node.children).length > 0;
    
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
          ${node.children ? Object.values(node.children)
            .sort((a, b) => {
              // Sort directories first, then by name
              if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
              return a.name.localeCompare(b.name);
            })
            .map(child => this.renderTreeNode(child)) : ''}
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
            <span>${node.name}</span>
          </summary>
          <div class="children-container">
            ${node.children ? Object.values(node.children)
              .sort((a, b) => {
                // Sort directories first, then by name
                if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
                return a.name.localeCompare(b.name);
              })
              .map(child => this.renderTreeNode(child, nodePath)) : ''}
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
