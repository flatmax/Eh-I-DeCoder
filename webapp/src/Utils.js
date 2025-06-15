/**
 * Utils.js - Common utility functions for the Aider webapp
 */

/**
 * Updates all child components of the specified type with a new property value
 * 
 * @param {LitElement} component - The parent component containing the shadow DOM
 * @param {string} selector - CSS selector to find child components
 * @param {string} property - Property name to update
 * @param {any} value - Value to set on the property
 * @returns {Promise} - Promise that resolves when update is complete
 */
export function updateChildComponents(component, selector, property, value) {
  // Skip if no shadow root
  if (!component || !component.shadowRoot) {
    console.warn('Cannot update child components: no shadow root');
    return Promise.resolve();
  }

  // Return promise from updateComplete to allow chaining
  return component.updateComplete.then(() => {
    const childComponents = component.shadowRoot.querySelectorAll(selector);
    
    if (childComponents.length === 0) {
      console.debug(`No child components found matching selector: ${selector}`);
      return;
    }
    
    console.debug(`Updating ${childComponents.length} ${selector} components with ${property}=${value}`);
    
    childComponents.forEach(child => {
      if (child[property] !== value) {
        child[property] = value;
      }
    });
  });
}

/**
 * Extracts data from a JSON-RPC response that might be wrapped in a UUID object
 * 
 * JRPC responses from Python can be wrapped with a UUID as the top-level key:
 * { "1234-5678-uuid": actualData }
 * 
 * This function unwraps such responses and handles common cases.
 * 
 * @param {any} response - The response from a JRPC call
 * @param {any} defaultValue - Default value to return if no data extracted
 * @param {boolean} ensureArray - If true, ensures the result is an array
 * @return {any} The unwrapped data
 */
export function extractResponseData(response, defaultValue = null, ensureArray = false) {
  // Direct return for null/undefined
  if (response === undefined || response === null) {
    return ensureArray ? [] : defaultValue;
  }
  
  // Handle direct arrays
  if (Array.isArray(response)) {
    return response;
  }
  
  // Handle direct strings if not requiring array
  if (typeof response === 'string' && !ensureArray) {
    return response;
  }
  
  // Handle direct primitives if not requiring array
  if (typeof response !== 'object' && !ensureArray) {
    return response;
  }
  
  // Handle object with 'results' property (for search results)
  if (response.results !== undefined) {
    const results = response.results;
    return ensureArray && !Array.isArray(results) ? [] : results;
  }
  
  // For objects, try to extract from UUID wrapper
  const keys = Object.keys(response);
  if (keys.length === 0) {
    return ensureArray ? [] : defaultValue;
  }
  
  // Extract data from first key (UUID)
  const data = response[keys[0]];
  
  // Handle null/undefined extracted data
  if (data === undefined || data === null) {
    return ensureArray ? [] : defaultValue;
  }
  
  // Special handling for content objects (e.g. file content responses)
  if (typeof data === 'object' && !Array.isArray(data) && data.content !== undefined) {
    return ensureArray ? [data.content] : data.content;
  }
  
  // Ensure array if requested
  if (ensureArray && !Array.isArray(data)) {
    return typeof data === 'object' ? [] : [data];
  }
  
  return data;
}

/**
 * Deep search through shadow roots to find an element matching a selector
 * 
 * @param {Element} rootElement - The root element to start searching from
 * @param {string} selector - CSS selector to search for
 * @returns {Element|null} The found element or null
 */
export function deepQuerySelector(rootElement, selector) {
  const searchInElement = (element) => {
    // Check current element
    if (element.tagName && element.tagName.toLowerCase() === selector) {
      return element;
    }
    
    // Search in shadow root if it exists
    if (element.shadowRoot) {
      const found = element.shadowRoot.querySelector(selector);
      if (found) return found;
      
      // Recursively search in shadow root children
      const shadowChildren = Array.from(element.shadowRoot.querySelectorAll('*'));
      for (const child of shadowChildren) {
        const result = searchInElement(child);
        if (result) return result;
      }
    }
    
    // Search in regular children
    const children = Array.from(element.children || []);
    for (const child of children) {
      const result = searchInElement(child);
      if (result) return result;
    }
    
    return null;
  };
  
  return searchInElement(rootElement);
}

/**
 * Get all custom elements in a DOM tree, including those in shadow roots
 * 
 * @param {Element} rootElement - The root element to start searching from
 * @returns {string[]} Array of custom element tag names found
 */
export function getAllCustomElements(rootElement) {
  const elements = new Set();
  
  const collectElements = (root) => {
    const customEls = Array.from(root.querySelectorAll('*'))
      .filter(el => el.tagName.includes('-'))
      .map(el => el.tagName.toLowerCase());
    
    customEls.forEach(tag => elements.add(tag));
    
    // Also check shadow roots
    Array.from(root.querySelectorAll('*')).forEach(el => {
      if (el.shadowRoot) {
        collectElements(el.shadowRoot);
      }
    });
  };
  
  collectElements(rootElement);
  return Array.from(elements);
}

/**
 * Initialize beforeunload handler to warn users before closing the tab
 * This gives users a choice to keep the tab open
 */
export function initializeBeforeUnloadWarning() {
  window.addEventListener('beforeunload', (event) => {
    // Show confirmation dialog before closing tab
    const message = 'Are you sure you want to leave? Any unsaved changes will be lost.';
    
    // Standard way to show confirmation dialog
    event.preventDefault();
    event.returnValue = message;
    
    return message;
  });
  
  console.log('Before unload warning initialized - users will be prompted before closing tab');
}
