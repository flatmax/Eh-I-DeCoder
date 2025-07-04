import {JRPCClient} from '@flatmax/jrpc-oo';
import {html} from 'lit';
import {TreeNode} from './tree/TreeNode.js';
import {TreeExpansion} from './tree/TreeExpansion.js';
import {FileTreeManager} from './tree/FileTreeManager.js';
import {FileTreeRenderer} from './tree/FileTreeRenderer.js';
import {fileTreeStyles} from './tree/FileTreeStyles.js';
import {extractResponseData} from './Utils.js';
import {KeyboardShortcutsMixin} from './mixins/KeyboardShortcutsMixin.js';
import {EventHelper} from './utils/EventHelper.js';

export class FileTree extends KeyboardShortcutsMixin(JRPCClient) {
  static properties = {
    files: { type: Array, state: true },
    addedFiles: { type: Array, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true },
    treeData: { type: Object, state: true },
    serverURI: { type: String },
    showLineCounts: { type: Boolean, state: true },
    lineCounts: { type: Object, state: true },
    currentFile: { type: String, state: true },
    fuzzySearchVisible: { type: Boolean, state: true },
    isConnected: { type: Boolean, state: true }
  };
  
  constructor() {
    super();
    this.initializeProperties();
    this.initializeManagers();
    this._updateScheduled = false;
    this._pendingUpdates = new Set();
    this.isConnected = false;
  }
  
  initializeProperties() {
    this.files = [];
    this.addedFiles = [];
    this.loading = false;
    this.error = null;
    this.treeData = new TreeNode('root', '', false);
    this.treeExpansion = new TreeExpansion();
    this.showLineCounts = false;
    this.lineCounts = {};
    this.currentFile = null;
    this.fuzzySearchVisible = false;
  }
  
  initializeManagers() {
    this.fileTreeManager = new FileTreeManager(this);
    this.renderer = new FileTreeRenderer(this);
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    // Listen for file loaded events from the merge editor
    document.addEventListener('file-loaded-in-editor', this.handleFileLoadedInEditor.bind(this));
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
    
    // Remove event listener
    document.removeEventListener('file-loaded-in-editor', this.handleFileLoadedInEditor.bind(this));
  }
  
  cleanup() {
    // Base class has no cleanup
  }
  
  /**
   * Called when JRPC connection is established and ready
   */
  setupDone() {
    console.log(`${this.constructor.name}::setupDone - Connection ready`);
    this.isConnected = true;
    this.loadFileTree();
  }
  
  /**
   * Called when remote is up but not yet ready
   */
  remoteIsUp() {
    console.log(`${this.constructor.name}::remoteIsUp - Remote connected`);
    // Don't load data yet - wait for setupDone
  }
  
  /**
   * Called when remote disconnects
   */
  remoteDisconnected() {
    console.log(`${this.constructor.name}::remoteDisconnected`);
    this.isConnected = false;
    this.error = 'Connection lost. Waiting for reconnection...';
    this._scheduleBatchUpdate();
  }
  
  /**
   * Batch update mechanism to prevent excessive re-renders
   */
  _scheduleBatchUpdate(updateType = 'general') {
    this._pendingUpdates.add(updateType);
    
    if (this._updateScheduled) return;
    
    this._updateScheduled = true;
    
    // Use requestAnimationFrame for batching
    requestAnimationFrame(() => {
      this._updateScheduled = false;
      const updates = new Set(this._pendingUpdates);
      this._pendingUpdates.clear();
      
      // Only request update once for all pending updates
      this.requestUpdate();
      
      // Handle specific update types if needed
      if (updates.has('scroll')) {
        this.updateComplete.then(() => {
          this.scrollToCurrentFile();
        });
      }
    });
  }
  
  handleFileLoadedInEditor(event) {
    const filePath = event.detail.filePath;
    if (filePath !== this.currentFile) {
      this.currentFile = filePath;
      this._scheduleBatchUpdate('scroll');
    }
  }
  
  openFuzzySearch() {
    console.log('Opening fuzzy search with files:', this.files.length);
    this.fuzzySearchVisible = true;
    this.requestUpdate();
  }
  
  closeFuzzySearch() {
    this.fuzzySearchVisible = false;
    this.requestUpdate();
  }
  
  handleFuzzySearchFileSelected(event) {
    console.log('Fuzzy search file selected:', event.detail.filePath);
    const filePath = event.detail.filePath;
    this.closeFuzzySearch();
    this.handleFileClick(filePath, true);
  }
  
  scrollToCurrentFile() {
    if (!this.currentFile) return;
    
    // First expand the path to the current file
    this.treeExpansion.expandPathToFile(this.currentFile);
    this.requestUpdate();
    
    // Wait for the expansion to complete, then scroll
    this.updateComplete.then(() => {
      // Find the file node element
      const fileNodes = this.shadowRoot.querySelectorAll('.file-node');
      let targetNode = null;
      
      for (const node of fileNodes) {
        const nodeText = node.textContent || '';
        const fileName = this.currentFile.split('/').pop();
        
        // Check if this node represents our current file
        if (nodeText.includes(fileName)) {
          // Get the data-path attribute or check the full path
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
      }
    });
  }
  
  getNodePath(nodeElement) {
    // Try to find the path from the node's context
    // This is a helper method that subclasses might need to override
    // based on how they structure their DOM
    
    // Look for a data attribute or traverse up to find the path
    let current = nodeElement;
    while (current && current !== this.shadowRoot) {
      if (current.dataset && current.dataset.path) {
        return current.dataset.path;
      }
      current = current.parentElement;
    }
    
    // Fallback: try to reconstruct path from the DOM structure
    return this.reconstructPathFromDOM(nodeElement);
  }
  
  reconstructPathFromDOM(nodeElement) {
    // This method attempts to reconstruct the file path by walking up the DOM tree
    // and collecting directory names. Subclasses should override this if needed.
    const pathParts = [];
    let current = nodeElement;
    
    while (current && current !== this.shadowRoot) {
      if (current.classList.contains('file-node')) {
        const textContent = current.textContent || '';
        // Extract just the filename/dirname, removing extra content like line counts
        const cleanText = textContent.split('\n')[0].trim();
        if (cleanText && !pathParts.includes(cleanText)) {
          pathParts.unshift(cleanText);
        }
      }
      current = current.parentElement;
    }
    
    return pathParts.join('/');
  }
  
  async toggleLineCounts() {
    if (!this.isConnected) {
      console.warn('Cannot toggle line counts - not connected');
      return;
    }
    
    this.showLineCounts = !this.showLineCounts;
    
    if (this.showLineCounts && Object.keys(this.lineCounts).length === 0) {
      // Load line counts for all files
      await this.loadLineCounts();
    }
    
    this._scheduleBatchUpdate();
  }
  
  async loadLineCounts() {
    if (!this.isConnected || !this.call) {
      console.warn('Cannot load line counts - not connected');
      return;
    }
    
    try {
      console.log('Loading line counts for files...');
      const response = await this.call['Repo.get_file_line_counts'](this.files);
      console.log('Raw line counts response:', response);
      
      // Extract the actual data from the UUID wrapper
      const extractedData = extractResponseData(response, {});
      console.log('Extracted line counts:', extractedData);
      
      this.lineCounts = extractedData || {};
      this._scheduleBatchUpdate();
    } catch (error) {
      console.error('Error loading line counts:', error);
      this.lineCounts = {};
    }
  }
  
  expandAll() {
    this.treeExpansion.reset();
    this.treeExpansion.setAllExpandedState(this.treeData, true);
    this._scheduleBatchUpdate();
    
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
    this._scheduleBatchUpdate();
    
    this.updateComplete.then(() => {
      const details = this.shadowRoot.querySelectorAll('details.directory-details');
      details.forEach(detail => {
        detail.open = false;
      });
    });
  }
  
  async uncheckAll() {
    if (!this.isConnected) {
      console.warn('Cannot uncheck all - not connected');
      return;
    }
    
    try {
      await this.fileTreeManager.removeAllFiles(this.addedFiles);
    } catch (error) {
      console.error('Error unchecking all files:', error);
    }
  }
  
  async loadFileTree(scrollPosition = 0) {
    if (!this.isConnected || !this.call) {
      console.warn('Cannot load file tree - not connected');
      this.error = 'Waiting for connection...';
      this._scheduleBatchUpdate();
      return;
    }
    
    try {
      this.loading = true;
      this.error = null;
      
      await this.performAdditionalLoading();
      
      const fileData = await this.fileTreeManager.loadFileData();
      
      // Batch all state updates
      this.addedFiles = fileData.addedFiles;
      this.files = fileData.allFiles;
      this.treeData = fileData.treeData;
      
      this.setupInitialExpansion();
      await this.performPostLoadingActions();
      
      // Reload line counts if they were previously shown
      if (this.showLineCounts) {
        await this.loadLineCounts();
      }
      
    } catch (error) {
      console.error('Error loading file tree:', error);
      this.error = `Failed to load file tree: ${error.message}`;
    } finally {
      this.loading = false;
      this._scheduleBatchUpdate();
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
    
    if (!this.isConnected) {
      console.warn('Cannot modify files - not connected');
      return;
    }
    
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
  
  async handleDirectoryCheckboxClick(event, node) {
    event.stopPropagation();
    event.preventDefault();
    
    if (!this.isConnected) {
      console.warn('Cannot modify files - not connected');
      return;
    }
    
    try {
      const allFiles = this.getAllFilesInDirectory(node);
      const allAdded = allFiles.every(file => this.addedFiles.includes(file));
      
      if (allAdded) {
        // Remove all files
        for (const filePath of allFiles) {
          await this.fileTreeManager.removeFile(filePath);
        }
      } else {
        // Add all files
        for (const filePath of allFiles) {
          if (!this.addedFiles.includes(filePath)) {
            await this.fileTreeManager.addFile(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Error handling directory checkbox:', error);
    }
  }
  
  getAllFilesInDirectory(node) {
    const files = [];
    
    const collectFiles = (currentNode) => {
      if (currentNode.isFile) {
        files.push(currentNode.path);
      } else if (currentNode.children) {
        currentNode.children.forEach(child => collectFiles(child));
      }
    };
    
    collectFiles(node);
    return files;
  }
  
  isDirectoryChecked(node) {
    const allFiles = this.getAllFilesInDirectory(node);
    return allFiles.length > 0 && allFiles.every(file => this.addedFiles.includes(file));
  }
  
  add_rel_fname_notification(filePath) {
    console.log(`File added notification: ${filePath}`);
    
    if (!this.addedFiles.includes(filePath)) {
      this.addedFiles = [...this.addedFiles, filePath];
      this.treeExpansion.expandPathToFile(filePath);
      this._scheduleBatchUpdate();
    }
  }
  
  drop_rel_fname_notification(filePath) {
    console.log(`File dropped notification: ${filePath}`);
    
    if (this.addedFiles.includes(filePath)) {
      this.addedFiles = this.addedFiles.filter(f => f !== filePath);
      this._scheduleBatchUpdate();
    }
  }
  
  getAdditionalNodeClasses(node, nodePath) {
    const classes = {};
    
    // Add current file highlighting
    if (node.isFile && nodePath === this.currentFile) {
      classes['current-file'] = true;
    }
    
    return classes;
  }
  
  renderAdditionalIndicators(node, nodePath) {
    return html``;
  }
  
  handleContextMenu(event, path, isFile) {
    // Check for Ctrl+right-click to copy filename to prompt
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      
      // Emit word-clicked event with the filename using EventHelper
      EventHelper.dispatchWindowEvent('word-clicked', { word: path });
      
      return;
    }
    
    // Base class does nothing for regular context menu - subclasses can override
  }
  
  getHeaderControls() {
    return {
      showUncheckAll: true,
      showExpandAll: true,
      showCollapseAll: true,
      showRefresh: true,
      showLineCountToggle: true
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
