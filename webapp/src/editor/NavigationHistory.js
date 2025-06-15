/**
 * Navigation History implementation using a doubly linked list
 * Maintains one entry per file with cursor position
 */
export class NavigationHistory {
  constructor() {
    this.head = null;
    this.tail = null;
    this.current = null;
    this.size = 0;
    this.maxSize = 50;
    this.isNavigating = false;
    this.fileMap = new Map(); // Map to quickly find existing file entries
  }

  /**
   * Emit an event when navigation history changes
   */
  emitUpdate() {
    window.dispatchEvent(new CustomEvent('navigation-history-updated', {
      detail: {
        currentFile: this.current?.filePath,
        canGoBack: this.canGoBack(),
        canGoForward: this.canGoForward()
      }
    }));
  }

  /**
   * Record a file switch in the navigation history
   * @param {string} fromFile - File path we're switching from (can be null)
   * @param {number} fromLine - Line number in the from file
   * @param {number} fromChar - Character position in the from file
   * @param {string} toFile - File path we're switching to
   * @param {number} toLine - Line number in the to file
   * @param {number} toChar - Character position in the to file
   */
  recordFileSwitch(fromFile, fromLine, fromChar, toFile, toLine, toChar) {
    // Don't record if we're currently navigating
    if (this.isNavigating) {
      return;
    }

    // If switching to the same file, just update the position
    if (fromFile === toFile && this.current && this.current.filePath === toFile) {
      this.current.line = toLine;
      this.current.character = toChar;
      this.current.timestamp = Date.now();
      this.emitUpdate();
      return;
    }

    // Update the current file's position if we're leaving a file
    if (fromFile && this.current && this.current.filePath === fromFile) {
      this.current.line = fromLine;
      this.current.character = fromChar;
      this.current.timestamp = Date.now();
    }

    // Check if the target file already exists in history
    const existingNode = this.fileMap.get(toFile);
    
    if (existingNode) {
      // File exists in history - move it to after current position
      this.moveNodeAfterCurrent(existingNode);
      
      // Update its position
      existingNode.line = toLine;
      existingNode.character = toChar;
      existingNode.timestamp = Date.now();
      
      // Make it the current node
      this.current = existingNode;
    } else {
      // New file - create a new node
      const newNode = {
        filePath: toFile,
        line: toLine,
        character: toChar,
        timestamp: Date.now(),
        prev: null,
        next: null
      };

      // Insert after current position
      this.insertAfterCurrent(newNode);
      
      // Add to file map
      this.fileMap.set(toFile, newNode);
      
      // Make it the current node
      this.current = newNode;
      
      // Check size limit
      this.enforceMaxSize();
    }

    // Emit update event
    this.emitUpdate();
  }

  /**
   * Update the cursor position for the current file
   * @param {number} line - New line number
   * @param {number} character - New character position
   */
  updateCurrentPosition(line, character) {
    if (this.current && !this.isNavigating) {
      this.current.line = line;
      this.current.character = character;
      this.current.timestamp = Date.now();
    }
  }

  /**
   * Navigate back in history
   * @returns {Object|null} Previous position {filePath, line, character} or null
   */
  goBack() {
    if (!this.canGoBack()) {
      return null;
    }

    this.isNavigating = true;
    
    // Move current pointer back
    this.current = this.current.prev;
    
    // Emit update event
    this.emitUpdate();
    
    return {
      filePath: this.current.filePath,
      line: this.current.line,
      character: this.current.character
    };
  }

  /**
   * Navigate forward in history
   * @returns {Object|null}Next position {filePath, line, character} or null
   */
  goForward() {
    if (!this.canGoForward()) {
      return null;
    }

    this.isNavigating = true;
    
    // Move current pointer forward
    this.current = this.current.next;
    
    // Emit update event
    this.emitUpdate();
    
    return {
      filePath: this.current.filePath,
      line: this.current.line,
      character: this.current.character
    };
  }

  /**
   * Check if we can navigate back
   * @returns {boolean}
   */
  canGoBack() {
    return this.current && this.current.prev !== null;
  }

  /**
   * Check if we can navigate forward
   * @returns {boolean}
   */
  canGoForward() {
    return this.current && this.current.next !== null;
  }

  /**
   * Clear the navigation flag (call after navigation is complete)
   */
  clearNavigationFlag() {
    this.isNavigating = false;
  }

  /**
   * Move an existing node to after the current position
   * @param {Object} node - The node to move
   */
  moveNodeAfterCurrent(node) {
    // If it's already after current, nothing to do
    if (this.current && this.current.next === node) {
      return;
    }

    // Remove node from its current position
    this.removeNode(node);

    // Insert after current
    this.insertAfterCurrent(node);
  }

  /**
   * Remove a node from the list (but don't delete it)
   * @param {Object} node - The node to remove
   */
  removeNode(node) {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
    this.size--;
  }

  /**
   * Insert a node after the current position
   * @param {Object} node - The node to insert
   */
  insertAfterCurrent(node) {
    if (!this.current) {
      // No current node - this becomes the first node
      this.head = this.tail = node;
      node.prev = null;
      node.next = null;
    } else {
      // Insert after current
      node.prev = this.current;
      node.next = this.current.next;
      
      if (this.current.next) {
        this.current.next.prev = node;
      } else {
        this.tail = node;
      }
      
      this.current.next = node;
    }
    
    this.size++;
  }

  /**
   * Enforce the maximum size limit by removing oldest entries
   */
  enforceMaxSize() {
    while (this.size > this.maxSize && this.head !== this.current) {
      const toRemove = this.head;
      this.head = this.head.next;
      if (this.head) {
        this.head.prev = null;
      }
      
      // Remove from file map
      this.fileMap.delete(toRemove.filePath);
      this.size--;
    }
  }

  /**
   * Clear all history
   */
  clear() {
    this.head = null;
    this.tail = null;
    this.current = null;
    this.size = 0;
    this.fileMap.clear();
    this.isNavigating = false;
    this.emitUpdate();
  }

  /**
   * Get the current history as an array (for debugging)
   * @returns {Array} Array of history entries
   */
  toArray() {
    const result = [];
    let node = this.head;
    while (node) {
      result.push({
        filePath: node.filePath,
        line: node.line,
        character: node.character,
        isCurrent: node === this.current
      });
      node = node.next;
    }
    return result;
  }
}

// Singleton instance
export const navigationHistory = new NavigationHistory();
