import {html, css} from 'lit';
import {FileTree} from './FileTree.js';
import {RepoTreeManagers} from './tree/RepoTreeManagers.js';
import {RepoTreeRenderer} from './tree/RepoTreeRenderer.js';
import {RepoTreeStyles} from './tree/RepoTreeStyles.js';
import {EventHelper} from './utils/EventHelper.js';
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
  
  initializeManagers() {
    super.initializeManagers();
    this.repoManagers = new RepoTreeManagers(this);
    this.repoRenderer = new RepoTreeRenderer(this);
  }
  
  cleanup() {
    super.cleanup();
  }

  handleGitActionComplete() {
    setTimeout(() => this.loadFileTree(), 300);
  }
  
  getHeaderControls() {
    return {
      showUncheckAll: true,
      showExpandAll: true,
      showCollapseAll: true,
      showRefresh: false,
      showLineCountToggle: true
    };
  }
  
  renderAdditionalHeaderContent() {
    return this.repoRenderer.renderBranchInfo();
  }
  
  renderAdditionalContent() {
    return this.repoRenderer.renderFabAndContextMenu();
  }
  
  async loadFileTree(scrollPosition = null) {
    if (scrollPosition && typeof scrollPosition === 'object' && Object.keys(scrollPosition).length === 0) {
      scrollPosition = null;
    }
    
    if (scrollPosition === null) {
      const fileTreeContainer = this.shadowRoot?.querySelector('.file-tree-container');
      scrollPosition = fileTreeContainer ? fileTreeContainer.scrollTop : 0;
    }
    
    await super.loadFileTree(scrollPosition);
  }
  
  loadGitStatus(statusData = null) {
    console.log('loadGitStatus called from Python with:', statusData);
    this.loadFileTree();
  }
  
  async performAdditionalLoading() {
    // Only fetch git status if connected
    if (this.isConnected) {
      await this.repoManagers.fetchGitStatus();
    }
  }
  
  async performPostLoadingActions() {
    this.repoManagers.expandModifiedAndUntrackedFilePaths();
  }

  async handleFileClick(path, isFile) {
    if (!isFile) return;
    
    try {
      const gitStatus = this.repoManagers.gitStatusManager.getFileGitStatus(path);
      console.log(`Opening file in merge editor: ${path} (${gitStatus})`);
      
      this.repoManagers.gitActions.openFileInEditor(path);
      
    } catch (error) {
      console.error('Error handling file click:', error);
    }
  }
  
  getAdditionalNodeClasses(node, nodePath) {
    const classes = super.getAdditionalNodeClasses(node, nodePath);
    
    if (node.isFile) {
      const gitStatus = this.repoManagers.gitStatusManager.getFileGitStatus(nodePath);
      if (gitStatus !== 'clean') {
        classes[`git-${gitStatus}`] = true;
      }
    }
    
    return classes;
  }
  
  renderAdditionalIndicators(node, nodePath) {
    return this.repoRenderer.renderGitStatusIndicator(node, nodePath);
  }
  
  handleContextMenu(event, path, isFile) {
    // Check for Ctrl+right-click to copy filename to prompt
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      
      // Emit word-clicked event with the filename using EventHelper
      EventHelper.dispatchWindowEvent('word-clicked', { word: path });
      
      return;
    }
    
    // Regular context menu for git actions
    this.repoManagers.contextMenu.show(event, path, isFile);
  }

  renderContextMenu() {
    return this.repoRenderer.renderContextMenu();
  }
  
  getNodePath(nodeElement) {
    // For RepoTree, we can use a more specific approach since we know the structure
    // Look for the closest file node and extract the path from the tree structure
    
    let current = nodeElement;
    while (current && !current.classList.contains('file-node')) {
      current = current.closest('.file-node');
      if (!current) break;
    }
    
    if (!current) return super.getNodePath(nodeElement);
    
    // Try to find the path by looking at the tree structure
    // We'll traverse up the DOM to build the path
    const pathParts = [];
    let element = current;
    
    while (element && element !== this.shadowRoot) {
      if (element.classList.contains('file-node')) {
        // Extract the name from the node
        const nameElement = element.querySelector('.file-name, .directory-name');
        if (nameElement) {
          const name = nameElement.textContent.trim();
          if (name && !pathParts.includes(name)) {
            pathParts.unshift(name);
          }
        } else {
          // Fallback: extract from the entire text content
          const textContent = element.textContent || '';
          const lines = textContent.split('\n');
          const firstLine = lines[0].trim();
          
          // Remove git status indicators and other extra content
          const cleanName = firstLine.replace(/^[MAS?]\s*/, '').replace(/\s+\d+$/, '').trim();
          if (cleanName && !pathParts.includes(cleanName)) {
            pathParts.unshift(cleanName);
          }
        }
      }
      
      // Move up to the parent container
      element = element.parentElement;
      
      // Skip over details elements and other containers
      while (element && !element.classList.contains('file-node') && element !== this.shadowRoot) {
        element = element.parentElement;
      }
    }
    
    return pathParts.join('/');
  }
  
  scrollToCurrentFile() {
    if (!this.currentFile) return;
    
    // First expand the path to the current file
    this.treeExpansion.expandPathToFile(this.currentFile);
    this.requestUpdate();
    
    // Wait for the expansion to complete, then scroll
    this.updateComplete.then(() => {
      // Find the file node element by looking for the current file path
      const fileNodes = this.shadowRoot.querySelectorAll('.file-node.file');
      let targetNode = null;
      
      for (const node of fileNodes) {
        // Check if this node has the current-file class (which should be applied by now)
        if (node.classList.contains('current-file')) {
          targetNode = node;
          break;
        }
        
        // Fallback: check the text content
        const textContent = node.textContent || '';
        const fileName = this.currentFile.split('/').pop();
        
        if (textContent.includes(fileName)) {
          // Verify this is actually our file by checking the full path
          const fullPath = this.getNodePath(node);
          if (fullPath === this.currentFile) {
            targetNode = node;
            break;
          }
        }
      }
      
      if (targetNode) {
        // Scroll the target node into view
        targetNode.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
        
        // Add a temporary highlight effect
        targetNode.style.transition = 'box-shadow 0.3s ease';
        targetNode.style.boxShadow = '0 0 10px rgba(25, 118, 210, 0.5)';
        
        setTimeout(() => {
          targetNode.style.boxShadow = '';
          setTimeout(() => {
            targetNode.style.transition = '';
          }, 300);
        }, 1000);
      }
    });
  }
  
  static styles = css`
    ${FileTree.styles}
    ${RepoTreeStyles.styles}
  `;
}
