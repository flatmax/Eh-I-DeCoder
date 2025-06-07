/**
 * Represents a node in the file tree (either a file or directory)
 */
export class TreeNode {
  /**
   * Create a new tree node
   * @param {string} name - The name of this node (filename or directory name)
   * @param {string} path - The full path to this node
   * @param {boolean} isFile - Whether this node represents a file (true) or directory (false)
   */
  constructor(name, path, isFile) {
    this.name = name;
    this.path = path;
    this.isFile = isFile;
    this.children = isFile ? null : new Map(); // Only directories have children
  }
  
  /**
   * Add a child node to this directory
   * @param {string} name - Child node name
   * @param {TreeNode} node - Child node to add
   */
  addChild(name, node) {
    if (this.isFile) throw new Error("Cannot add children to a file node");
    this.children.set(name, node);
  }
  
  /**
   * Get sorted children of this node
   * @returns {TreeNode[]} Sorted array of child nodes (directories first, then alphabetical)
   */
  getSortedChildren() {
    if (!this.children) return [];
    
    return Array.from(this.children.values())
      .sort((a, b) => {
        // Sort directories first, then by name
        if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
  }
}
