/**
 * Utils.js - Common utility functions for the Aider webapp
 */

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
