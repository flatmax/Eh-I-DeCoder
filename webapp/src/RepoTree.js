import {html, css} from 'lit';
import {FileTree} from './FileTree.js';
import {ContextMenu} from './tree/ContextMenu.js';
import {GitStatusManager} from './tree/GitStatusManager.js';
import {GitActions} from './tree/GitActions.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/fab/fab.js';

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
    this.gitStatusManager = new GitStatusManager();
    this.contextMenu = new ContextMenu(this);
    this.gitActions = new GitActions(this, this.contextMenu, () => this.handleGitActionComplete());
    this.addedFiles = [];
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  setupDone() {
    console.log('RepoTree::setupDone');
    this.loadFileTree();
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
  }

  handleGitActionComplete() {
    // Refresh the file tree to show updated status
    setTimeout(() => this.loadFileTree(), 300);
  }
  
  async loadFileTree(scrollPosition = null) {
    // Handle empty object parameter (from git change notifications)
    if (scrollPosition && typeof scrollPosition === 'object' && Object.keys(scrollPosition).length === 0) {
      scrollPosition = null;
    }
    
    // Save current scroll position if not provided
    if (scrollPosition === null) {
      const fileTreeContainer = this.shadowRoot?.querySelector('.file-tree-container');
      scrollPosition = fileTreeContainer ? fileTreeContainer.scrollTop : 0;
    }
    
    // Get Git status first
    await this.fetchGitStatus();
    
    // Then load the file tree with preserved scroll position
    await super.loadFileTree(scrollPosition);
    
    // Expand directories with git-modified files
    this.expandModifiedFilePaths();
  }

  async fetchGitStatus() {
    try {
      console.log('Calling Repo.get_status...');
      const statusResponse = await this.call['Repo.get_status']();
      console.log('Raw status response:', statusResponse);
      
      this.gitStatusManager.loadGitStatus(statusResponse);
      
      // Update component properties for reactivity
      this.gitStatus = this.gitStatusManager.gitStatus;
      this.modifiedFiles = this.gitStatusManager.modifiedFiles;
      this.stagedFiles = this.gitStatusManager.stagedFiles;
      this.untrackedFiles = this.gitStatusManager.untrackedFiles;
      
    } catch (error) {
      console.error('Error fetching git status:', error);
      this.error = `Failed to load Git status: ${error.message}`;
    }
  }

  expandModifiedFilePaths() {
    const modifiedPaths = this.gitStatusManager.getModifiedFilePaths();
    if (modifiedPaths.length > 0) {
      modifiedPaths.forEach(filePath => {
        this.treeExpansion.expandPathToFile(filePath);
      });
      this.requestUpdate();
    }
  }
  
  // Handle file click to open the file in merge editor
  async handleFileClick(path, isFile) {
    if (!isFile) return;
    
    try {
      const gitStatus = this.gitStatusManager.getFileGitStatus(path);
      console.log(`Opening file in merge editor: ${path} (${gitStatus})`);
      
      this.gitActions.openFileInEditor(path);
      
    } catch (error) {
      console.error('Error handling file click:', error);
    }
  }
  
  // Override to add git status classes
  getAdditionalNodeClasses(node, nodePath) {
    if (node.isFile) {
      const gitStatus = this.gitStatusManager.getFileGitStatus(nodePath);
      return {
        [`git-${gitStatus}`]: gitStatus !== 'clean'
      };
    }
    return {};
  }
  
  // Override to add git status indicator
  renderAdditionalIndicators(node, nodePath) {
    if (node.isFile) {
      const gitStatus = this.gitStatusManager.getFileGitStatus(nodePath);
      if (gitStatus !== 'clean') {
        return html`
          <span class="git-status-indicator">${this.gitStatusManager.getGitStatusSymbol(gitStatus)}</span>
        `;
      }
    }
    return html``;
  }
  
  // Handle context menu
  handleContextMenu(event, path, isFile) {
    this.contextMenu.show(event, path, isFile);
  }

  renderContextMenu() {
    if (!this.contextMenu.visible) return html``;

    const path = this.contextMenu.path;
    const isFile = this.contextMenu.isFile;

    return html`
      <div class="context-menu">
        ${isFile ? html`
          <!-- File context menu options -->
          ${path && this.gitStatusManager.getFileGitStatus(path) === 'staged' ? 
            this.contextMenu.renderMenuItem('remove_circle', 'Unstage File', () => this.gitActions.handleUnstageFile()) :
            this.contextMenu.renderMenuItem('add_circle', 'Stage File', () => this.gitActions.handleStageFile())
          }
          
          ${path && this.gitStatusManager.getFileGitStatus(path) === 'modified' ?
            this.contextMenu.renderMenuItem('restore', 'Discard Changes', () => this.gitActions.handleDiscardChanges()) : ''
          }
        ` : html`
          <!-- Directory context menu options -->
          ${this.contextMenu.renderMenuItem('add', 'Create File', () => this.gitActions.handleCreateFile())}
        `}
      </div>
    `;
  }

  render() {
    const branchInfo = this.gitStatusManager.getBranchInfo();
    
    return html`
      <div class="file-tree-container">
        ${branchInfo.branch ? html`
          <div class="branch-row">
            <span class="branch-info">Branch: ${branchInfo.branch}</span>
            ${branchInfo.isDirty ? html`<span class="dirty-indicator">●</span>` : ''}
          </div>
        ` : ''}
        <div class="file-tree-header">
          <div class="tree-controls">
            <md-icon-button title="Expand All" @click=${() => this.expandAll()}>
              <md-icon class="material-symbols-outlined">unfold_more</md-icon>
            </md-icon-button>
            <md-icon-button title="Collapse All" @click=${() => this.collapseAll()}>
              <md-icon class="material-symbols-outlined">unfold_less</md-icon>
            </md-icon-button>
          </div>
        </div>
        
        ${this.loading ? 
          html`<div class="loading">Loading files...</div>` : 
          this.error ? 
            html`<div class="error">${this.error}</div>` :
            html`<div class="file-tree">${this.renderTreeNode(this.treeData)}</div>`
        }
        
        <md-fab class="refresh-fab small-fab" title="Refresh" aria-label="Refresh file tree" @click=${() => this.loadFileTree()}>
          <md-icon slot="icon">refresh</md-icon>
        </md-fab>
      </div>
      
      ${this.renderContextMenu()}
    `;
  }
  
  static styles = css`
    ${FileTree.styles}
    
    .file-tree-container {
      position: relative;
      min-height: 200px;
    }
    
    /* Context Menu Styles */
    .context-menu {
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 4px;
      padding: 4px 0;
      z-index: 1000;
      min-width: 180px;
    }
    
    .context-menu-item {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .context-menu-item:hover {
      background-color: #f5f5f5;
    }
    
    .context-menu-icon {
      margin-right: 8px;
      display: flex;
      align-items: center;
    }
    
    .context-menu-icon md-icon {
      font-size: 18px;
      --md-icon-size: 18px;
    }
    
    .context-menu-text {
      font-size: 14px;
    }
    
    .refresh-fab {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 100;
    }
    
    .small-fab {
      --md-fab-container-width: 36px;
      --md-fab-container-height: 36px;
      --md-fab-icon-size: 22px;
      transform: scale(0.75);
    }
    
    .branch-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #666;
      padding: 4px 8px;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
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
