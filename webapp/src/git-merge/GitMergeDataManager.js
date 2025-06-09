import {extractResponseData} from '../Utils.js';

export class GitMergeDataManager {
  constructor(gitMergeView) {
    this.view = gitMergeView;
  }

  async loadChangedFiles() {
    if (!this.view.fromCommit || !this.view.toCommit) return;
    
    if (!this.view.call || !this.view.call['Repo.get_changed_files']) {
      console.log('GitMergeView: JRPC not ready yet for loadChangedFiles');
      return;
    }
    
    this.view.loading = true;
    this.view.error = null;
    
    try {
      console.log('GitMergeView: Loading changed files between', this.view.fromCommit, 'and', this.view.toCommit);
      const response = await this.view.call['Repo.get_changed_files'](this.view.fromCommit, this.view.toCommit);
      console.log('GitMergeView: Changed files response:', response);
      
      this.view.changedFiles = extractResponseData(response, [], true);
      
      if (this.view.changedFiles.length > 0) {
        this.view.selectedFile = this.view.changedFiles[0];
        await this.loadFileContents();
      } else {
        this.view.selectedFile = '';
        this.view.fromContent = '';
        this.view.toContent = '';
      }
      
    } catch (error) {
      console.error('Error loading changed files:', error);
      this.view.error = `Failed to load changed files: ${error.message}`;
    } finally {
      this.view.loading = false;
      this.view.requestUpdate();
    }
  }

  async loadFileContents() {
    if (!this.view.selectedFile || !this.view.fromCommit || !this.view.toCommit) return;
    
    if (!this.view.call || !this.view.call['Repo.get_file_content']) {
      console.log('GitMergeView: JRPC not ready yet for loadFileContents');
      return;
    }
    
    try {
      console.log('GitMergeView: Loading file contents for', this.view.selectedFile);
      const [fromResponse, toResponse] = await Promise.all([
        this.view.call['Repo.get_file_content'](this.view.selectedFile, this.view.fromCommit),
        this.view.call['Repo.get_file_content'](this.view.selectedFile, this.view.toCommit)
      ]);
      
      this.view.fromContent = extractResponseData(fromResponse, '');
      this.view.toContent = extractResponseData(toResponse, '');
      console.log('GitMergeView: Loaded file contents, from length:', this.view.fromContent.length, 'to length:', this.view.toContent.length);
      
    } catch (error) {
      console.error('Error loading file contents:', error);
      this.view.error = `Failed to load file contents: ${error.message}`;
      this.view.requestUpdate();
    }
  }
}
