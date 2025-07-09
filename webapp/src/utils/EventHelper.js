/**
 * EventHelper - Utility class for standardized event dispatching
 * 
 * This utility provides consistent event creation and dispatching patterns
 * across all components, reducing code duplication and ensuring proper
 * event configuration.
 */

/**
 * EventBus - Centralized event management with automatic cleanup
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
    this.componentListeners = new WeakMap();
    this.delegatedListeners = new Map();
  }
  
  /**
   * Connect event bus to a component for automatic cleanup
   * @param {HTMLElement} component - Component to track
   */
  connectToComponent(component) {
    if (!this.componentListeners.has(component)) {
      this.componentListeners.set(component, new Set());
      
      // Override disconnectedCallback to auto-cleanup
      const originalDisconnected = component.disconnectedCallback;
      component.disconnectedCallback = function() {
        eventBus.cleanupComponent(component);
        if (originalDisconnected) {
          originalDisconnected.call(this);
        }
      };
    }
  }
  
  /**
   * Add event listener with automatic cleanup
   * @param {HTMLElement} component - Component that owns the listener
   * @param {EventTarget} target - Target element or object
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Event listener options
   */
  addEventListener(component, target, eventName, handler, options = {}) {
    this.connectToComponent(component);
    
    // Create listener info
    const listenerInfo = {
      target,
      eventName,
      handler,
      options,
      remove: () => target.removeEventListener(eventName, handler, options)
    };
    
    // Track listener for this component
    const componentListeners = this.componentListeners.get(component);
    componentListeners.add(listenerInfo);
    
    // Add the actual listener
    target.addEventListener(eventName, handler, options);
    
    return listenerInfo;
  }
  
  /**
   * Add delegated event listener
   * @param {HTMLElement} component - Component that owns the listener
   * @param {EventTarget} container - Container element
   * @param {string} eventName - Event name
   * @param {string} selector - CSS selector for delegation
   * @param {Function} handler - Event handler
   * @param {Object} options - Event listener options
   */
  addDelegatedListener(component, container, eventName, selector, handler, options = {}) {
    this.connectToComponent(component);
    
    // Create delegated handler
    const delegatedHandler = (event) => {
      const target = event.target.closest(selector);
      if (target && container.contains(target)) {
        handler.call(target, event);
      }
    };
    
    // Add as regular listener
    return this.addEventListener(component, container, eventName, delegatedHandler, options);
  }
  
  /**
   * Emit custom event
   * @param {EventTarget} target - Target to emit from
   * @param {string} eventName - Event name
   * @param {Object} detail - Event detail
   * @param {Object} options - Event options
   */
  emit(target, eventName, detail = {}, options = {}) {
    const event = EventHelper.createEvent(eventName, detail, options);
    return target.dispatchEvent(event);
  }
  
  /**
   * Subscribe to events with automatic cleanup
   * @param {HTMLElement} component - Component that owns the subscription
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler
   * @param {EventTarget} target - Target to listen on (default: window)
   */
  subscribe(component, eventName, handler, target = window) {
    return this.addEventListener(component, target, eventName, handler);
  }
  
  /**
   * Cleanup all listeners for a component
   * @param {HTMLElement} component - Component to cleanup
   */
  cleanupComponent(component) {
    const listeners = this.componentListeners.get(component);
    if (listeners) {
      listeners.forEach(listener => listener.remove());
      listeners.clear();
    }
    this.componentListeners.delete(component);
  }
  
  /**
   * Create a scoped event emitter for a component
   * @param {HTMLElement} component - Component to create emitter for
   * @returns {Object} Scoped emitter
   */
  createComponentEmitter(component) {
    this.connectToComponent(component);
    
    return {
      emit: (eventName, detail, options) => this.emit(component, eventName, detail, options),
      subscribe: (eventName, handler, target) => this.subscribe(component, eventName, handler, target),
      on: (target, eventName, handler, options) => this.addEventListener(component, target, eventName, handler, options),
      delegate: (container, eventName, selector, handler, options) => 
        this.addDelegatedListener(component, container, eventName, selector, handler, options)
    };
  }
}

// Create singleton event bus
const eventBus = new EventBus();

export class EventHelper {
  /**
   * Get the event bus instance
   */
  static get bus() {
    return eventBus;
  }
  
  /**
   * Create a custom event with standard configuration
   * @param {string} eventName - Name of the event
   * @param {Object} detail - Event detail data
   * @param {Object} options - Additional event options
   * @returns {CustomEvent} Configured custom event
   */
  static createEvent(eventName, detail = {}, options = {}) {
    const defaultOptions = {
      bubbles: true,
      composed: true,
      cancelable: false
    };

    return new CustomEvent(eventName, {
      detail,
      ...defaultOptions,
      ...options
    });
  }

  /**
   * Dispatch an event from a component
   * @param {HTMLElement} component - Component to dispatch from
   * @param {string} eventName - Name of the event
   * @param {Object} detail - Event detail data
   * @param {Object} options - Additional event options
   * @returns {boolean} True if event was not cancelled
   */
  static dispatch(component, eventName, detail = {}, options = {}) {
    const event = this.createEvent(eventName, detail, options);
    return component.dispatchEvent(event);
  }

  /**
   * Create a component-scoped event helper
   * @param {HTMLElement} component - Component to scope to
   * @returns {Object} Scoped event helper
   */
  static forComponent(component) {
    const emitter = eventBus.createComponentEmitter(component);
    
    return {
      // Event bus methods
      ...emitter,
      
      // Original static methods bound to component
      dispatch: (eventName, detail, options) => 
        EventHelper.dispatch(component, eventName, detail, options),
      
      dispatchOpenFile: (filePath, lineNumber, characterNumber) =>
        EventHelper.dispatchOpenFile(component, filePath, lineNumber, characterNumber),
      
      dispatchNavigateToHistory: (filePath, line, character) =>
        EventHelper.dispatchNavigateToHistory(component, filePath, line, character),
      
      dispatchSaveFile: (content, filePath) =>
        EventHelper.dispatchSaveFile(component, content, filePath),
      
      dispatchContentChanged: (content, version, changes) =>
        EventHelper.dispatchContentChanged(component, content, version, changes),
      
      dispatchCursorPositionChanged: (line, character) =>
        EventHelper.dispatchCursorPositionChanged(component, line, character),
      
      dispatchRequestFindInFiles: (selectedText) =>
        EventHelper.dispatchRequestFindInFiles(component, selectedText),
      
      dispatchLspStatusChange: (connected) =>
        EventHelper.dispatchLspStatusChange(component, connected),
      
      dispatchNavigation: (direction) =>
        EventHelper.dispatchNavigation(component, direction),
      
      dispatchModeToggle: (mode) =>
        EventHelper.dispatchModeToggle(component, mode),
      
      dispatchTabChange: (activeTabIndex) =>
        EventHelper.dispatchTabChange(component, activeTabIndex),
      
      dispatchUpdateServerURI: (newServerURI) =>
        EventHelper.dispatchUpdateServerURI(component, newServerURI),
      
      dispatchToggleExpanded: (expanded) =>
        EventHelper.dispatchToggleExpanded(component, expanded),
      
      dispatchWordClicked: (word) =>
        EventHelper.dispatchWordClicked(component, word)
    };
  }

  /**
   * Dispatch a file-related event
   * @param {HTMLElement} component - Component to dispatch from
   * @param {string} filePath - File path
   * @param {number} lineNumber - Optional line number
   * @param {number} characterNumber - Optional character number
   */
  static dispatchOpenFile(component, filePath, lineNumber = null, characterNumber = null) {
    return this.dispatch(component, 'open-file', {
      filePath,
      lineNumber,
      characterNumber
    });
  }

  /**
   * Dispatch a navigation event
   * @param {HTMLElement} component - Component to dispatch from
   * @param {string} filePath - File path to navigate to
   * @param {number} line - Line number
   * @param {number} character - Character position
   */
  static dispatchNavigateToHistory(component, filePath, line, character) {
    return this.dispatch(component, 'navigate-to-history', {
      filePath,
      line,
      character
    });
  }

  /**
   * Dispatch a save file event
   * @param {HTMLElement} component - Component to dispatch from
   * @param {string} content - File content to save
   * @param {string} filePath - Optional file path
   */
  static dispatchSaveFile(component, content, filePath = null) {
    return this.dispatch(component, 'save-file', {
      content,
      filePath
    });
  }

  /**
   * Dispatch a content changed event
   * @param {HTMLElement} component - Component to dispatch from
   * @param {string} content - New content
   * @param {number} version - Content version
   * @param {Array} changes - Array of changes
   */
  static dispatchContentChanged(component, content, version = 1, changes = []) {
    return this.dispatch(component, 'content-changed', {
      content,
      version,
      changes
    });
  }

  /**
   * Dispatch a cursor position changed event
   * @param {HTMLElement} component - Component to dispatch from
   * @param {number} line - Line number
   * @param {number} character - Character position
   */
  static dispatchCursorPositionChanged(component, line, character) {
    return this.dispatch(component, 'cursor-position-changed', {
      line,
      character
    });
  }

  /**
   * Dispatch a find in files request event
   * @param {HTMLElement} component - Component to dispatch from
   * @param {string} selectedText - Text to search for
   */
  static dispatchRequestFindInFiles(component, selectedText = '') {
    return this.dispatch(component, 'request-find-in-files', {
      selectedText
    });
  }

  /**
   * Dispatch an LSP status change event
   * @param {HTMLElement} component - Component to dispatch from
   * @param {boolean} connected - LSP connection status
   */
  static dispatchLspStatusChange(component, connected) {
    return this.dispatch(component, 'lsp-status-change', {
      connected
    });
  }

  /**
   * Dispatch a navigation event (back/forward)
   * @param {HTMLElement} component - Component to dispatch from
   * @param {string} direction - 'back' or 'forward'
   */
  static dispatchNavigation(component, direction) {
    return this.dispatch(component, `navigation-${direction}`);
  }

  /**
   * Dispatch a mode toggle event
   * @param {HTMLElement} component - Component to dispatch from
   * @param {string} mode - New mode
   */
  static dispatchModeToggle(component, mode = null) {
    return this.dispatch(component, 'mode-toggle', { mode });
  }

  /**
   * Dispatch a tab change event
   * @param {HTMLElement} component - Component to dispatch from
   * @param {number} activeTabIndex - New active tab index
   */
  static dispatchTabChange(component, activeTabIndex) {
    return this.dispatch(component, 'tab-change', {
      activeTabIndex
    });
  }

  /**
   * Dispatch a server URI update event
   * @param {HTMLElement} component - Component to dispatch from
   * @param {string} newServerURI - New server URI
   */
  static dispatchUpdateServerURI(component, newServerURI) {
    return this.dispatch(component, 'update-server-uri', {
      newServerURI
    });
  }

  /**
   * Dispatch a sidebar toggle event
   * @param {HTMLElement} component - Component to dispatch from
   * @param {boolean} expanded - Sidebar expanded state
   */
  static dispatchToggleExpanded(component, expanded) {
    return this.dispatch(component, 'toggle-expanded', {
      expanded
    });
  }

  /**
   * Create a window-level event for global communication
   * @param {string} eventName - Name of the event
   * @param {Object} detail - Event detail data
   */
  static dispatchWindowEvent(eventName, detail = {}) {
    const event = this.createEvent(eventName, detail);
    window.dispatchEvent(event);
  }

  /**
   * Dispatch a navigation history update event
   * @param {string} currentFile - Current file path
   * @param {boolean} canGoBack - Can navigate back
   * @param {boolean} canGoForward - Can navigate forward
   * @param {number} currentTrackId - Current track ID
   * @param {number} trackCount - Total number of tracks
   */
  static dispatchNavigationHistoryUpdate(currentFile, canGoBack, canGoForward, currentTrackId = 0, trackCount = 1) {
    this.dispatchWindowEvent('navigation-history-updated', {
      currentFile,
      canGoBack,
      canGoForward,
      currentTrackId,
      trackCount
    });
  }

  /**
   * Dispatch a file loaded in editor event
   * @param {string} filePath - File path that was loaded
   */
  static dispatchFileLoadedInEditor(filePath) {
    const event = this.createEvent('file-loaded-in-editor', { filePath });
    document.dispatchEvent(event);
  }

  /**
   * Dispatch word clicked event (for copying text to PromptView)
   * @param {HTMLElement} component - Component to dispatch from
   * @param {string} word - Word or text that was clicked
   */
  static dispatchWordClicked(component, word) {
    const event = this.createEvent('word-clicked', { word });
    document.dispatchEvent(event);
    return true;
  }
}
