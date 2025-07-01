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
        return extractResponseData(response, '');
      } catch (error) {
        console.warn(`FileContentService: Failed to load external file ${filePath}:`, error);
        // Return a placeholder message for external files that can't be loaded
        return `# External file: ${filePath}\n# This file is outside the workspace and cannot be loaded for editing.\n# File path: ${filePath}`;
      }
    }
    
    // Regular workspace file
    const response = await jrpcClient.call['Repo.get_file_content'](filePath, version);
    return extractResponseData(response, '');
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
        
        // For external files, both HEAD and working are the same
        return {
          headContent: content,
          workingContent: content
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

    // Regular workspace files
    const [headResponse, workingResponse] = await Promise.all([
      jrpcClient.call['Repo.get_file_content'](filePath, 'HEAD'),
      jrpcClient.call['Repo.get_file_content'](filePath, 'working')
    ]);

    return {
      headContent: extractResponseData(headResponse, ''),
      workingContent: extractResponseData(workingResponse, '')
    };
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
