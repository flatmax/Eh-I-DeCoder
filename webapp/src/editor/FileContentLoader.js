import {extractResponseData} from '../Utils.js';

export class FileContentLoader {
  constructor(jrpcClient) {
    this.jrpcClient = jrpcClient;
  }

  async loadFileContent(filePath) {
    console.log(`Loading file content for: ${filePath}`);
    
    // Get HEAD version and working directory version
    const headResponse = await this.jrpcClient.call['Repo.get_file_content'](filePath, 'HEAD');
    const workingResponse = await this.jrpcClient.call['Repo.get_file_content'](filePath, 'working');
    
    // Extract content from responses (handle UUID wrapper)
    const headContent = this.extractContent(headResponse);
    const workingContent = this.extractContent(workingResponse);
    
    console.log('File content loaded:', {
      filePath,
      headLength: headContent.length,
      workingLength: workingContent.length
    });
    
    return { headContent, workingContent };
  }

  extractContent(response) {
    return extractResponseData(response, '');
  }

  async saveFileContent(filePath, content) {
    console.log(`Saving changes to file: ${filePath}`);
    const response = await this.jrpcClient.call['Repo.save_file_content'](filePath, content);
    
    // Check response
    if (response.error) {
      throw new Error(`Failed to save file: ${response.error}`);
    }
    
    console.log('File saved successfully');
    return response;
  }
}
