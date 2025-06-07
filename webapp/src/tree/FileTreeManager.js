import {extractResponseData} from '../Utils.js';
import {TreeNode} from './TreeNode.js';
import {TreeBuilder} from './TreeBuilder.js';

export class FileTreeManager {
  constructor(jrpcClient) {
    this.jrpcClient = jrpcClient;
  }

  async loadFileData() {
    // Get all files in the repository
    const allFilesResponse = await this.jrpcClient.call['EditBlockCoder.get_all_relative_files']();
    const all_files = extractResponseData(allFilesResponse, [], true);
    
    // Get files that are already added to the chat context
    const addedFilesResponse = await this.jrpcClient.call['EditBlockCoder.get_inchat_relative_files']();
    const added_files = extractResponseData(addedFilesResponse, [], true);
    
    // Get Git status to include untracked files
    let untracked_files = [];
    try {
      const statusResponse = await this.jrpcClient.call['Repo.get_status']();
      const status = this.extractStatusFromResponse(statusResponse);
      untracked_files = status.untracked_files || [];
    } catch (error) {
      console.warn('Could not fetch Git status for untracked files:', error);
    }
    
    // Combine tracked and untracked files
    const all_files_with_untracked = [...new Set([...all_files, ...untracked_files])];
    
    return {
      allFiles: all_files_with_untracked,
      addedFiles: added_files,
      treeData: TreeBuilder.buildTreeFromPaths(all_files_with_untracked)
    };
  }

  extractStatusFromResponse(statusResponse) {
    let status = {};
    
    if (statusResponse && typeof statusResponse === 'object') {
      // Check if this is a direct response with known properties
      if ('branch' in statusResponse || 'is_dirty' in statusResponse) {
        status = statusResponse;
      }
      // Check if this is a wrapped response with a UUID key
      else {
        const keys = Object.keys(statusResponse);
        for (const key of keys) {
          if (statusResponse[key] && typeof statusResponse[key] === 'object') {
            status = statusResponse[key];
            break;
          }
        }
      }
    }
    
    return status;
  }

  async addFile(filePath) {
    await this.jrpcClient.call['EditBlockCoder.add_rel_fname'](filePath);
  }

  async removeFile(filePath) {
    await this.jrpcClient.call['EditBlockCoder.drop_rel_fname'](filePath);
  }

  async removeAllFiles(addedFiles) {
    const filesToRemove = [...addedFiles];
    
    for (const filePath of filesToRemove) {
      try {
        await this.removeFile(filePath);
      } catch (error) {
        console.error(`Error removing file ${filePath}:`, error);
      }
    }
  }
}
