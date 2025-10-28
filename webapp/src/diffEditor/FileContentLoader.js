import { FileContentService } from '../services/FileContentService.js';

export class FileContentLoader {
  constructor(jrpcClient) {
    this.jrpcClient = jrpcClient;
  }

  async loadFileContent(filePath) {
    console.log(`Loading file content for: ${filePath}`);
    
    try {
      const { headContent, workingContent } = await FileContentService.loadFileVersions(
        this.jrpcClient, 
        filePath
      );
      
      // Ensure we always have valid strings
      const validHeadContent = headContent || '';
      const validWorkingContent = workingContent || '';
      
      console.log('File content loaded:', {
        filePath,
        headLength: validHeadContent.length,
        workingLength: validWorkingContent.length
      });
      
      return { 
        headContent: validHeadContent, 
        workingContent: validWorkingContent 
      };
    } catch (error) {
      console.error(`Error loading file content for ${filePath}:`, error);
      // Return empty strings as fallback
      return {
        headContent: '',
        workingContent: ''
      };
    }
  }

  async saveFileContent(filePath, content) {
    console.log(`Saving changes to file: ${filePath}`);
    const response = await FileContentService.saveFile(this.jrpcClient, filePath, content);
    console.log('File saved successfully');
    return response;
  }
}
