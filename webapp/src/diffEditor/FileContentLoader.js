import { FileContentService } from '../services/FileContentService.js';

export class FileContentLoader {
  constructor(jrpcClient) {
    this.jrpcClient = jrpcClient;
  }

  async loadFileContent(filePath) {
    console.log(`Loading file content for: ${filePath}`);
    
    const { headContent, workingContent } = await FileContentService.loadFileVersions(
      this.jrpcClient, 
      filePath
    );
    
    console.log('File content loaded:', {
      filePath,
      headLength: headContent.length,
      workingLength: workingContent.length
    });
    
    return { headContent, workingContent };
  }

  async saveFileContent(filePath, content) {
    console.log(`Saving changes to file: ${filePath}`);
    const response = await FileContentService.saveFile(this.jrpcClient, filePath, content);
    console.log('File saved successfully');
    return response;
  }
}
