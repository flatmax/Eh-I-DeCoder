import {html, css} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {FileTree} from './FileTree.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';

export class RepoTree extends FileTree {
  static properties = {
    ...FileTree.properties,
    gitStatus: { type: Object, state: true },
    modifiedFiles: { type: Array, state: true },
    stagedFiles: { type: Array, state: true },
    untrackedFiles: { type: Array, state: true }
  };
  
  constructor() {
    super();
    this.gitStatus = {};
    this.modifiedFiles = [];
    this.stagedFiles = [];
    this.untrackedFiles = [];
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  remoteIsUp() {
    console.log('RepoTree::remoteIsUp');
    // Add a timeout before loading to ensure connection is fully established
    setTimeout(() => {
      this.loadGitStatus();
      this.loadFileTree();
    }, 500);
  }
  
  async loadGitStatus() {
    try {
      this.loading = true;
      this.error = null;
      
      // Get Git status from the Repo class - fix the call syntax
      console.log('Calling Repo.get_status...');
      const statusResponse = await this.call['Repo.get_status']();
      console.log('Raw status response:', statusResponse);
      
      // Extract the status from the response object (which has a UUID key)
      let status = {};
      if (typeof statusResponse === 'object' && !Array.isArray(statusResponse)) {
        // Get the first key (UUID) and extract the status
        const keys = Object.keys(statusResponse);
        if (keys.length > 0) {
          status = statusResponse[keys[0]] || {};
        }
      } else {
        status = statusResponse || {};
      }
      
      this.gitStatus = status;
      
      // Extract file arrays for easier access
      this.modifiedFiles = status.modified_files || [];
      this.stagedFiles = status.staged_files || [];
      this.untrackedFiles = status.untracked_files || [];
      
      console.log('Git status loaded:', {
        branch: status.branch,
        isDirty: status.is_dirty,
        modified: this.modifiedFiles.length,
        staged: this.stagedFiles.length,
        untracked: this.untrackedFiles.length
      });
      
    } catch (error) {
      console.error('Error loading Git status:', error);
      this.error = `Failed to load Git status: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }
  
  async loadFileTree(scrollPosition = 0) {
    // Load Git status first, then file tree
    await this.loadGitStatus();
    await super.loadFileTree(scrollPosition);
  }
  
  getFileGitStatus(filePath) {
    // Determine the Git status of a file
    if (this.stagedFiles.includes(filePath)) {
      return 'staged';
    } else if (this.modifiedFiles.includes(filePath)) {
      return 'modified';
    } else if (this.untrackedFiles.includes(filePath)) {
      return 'untracked';
    }
    return 'clean';
  }
  
  async handleFileClick(path, isFile) {
    if (!isFile) return; // Only handle file clicks, not directory clicks
    
    try {
      // Check file git status for logging purposes
      const gitStatus = this.getFileGitStatus(path);
      
      // Always show in merge editor regardless of git status
      console.log(`Opening file in merge editor: ${path} (${gitStatus})`);
      
      // Find the MergeEditor component in MainWindow
      const mainWindow = document.querySelector('main-window');
      if (mainWindow && mainWindow.shadowRoot) {
        const mergeEditor = mainWindow.shadowRoot.querySelector('merge-editor');
        if (mergeEditor) {
          await mergeEditor.loadFileContent(path);
        } else {
          console.warn('MergeEditor component not found');
        }
      }
      
    } catch (error) {
      console.error('Error handling file click:', error);
      // Don't fall back to super.handleFileClick even on error
    }
  }
  
  renderTreeNode(node, path = '') {
    if (!node) return html``; // Handle null/undefined nodes
    
    const nodePath = path ? `${path}/${node.name}` : node.name;
    const hasChildren = node.children && Object.keys(node.children).length > 0;
    const gitStatus = node.isFile ? this.getFileGitStatus(nodePath) : 'clean';
    
    const nodeClasses = {
      'file-node': true,
      'directory': !node.isFile,
      'file': node.isFile,
      [`git-${gitStatus}`]: node.isFile
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
            <md-icon>${iconName}</md-icon>
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
          <md-icon>${iconName}</md-icon>
          <span>${node.name}</span>
          ${node.isFile && gitStatus !== 'clean' ? html`
            <span class="git-status-indicator">${this.getGitStatusSymbol(gitStatus)}</span>
          ` : ''}
        </div>
      `;
    }
  }
  
  getGitStatusSymbol(status) {
    switch (status) {
      case 'modified': return 'M';
      case 'staged': return 'S';
      case 'untracked': return '?';
      default: return '';
    }
  }
  
  render() {
    return html`
      <div class="file-tree-container">
        <div class="file-tree-header">
          <h3>Repository Files</h3>
          <div class="header-info">
            ${this.gitStatus.branch ? html`
              <span class="branch-info">Branch: ${this.gitStatus.branch}</span>
            ` : ''}
            ${this.gitStatus.is_dirty ? html`
              <span class="dirty-indicator">●</span>
            ` : ''}
          </div>
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
    ${FileTree.styles}
    
    .header-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #666;
    }
    
    .branch-info {
      background: #e3f2fd;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
    
    .dirty-indicator {
      color: #ff9800;
      font-weight: bold;
    }
    
    .git-status-indicator {
      margin-left: auto;
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
      padding: 1px 4px;
      border-radius: 2px;
    }
    
    .git-modified {
      color: #ff9800;
    }
    
    .git-modified .git-status-indicator {
      background: #fff3e0;
      color: #ff9800;
    }
    
    .git-staged {
      color: #4caf50;
    }
    
    .git-staged .git-status-indicator {
      background: #e8f5e8;
      color: #4caf50;
    }
    
    .git-untracked {
      color: #2196f3;
    }
    
    .git-untracked .git-status-indicator {
      background: #e3f2fd;
      color: #2196f3;
    }
    
    .git-clean {
      /* Default styling for clean files */
    }
  `;
}
