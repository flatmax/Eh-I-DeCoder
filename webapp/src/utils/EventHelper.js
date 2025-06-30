/**
 * EventHelper - Utility class for standardized event dispatching
 * 
 * This utility provides consistent event creation and dispatching patterns
 * across all components, reducing code duplication and ensuring proper
 * event configuration.
 */
export class EventHelper {
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
   */
  static dispatchNavigationHistoryUpdate(currentFile, canGoBack, canGoForward) {
    this.dispatchWindowEvent('navigation-history-updated', {
      currentFile,
      canGoBack,
      canGoForward
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
}
