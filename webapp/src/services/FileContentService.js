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
