import { extractResponseData } from '../Utils.js';

/**
 * Centralized service for file content operations
 */
export class FileContentService {
  /**
   * Load file content from repository
   * @param {Object} jrpcClient - JRPC client instance
   * @param {string} filePath - Path to the file
   * @param {string} version - Version to load ('working', 'HEAD', commit hash)
   * @returns {Promise<string>} File content
   */
  static async loadFile(jrpcClient, filePath, version = 'working') {
    // Check if this is an external file (absolute path)
    if (filePath.startsWith('/')) {
      console.log(`FileContentService: Loading external file: ${filePath}`);
      try {
        // Try to read the external file using the regular file content method
        // This will work if the backend can access the file
        const response = await jrpcClient.call['Repo.get_file_content'](filePath, 'working');
        const content = extractResponseData(response, '');
        return content || '';
      } catch (error) {
        console.warn(`FileContentService: Failed to load external file ${filePath}:`, error);
        // Return a placeholder message for external files that can't be loaded
        return `# External file: ${filePath}\n# This file is outside the workspace and cannot be loaded for editing.\n# File path: ${filePath}`;
      }
    }
    
    // Regular workspace file
    try {
      const response = await jrpcClient.call['Repo.get_file_content'](filePath, version);
      const content = extractResponseData(response, '');
      return content || '';
    } catch (error) {
      console.warn(`FileContentService: Failed to load file ${filePath} (${version}):`, error);
      return '';
    }
  }

  /**
   * Load both HEAD and working versions of a file
   * @param {Object} jrpcClient - JRPC client instance
   * @param {string} filePath - Path to the file
   * @returns {Promise<{headContent: string, workingContent: string}>}
   */
  static async loadFileVersions(jrpcClient, filePath) {
    // Check if this is an external file (absolute path)
    if (filePath.startsWith('/')) {
      console.log(`FileContentService: Loading external file versions: ${filePath}`);
      try {
        // Try to read the external file using the regular file content method
        const response = await jrpcClient.call['Repo.get_file_content'](filePath, 'working');
        const content = extractResponseData(response, '');
        const validContent = content || '';
        
        // For external files, both HEAD and working are the same
        return {
          headContent: validContent,
          workingContent: validContent
        };
      } catch (error) {
        console.warn(`FileContentService: Failed to load external file ${filePath}:`, error);
        // Return a placeholder message for external files that can't be loaded
        const placeholderContent = `# External file: ${filePath}\n# This file is outside the workspace and cannot be loaded for editing.\n# File path: ${filePath}`;
        return {
          headContent: placeholderContent,
          workingContent: placeholderContent
        };
      }
    }

    // Regular workspace files - load both versions with error handling
    try {
      const [headResponse, workingResponse] = await Promise.all([
        jrpcClient.call['Repo.get_file_content'](filePath, 'HEAD').catch(err => {
          console.warn(`FileContentService: Failed to load HEAD version of ${filePath}:`, err);
          return { error: err.message || 'Failed to load HEAD version' };
        }),
        jrpcClient.call['Repo.get_file_content'](filePath, 'working').catch(err => {
          console.warn(`FileContentService: Failed to load working version of ${filePath}:`, err);
          return { error: err.message || 'Failed to load working version' };
        })
      ]);

      // Extract content with proper error handling
      // extractResponseData returns the default value if response has an error
      let headContent = extractResponseData(headResponse, '');
      let workingContent = extractResponseData(workingResponse, '');

      // Additional safety check - ensure we got strings, not objects
      if (typeof headContent !== 'string') {
        console.warn(`FileContentService: HEAD content is not a string for ${filePath}, using empty string`);
        headContent = '';
      }
      if (typeof workingContent !== 'string') {
        console.warn(`FileContentService: Working content is not a string for ${filePath}, using empty string`);
        workingContent = '';
      }

      // Ensure we always return strings, never undefined or null
      return {
        headContent: headContent || '',
        workingContent: workingContent || ''
      };
    } catch (error) {
      console.error(`FileContentService: Unexpected error loading file versions for ${filePath}:`, error);
      // Return empty strings as fallback
      return {
        headContent: '',
        workingContent: ''
      };
    }
  }

  /**
   * Save file content to repository
   * @param {Object} jrpcClient - JRPC client instance
   * @param {string} filePath - Path to the file
   * @param {string} content - Content to save
   * @returns {Promise<Object>} Save response
   */
  static async saveFile(jrpcClient, filePath, content) {
    // Check if this is an external file (absolute path)
    if (filePath.startsWith('/')) {
      console.log(`FileContentService: Attempting to save external file: ${filePath}`);
      // For now, prevent saving external files
      throw new Error(`Cannot save external file: ${filePath}. External files are read-only.`);
    }

    // Regular workspace file
    const response = await jrpcClient.call['Repo.save_file_content'](filePath, content);
    
    if (response && response.error) {
      throw new Error(`Failed to save file: ${response.error}`);
    }
    
    return response;
  }

  /**
   * Load conflict content for a file
   * @param {Object} jrpcClient - JRPC client instance
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} Conflict content with ours, theirs, and merged versions
   */
  static async loadConflictContent(jrpcClient, filePath) {
    const response = await jrpcClient.call['Repo.get_conflict_content'](filePath);
    return extractResponseData(response);
  }
}
