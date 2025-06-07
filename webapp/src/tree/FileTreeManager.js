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
    
    return {
      allFiles: all_files,
      addedFiles: added_files,
      treeData: TreeBuilder.buildTreeFromPaths(all_files)
    };
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
