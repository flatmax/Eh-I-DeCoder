import {JRPCClient} from '@flatmax/jrpc-oo';
import {html} from 'lit';
import {TreeNode} from './tree/TreeNode.js';
import {TreeExpansion} from './tree/TreeExpansion.js';
import {FileTreeManager} from './tree/FileTreeManager.js';
import {FileTreeRenderer} from './tree/FileTreeRenderer.js';
import {fileTreeStyles} from './tree/FileTreeStyles.js';

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
    this.initializeProperties();
    this.initializeManagers();
  }
  
  initializeProperties() {
    this.files = [];
    this.addedFiles = [];
    this.loading = false;
    this.error = null;
    this.treeData = new TreeNode('root', '', false);
    this.treeExpansion = new TreeExpansion();
  }
  
  initializeManagers() {
    this.fileTreeManager = new FileTreeManager(this);
    this.renderer = new FileTreeRenderer(this);
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }
  
  cleanup() {
    // Base class has no cleanup
  }
  
  setupDone() {
    console.log(`${this.constructor.name}::setupDone`);
    this.loadFileTree();
  }
  
  expandAll() {
    this.treeExpansion.reset();
    this.treeExpansion.setAllExpandedState(this.treeData, true);
    this.requestUpdate();
    
    this.updateComplete.then(() => {
      const details = this.shadowRoot.querySelectorAll('details.directory-details');
      details.forEach(detail => {
        detail.open = true;
      });
    });
  }
  
  collapseAll() {
    this.treeExpansion.reset();
    this.treeExpansion.setAllExpandedState(this.treeData, false);
    this.requestUpdate();
    
    this.updateComplete.then(() => {
      const details = this.shadowRoot.querySelectorAll('details.directory-details');
      details.forEach(detail => {
        detail.open = false;
      });
    });
  }
  
  async uncheckAll() {
    try {
      await this.fileTreeManager.removeAllFiles(this.addedFiles);
    } catch (error) {
      console.error('Error unchecking all files:', error);
    }
  }
  
  async loadFileTree(scrollPosition = 0) {
    try {
      this.loading = true;
      this.error = null;
      
      await this.performAdditionalLoading();
      
      const fileData = await this.fileTreeManager.loadFileData();
      this.addedFiles = fileData.addedFiles;
      this.files = fileData.allFiles;
      this.treeData = fileData.treeData;
      
      this.setupInitialExpansion();
      await this.performPostLoadingActions();
      
    } catch (error) {
      console.error('Error loading file tree:', error);
      this.error = `Failed to load file tree: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
      this.restoreScrollPosition(scrollPosition);
    }
  }
  
  async performAdditionalLoading() {
    // Base class does nothing
  }
  
  async performPostLoadingActions() {
    // Base class does nothing
  }

  setupInitialExpansion() {
    this.treeExpansion.reset();
    this.treeExpansion.setAllExpandedState(this.treeData, false);
    
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
  
  async handleFileClick(path, isFile) {
    // No action when clicking file name - can be overridden by subclasses
  }
  
  async handleCheckboxClick(event, path) {
    event.stopPropagation();
    
    try {
      const isAdded = this.addedFiles.includes(path);
      
      if (isAdded) {
        await this.fileTreeManager.removeFile(path);
      } else {
        await this.fileTreeManager.addFile(path);
      }
    } catch (error) {
      console.error(`Error ${isAdded ? 'dropping' : 'adding'} file:`, error);
    }
  }
  
  add_rel_fname_notification(filePath) {
    console.log(`File added notification: ${filePath}`);
    
    if (!this.addedFiles.includes(filePath)) {
      this.addedFiles = [...this.addedFiles, filePath];
      this.treeExpansion.expandPathToFile(filePath);
      this.requestUpdate();
    }
  }
  
  drop_rel_fname_notification(filePath) {
    console.log(`File dropped notification: ${filePath}`);
    
    if (this.addedFiles.includes(filePath)) {
      this.addedFiles = this.addedFiles.filter(f => f !== filePath);
      this.requestUpdate();
    }
  }
  
  getAdditionalNodeClasses(node, nodePath) {
    return {};
  }
  
  renderAdditionalIndicators(node, nodePath) {
    return html``;
  }
  
  handleContextMenu(event, path, isFile) {
    // Base class does nothing - subclasses can override
  }
  
  getHeaderControls() {
    return {
      showUncheckAll: true,
      showExpandAll: true,
      showCollapseAll: true,
      showRefresh: true
    };
  }
  
  renderAdditionalHeaderContent() {
    return html``;
  }
  
  renderAdditionalContent() {
    return html``;
  }
  
  render() {
    return this.renderer.render();
  }
  
  static styles = fileTreeStyles;
}
