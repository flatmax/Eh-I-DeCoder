import {TreeNode} from './TreeNode.js';

export class TreeBuilder {
  /**
   * Build a tree structure from an array of file paths
   * @param {string[]} paths - Array of file paths
   * @returns {TreeNode} Root node of the tree
   */
  static buildTreeFromPaths(paths) {
    // Ensure paths is always an array
    if (!Array.isArray(paths)) {
      console.error('buildTreeFromPaths received non-array:', paths);
      paths = [];
    }
    
    // Create the root node
    const root = new TreeNode('root', '', false);
    
    // Process each path and add it to the tree
    paths.forEach(path => {
      if (!path) return; // Skip empty paths
      
      const parts = path.split('/').filter(part => part); // Filter out empty parts
      
      let currentNode = root;
      let currentPath = '';
      
      // For each path segment
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;
        
        // Update the current path
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        // Check if this node already exists
        if (!currentNode.children.has(part)) {
          // Create and add the new node
          const newNode = new TreeNode(part, currentPath, isLastPart);
          currentNode.addChild(part, newNode);
        }
        
        // Move to the next node
        currentNode = currentNode.children.get(part);
      }
    });
    
    return root;
  }
}
