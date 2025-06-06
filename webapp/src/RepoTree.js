import {html, css} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import {FileTree} from './FileTree.js';
import {extractResponseData} from './Utils.js';
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
    this.gitStatus = {};
    this.modifiedFiles = [];
    this.stagedFiles = [];
    this.untrackedFiles = [];
    this.addedFiles = [];
    this.contextMenuPath = null;
    this.contextMenuVisible = false;
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    // No need to register callbacks, Repo will directly call loadGitStatus
  }
  
  setupDone() {
    console.log('RepoTree::setupDone');
    // Load the file tree
    this.loadFileTree();
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
  }
  
  loadGitStatus(statusResponse) {
    try {
      // Don't set loading state here to avoid UI updates that affect scroll
      this.error = null;
      
      console.log('Processing git status data');
      console.log('Raw status response:', statusResponse);
      
      // Extract the status data properly
      let status = {};
      
      // Handle the JSONRPC response format where data may be wrapped
      if (statusResponse && typeof statusResponse === 'object') {
        // Check if this is a direct response with known properties
        if ('branch' in statusResponse || 'is_dirty' in statusResponse) {
          status = statusResponse;
        }
        // Check if this is a wrapped response with a UUID key
        else {
          // This uses the same approach as extractResponseData
          const keys = Object.keys(statusResponse);
          for (const key of keys) {
            if (statusResponse[key] && typeof statusResponse[key] === 'object') {
              status = statusResponse[key];
              break;
            }
          }
        }
      }
      
      console.log('Processed status:', status);
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
        untracked: this.untrackedFiles.length,
        raw: status  // Log the full raw status object for debugging
      });
      
    } catch (error) {
      console.error('Error loading Git status:', error);
      this.error = `Failed to load Git status: ${error.message}`;
    }
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
    try {
      console.log('Calling Repo.get_status...');
      const statusResponse = await this.call['Repo.get_status']();
      console.log('Raw status response:', statusResponse);
      this.loadGitStatus(statusResponse);
    } catch (error) {
      console.error('Error fetching git status:', error);
      this.error = `Failed to load Git status: ${error.message}`;
    }
    
    // Then load the file tree with preserved scroll position
    await super.loadFileTree(scrollPosition);
    
    // After the parent has loaded the file tree and expanded directories with checked files,
    // also expand directories that contain git-modified files
    if (this.modifiedFiles.length > 0 || this.stagedFiles.length > 0) {
      // Expand directories with modified files
      this.modifiedFiles.forEach(filePath => {
        this._expandPathToFile(filePath);
      });
      
      // Expand directories with staged files
      this.stagedFiles.forEach(filePath => {
        this._expandPathToFile(filePath);
      });
      
      // Request an update to reflect the expanded state
      this.requestUpdate();
    }
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
  
  // Handle file click to open the file in merge editor
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
  
  // Use handleCheckboxClick from parent FileTree class
  
  // Override to add git status classes
  getAdditionalNodeClasses(node, nodePath) {
    if (node.isFile) {
      const gitStatus = this.getFileGitStatus(nodePath);
      return {
        [`git-${gitStatus}`]: gitStatus !== 'clean'
      };
    }
    return {};
  }
  
  // Override to add git status indicator
  renderAdditionalIndicators(node, nodePath) {
    if (node.isFile) {
      const gitStatus = this.getFileGitStatus(nodePath);
      if (gitStatus !== 'clean') {
        return html`
          <span class="git-status-indicator">${this.getGitStatusSymbol(gitStatus)}</span>
        `;
      }
    }
    return html``;
  }
  
  getGitStatusSymbol(status) {
    switch (status) {
      case 'modified': return 'M';
      case 'staged': return 'S';
      case 'untracked': return '?';
      default: return '';
    }
  }
  
  // Handle stage file action from context menu
  async handleStageFile() {
    const path = this.contextMenuPath;
    if (!path) return;
    
    // Hide the context menu
    this.contextMenuVisible = false;
    
    try {
      // Show loading indicator or toast message here if needed
      console.log(`Staging file: ${path}`);
      
      // Call Repo.stage_file API
      const response = await this.call['Repo.stage_file'](path);
      console.log('Stage response:', response);
      
      // Refresh the file tree to show updated status
      setTimeout(() => this.loadFileTree(), 300);
    } catch (error) {
      console.error('Error staging file:', error);
      alert(`Failed to stage file: ${error.message}`);
    }
  }
  
  // Handle unstage file action from context menu
  async handleUnstageFile() {
    const path = this.contextMenuPath;
    if (!path) return;
    
    // Hide the context menu
    this.contextMenuVisible = false;
    
    try {
      // Show loading indicator or toast message here if needed
      console.log(`Unstaging file: ${path}`);
      
      // Call Repo.unstage_file API
      const response = await this.call['Repo.unstage_file'](path);
      console.log('Unstage response:', response);
      
      // Refresh the file tree to show updated status
      setTimeout(() => this.loadFileTree(), 300);
    } catch (error) {
      console.error('Error unstaging file:', error);
      alert(`Failed to unstage file: ${error.message}`);
    }
  }
  
  // Handle discard changes action from context menu
  async handleDiscardChanges() {
    const path = this.contextMenuPath;
    if (!path) return;
    
    // Hide the context menu
    this.contextMenuVisible = false;
    
    try {
      console.log(`Discarding changes to file: ${path}`);
      
      // Call Repo.discard_changes API
      const response = await this.call['Repo.discard_changes'](path);
      console.log('Discard response:', response);
      
      // Refresh the file tree to show updated status
      setTimeout(() => this.loadFileTree(), 300);
    } catch (error) {
      console.error('Error discarding changes:', error);
      alert(`Failed to discard changes: ${error.message}`);
    }
  }
  
  // Handle file context menu
  handleContextMenu(event, path, isFile) {
    // Only show context menu for files, not directories
    if (!isFile) return;

    // Prevent default browser context menu
    event.preventDefault();
    
    // Set the path for the selected file
    this.contextMenuPath = path;
    this.contextMenuVisible = true;
    
    // Position context menu immediately to avoid flickering
    const x = event.clientX;
    const y = event.clientY;
    
    // Force immediate update and then position the menu
    this.requestUpdate().then(() => {
      this.updateComplete.then(() => {
        const contextMenu = this.shadowRoot.querySelector('.context-menu');
        if (contextMenu) {
          // Position context menu at mouse position
          contextMenu.style.left = `${x}px`;
          contextMenu.style.top = `${y}px`;
          
          // Add event listener for clicks outside the menu
          requestAnimationFrame(() => {
            const closeMenu = (e) => {
              // Check if click is outside the context menu
              if (!contextMenu.contains(e.target)) {
                this.contextMenuVisible = false;
                this.requestUpdate();
                document.removeEventListener('click', closeMenu);
              }
            };
            
            document.addEventListener('click', closeMenu);
          });
        }
      });
    });
  }
  

  render() {
    return html`
      <div class="file-tree-container">
        ${this.gitStatus.branch ? html`
          <div class="branch-row">
            <span class="branch-info">Branch: ${this.gitStatus.branch}</span>
            ${this.gitStatus.is_dirty ? html`<span class="dirty-indicator">●</span>` : ''}
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
      
      ${this.contextMenuVisible ? html`
        <div class="context-menu">
          ${this.contextMenuPath && this.getFileGitStatus(this.contextMenuPath) === 'staged' ? html`
            <div class="context-menu-item" @click=${this.handleUnstageFile}>
              <span class="context-menu-icon">
                <md-icon class="material-symbols-outlined">remove_circle</md-icon>
              </span>
              <span class="context-menu-text">Unstage File</span>
            </div>
          ` : html`
            <div class="context-menu-item" @click=${this.handleStageFile}>
              <span class="context-menu-icon">
                <md-icon class="material-symbols-outlined">add_circle</md-icon>
              </span>
              <span class="context-menu-text">Stage File</span>
            </div>
          `}
          
          ${this.contextMenuPath && this.getFileGitStatus(this.contextMenuPath) === 'modified' ? html`
            <div class="context-menu-item" @click=${this.handleDiscardChanges}>
              <span class="context-menu-icon">
                <md-icon class="material-symbols-outlined">restore</md-icon>
              </span>
              <span class="context-menu-text">Discard Changes</span>
            </div>
          ` : ''}
        </div>
      ` : ''}
    `;
  }
  
  static styles = css`
    ${FileTree.styles}
    
    .file-tree-container {
      position: relative;
      min-height: 200px; /* Ensure container has enough height */
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
