export class TreeExpansion {
  constructor() {
    this.expandedDirs = {};
  }

  /**
   * Set expanded state for all directories recursively
   * @param {TreeNode} node - Node to process
   * @param {boolean} expanded - Whether to expand or collapse
   */
  setAllExpandedState(node, expanded) {
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
        this.setAllExpandedState(child, expanded);
      });
    }
  }

  /**
   * Expand all parent directories for a given file path
   * @param {string} filePath - Path to the file
   */
  expandPathToFile(filePath) {
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

  /**
   * Check if a directory is expanded
   * @param {string} path - Directory path
   * @returns {boolean} Whether the directory is expanded
   */
  isExpanded(path) {
    return !!this.expandedDirs[path];
  }

  /**
   * Toggle expansion state of a directory
   * @param {string} path - Directory path
   * @param {boolean} isOpen - New expansion state
   */
  setExpanded(path, isOpen) {
    this.expandedDirs[path] = isOpen;
  }

  /**
   * Reset all expansion states
   */
  reset() {
    this.expandedDirs = {};
  }
}
