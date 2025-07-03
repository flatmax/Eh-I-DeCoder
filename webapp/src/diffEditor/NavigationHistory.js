import { EventHelper } from '../utils/EventHelper.js';

/**
 * Navigation History implementation using multiple tracks of doubly linked lists
 * Each track maintains one entry per file with cursor position
 */
export class NavigationHistory {
  constructor() {
    this.tracks = new Map(); // Map of track ID to track data
    this.currentTrackId = 0;
    this.nextTrackId = 1;
    this.maxTracksPerFile = 5; // Maximum number of tracks
    
    // Initialize first track
    this.tracks.set(0, {
      head: null,
      tail: null,
      current: null,
      size: 0,
      fileMap: new Map()
    });
    
    this.maxSize = 50;
    this.isNavigating = false;
    this.isSwitchingTracks = false; // Add flag for track switching
  }

  /**
   * Get the current track
   */
  getCurrentTrack() {
    return this.tracks.get(this.currentTrackId);
  }

  /**
   * Create a new track
   */
  createNewTrack() {
    if (this.tracks.size >= this.maxTracksPerFile) {
      // Remove oldest track (except track 0)
      let oldestId = 1;
      for (const [id] of this.tracks) {
        if (id > 0 && id < oldestId) {
          oldestId = id;
        }
      }
      if (oldestId !== this.currentTrackId) {
        this.tracks.delete(oldestId);
      }
    }
    
    const newTrackId = this.nextTrackId++;
    this.tracks.set(newTrackId, {
      head: null,
      tail: null,
      current: null,
      size: 0,
      fileMap: new Map()
    });
    
    return newTrackId;
  }

  /**
   * Switch to next track (Alt+Down)
   */
  switchToNextTrack() {
    const trackIds = Array.from(this.tracks.keys()).sort((a, b) => a - b);
    const currentIndex = trackIds.indexOf(this.currentTrackId);
    
    this.isSwitchingTracks = true; // Set flag before switching
    
    if (currentIndex < trackIds.length - 1) {
      this.currentTrackId = trackIds[currentIndex + 1];
    } else {
      // Create new track if at the end
      this.currentTrackId = this.createNewTrack();
    }
    
    this.emitUpdate();
    
    // Clear the flag after a short delay to allow the navigation to complete
    setTimeout(() => {
      this.isSwitchingTracks = false;
    }, 100);
    
    return this.currentTrackId;
  }

  /**
   * Switch to previous track (Alt+Up)
   */
  switchToPreviousTrack() {
    const trackIds = Array.from(this.tracks.keys()).sort((a, b) => a - b);
    const currentIndex = trackIds.indexOf(this.currentTrackId);
    
    this.isSwitchingTracks = true; // Set flag before switching
    
    if (currentIndex > 0) {
      this.currentTrackId = trackIds[currentIndex - 1];
      this.emitUpdate();
    }
    
    // Clear the flag after a short delay to allow the navigation to complete
    setTimeout(() => {
      this.isSwitchingTracks = false;
    }, 100);
    
    return this.currentTrackId;
  }

  /**
   * Get all tracks for visualization
   */
  getAllTracks() {
    const result = [];
    const trackIds = Array.from(this.tracks.keys()).sort((a, b) => a - b);
    
    for (const trackId of trackIds) {
      const track = this.tracks.get(trackId);
      const nodes = [];
      let node = track.head;
      
      while (node) {
        nodes.push({
          filePath: node.filePath,
          line: node.line,
          character: node.character,
          timestamp: node.timestamp,
          isCurrent: node === track.current,
          hasChanges: node.hasChanges
        });
        node = node.next;
      }
      
      result.push({
        trackId,
        isCurrentTrack: trackId === this.currentTrackId,
        nodes
      });
    }
    
    return result;
  }

  /**
   * Emit an event when navigation history changes
   */
  emitUpdate() {
    const track = this.getCurrentTrack();
    EventHelper.dispatchNavigationHistoryUpdate(
      track?.current?.filePath,
      this.canGoBack(),
      this.canGoForward(),
      this.currentTrackId,
      this.tracks.size
    );
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
    // Don't record if we're currently navigating or switching tracks
    if (this.isNavigating || this.isSwitchingTracks) {
      return;
    }

    const track = this.getCurrentTrack();

    // If switching to the same file, just update the position
    if (fromFile === toFile && track.current && track.current.filePath === toFile) {
      track.current.line = toLine;
      track.current.character = toChar;
      track.current.timestamp = Date.now();
      this.emitUpdate();
      return;
    }

    // Update the current file's position if we're leaving a file
    if (fromFile && track.current && track.current.filePath === fromFile) {
      track.current.line = fromLine;
      track.current.character = fromChar;
      track.current.timestamp = Date.now();
    }

    // Check if the target file already exists in history
    const existingNode = track.fileMap.get(toFile);
    
    if (existingNode) {
      // File exists in history - only move it if it's not already current
      if (track.current !== existingNode) {
        // Move it to after current position
        this.moveNodeAfterCurrent(track, existingNode);
      }
      
      // Update its position
      existingNode.line = toLine;
      existingNode.character = toChar;
      existingNode.timestamp = Date.now();
      
      // Make it the current node
      track.current = existingNode;
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
      this.insertAfterCurrent(track, newNode);
      
      // Add to file map
      track.fileMap.set(toFile, newNode);
      
      // Make it the current node
      track.current = newNode;
      
      // Check size limit
      this.enforceMaxSize(track);
    }

    // Emit update event
    this.emitUpdate();
  }

  /**
   * Navigate directly to a specific file and position in the history
   * @param {string} filePath - File path to navigate to
   * @param {number} line - Line number
   * @param {number} character - Character position
   * @returns {Object|null} Position {filePath, line, character} or null if not found
   */
  navigateToPosition(filePath, line, character) {
    const track = this.getCurrentTrack();
    const targetNode = track.fileMap.get(filePath);
    if (!targetNode) {
      return null;
    }

    this.isNavigating = true;
    
    // Update the target node's position
    targetNode.line = line;
    targetNode.character = character;
    targetNode.timestamp = Date.now();
    
    // Make it the current node
    track.current = targetNode;
    
    // Emit update event
    this.emitUpdate();
    
    return {
      filePath: targetNode.filePath,
      line: targetNode.line,
      character: targetNode.character
    };
  }

  /**
   * Update the cursor position for the current file
   * @param {number} line - New line number
   * @param {number} character - New character position
   */
  updateCurrentPosition(line, character) {
    const track = this.getCurrentTrack();
    if (track.current && !this.isNavigating && !this.isSwitchingTracks) {
      track.current.line = line;
      track.current.character = character;
      track.current.timestamp = Date.now();
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

    const track = this.getCurrentTrack();
    this.isNavigating = true;
    
    // Move current pointer back
    track.current = track.current.prev;
    
    // Emit update event
    this.emitUpdate();
    
    return {
      filePath: track.current.filePath,
      line: track.current.line,
      character: track.current.character
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

    const track = this.getCurrentTrack();
    this.isNavigating = true;
    
    // Move current pointer forward
    track.current = track.current.next;
    
    // Emit update event
    this.emitUpdate();
    
    return {
      filePath: track.current.filePath,
      line: track.current.line,
      character: track.current.character
    };
  }

  /**
   * Check if we can navigate back
   * @returns {boolean}
   */
  canGoBack() {
    const track = this.getCurrentTrack();
    return track.current && track.current.prev !== null;
  }

  /**
   * Check if we can navigate forward
   * @returns {boolean}
   */
  canGoForward() {
    const track = this.getCurrentTrack();
    return track.current && track.current.next !== null;
  }

  /**
   * Clear the navigation flag (call after navigation is complete)
   */
  clearNavigationFlag() {
    this.isNavigating = false;
  }

  /**
   * Move an existing node to after the current position
   * @param {Object} track - The track to operate on
   * @param {Object} node - The node to move
   */
  moveNodeAfterCurrent(track, node) {
    // If it's already after current, nothing to do
    if (track.current && track.current.next === node) {
      return;
    }

    // Remove node from its current position
    this.removeNode(track, node);

    // Insert after current
    this.insertAfterCurrent(track, node);
  }

  /**
   * Remove a node from the list (but don't delete it)
   * @param {Object} track - The track to operate on
   * @param {Object} node - The node to remove
   */
  removeNode(track, node) {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      track.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      track.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
    track.size--;
  }

  /**
   * Insert a node after the current position
   * @param {Object} track - The track to operate on
   * @param {Object} node - The node to insert
   */
  insertAfterCurrent(track, node) {
    if (!track.current) {
      // No current node - this becomes the first node
      track.head = track.tail = node;
      node.prev = null;
      node.next = null;
    } else {
      // Insert after current
      node.prev = track.current;
      node.next = track.current.next;
      
      if (track.current.next) {
        track.current.next.prev = node;
      } else {
        track.tail = node;
      }
      
      track.current.next = node;
    }
    
    track.size++;
  }

  /**
   * Enforce the maximum size limit by removing oldest entries
   * @param {Object} track - The track to operate on
   */
  enforceMaxSize(track) {
    while (track.size > this.maxSize && track.head !== track.current) {
      const toRemove = track.head;
      track.head = track.head.next;
      if (track.head) {
        track.head.prev = null;
      }
      
      // Remove from file map
      track.fileMap.delete(toRemove.filePath);
      track.size--;
    }
  }

  /**
   * Clear all history
   */
  clear() {
    this.tracks.clear();
    this.currentTrackId = 0;
    this.nextTrackId = 1;
    
    // Re-initialize first track
    this.tracks.set(0, {
      head: null,
      tail: null,
      current: null,
      size: 0,
      fileMap: new Map()
    });
    
    this.isNavigating = false;
    this.isSwitchingTracks = false;
    this.emitUpdate();
  }

  /**
   * Get the current history as an array (for debugging)
   * @returns {Array} Array of history entries
   */
  toArray() {
    const track = this.getCurrentTrack();
    const result = [];
    let node = track.head;
    while (node) {
      result.push({
        filePath: node.filePath,
        line: node.line,
        character: node.character,
        isCurrent: node === track.current
      });
      node = node.next;
    }
    return result;
  }
}

// Singleton instance
export const navigationHistory = new NavigationHistory();
