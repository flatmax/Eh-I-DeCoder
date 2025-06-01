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
    serverURI: { type: String }
  };
  
  constructor() {
    super();
    this.files = [];
    this.addedFiles = [];
    this.loading = false;
    this.error = null;
    this.treeData = {};
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
  
  async handleFileClick(path, isFile) {
    if (!isFile) return; // Only handle file clicks, not directory clicks
    
    try {
      // Save current scroll position
      const fileTreeContainer = this.shadowRoot.querySelector('.file-tree-container');
      const scrollTop = fileTreeContainer ? fileTreeContainer.scrollTop : 0;
      
      const isAdded = this.addedFiles.includes(path);
      
      if (isAdded) {
        // If the file is already added, drop it
        await this.call['EditBlockCoder.drop_rel_fname'](path);
        
        // Remove from addedFiles
        this.addedFiles = this.addedFiles.filter(f => f !== path);
      } else {
        // If the file is not added, add it
        await this.call['EditBlockCoder.add_rel_fname'](path);
        
        // Add to addedFiles
        this.addedFiles = [...this.addedFiles, path];
      }
      
      // Refresh the tree to ensure consistency, but preserve scroll position
      setTimeout(() => this.loadFileTree(scrollTop), 300);
      
      this.requestUpdate();
    } catch (error) {
      console.error(`Error ${isAdded ? 'dropping' : 'adding'} file:`, error);
    }
  }
  
  renderTreeNode(node, path = '') {
    if (!node) return html``; // Handle null/undefined nodes
    
    const nodePath = path ? `${path}/${node.name}` : node.name;
    const isAdded = node.isFile && this.addedFiles.includes(nodePath);
    const hasChildren = node.children && Object.keys(node.children).length > 0;
    
    const nodeClasses = {
      'file-node': true,
      'directory': !node.isFile,
      'file': node.isFile
    };
    
    const iconName = node.isFile ? 'description' : 'folder';
    
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
      return html`
        <details class="directory-details" open>
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
        <div class=${classMap(nodeClasses)} @click=${() => this.handleFileClick(nodePath, node.isFile)}>
          ${node.isFile ? html`<input type="checkbox" ?checked=${isAdded} class="file-checkbox" readonly>` : ''}
          <span>${node.name}</span>
        </div>
      `;
    }
  }
  
  render() {
    return html`
      <div class="file-tree-container">
        <div class="file-tree-header">
          <h3>Repository Files</h3>
          <md-icon-button @click=${() => this.loadFileTree()}>
            <md-icon class="material-symbols-outlined">refresh</md-icon>
          </md-icon-button>
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
      justify-content: space-between;
      padding: 0 16px;
      border-bottom: 1px solid #ccc;
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
      pointer-events: none; /* Make checkbox non-interactive, as clicks will be handled by the parent */
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
