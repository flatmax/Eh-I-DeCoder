import {html, css} from 'lit';
import {FileTree} from './FileTree.js';
import {RepoTreeManagers} from './tree/RepoTreeManagers.js';
import {RepoTreeRenderer} from './tree/RepoTreeRenderer.js';
import {RepoTreeStyles} from './tree/RepoTreeStyles.js';
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
      showRefresh: false
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
    await this.repoManagers.fetchGitStatus();
  }
  
  async performPostLoadingActions() {
    this.repoManagers.expandModifiedFilePaths();
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
    if (node.isFile) {
      const gitStatus = this.repoManagers.gitStatusManager.getFileGitStatus(nodePath);
      return {
        [`git-${gitStatus}`]: gitStatus !== 'clean'
      };
    }
    return {};
  }
  
  renderAdditionalIndicators(node, nodePath) {
    return this.repoRenderer.renderGitStatusIndicator(node, nodePath);
  }
  
  handleContextMenu(event, path, isFile) {
    this.repoManagers.contextMenu.show(event, path, isFile);
  }

  renderContextMenu() {
    return this.repoRenderer.renderContextMenu();
  }
  
  static styles = css`
    ${FileTree.styles}
    ${RepoTreeStyles.styles}
  `;
}
