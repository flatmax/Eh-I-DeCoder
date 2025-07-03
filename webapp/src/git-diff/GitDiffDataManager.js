import { extractResponseData } from '../Utils.js';

export class GitDiffDataManager {
  constructor(GitDiffView) {
    this.view = GitDiffView;
  }

  async loadChangedFiles() {
    if (!this.view.fromCommit || !this.view.toCommit) return;
    
    if (!this.view.call || !this.view.call['Repo.get_changed_files']) {
      console.log('GitDiffView: JRPC not ready yet for loadChangedFiles');
      return;
    }
    
    this.view.loading = true;
    this.view.error = null;
    
    try {
      console.log(`GitDiffView: Loading changed files between ${this.view.fromCommit} and ${this.view.toCommit}`);
      const response = await this.view.call['Repo.get_changed_files'](
        this.view.fromCommit, 
        this.view.toCommit
      );
      
      // Extract the actual data from the JRPC response
      const changedFiles = extractResponseData(response, []);
      
      console.log(`GitDiffView: Received ${changedFiles.length} changed files`);
      this.view.changedFiles = changedFiles;
      
      // Auto-select first file if none selected
      if (changedFiles.length > 0 && !this.view.selectedFile) {
        // Check if changedFiles contains objects with 'file' property or just strings
        if (typeof changedFiles[0] === 'object' && changedFiles[0].file) {
          this.view.selectedFile = changedFiles[0].file;
        } else {
          this.view.selectedFile = changedFiles[0];
        }
        await this.loadFileContents();
      }
    } catch (error) {
      console.error('GitDiffView: Error loading changed files:', error);
      this.view.error = 'Failed to load changed files';
    } finally {
      this.view.loading = false;
    }
  }

  async loadFileContents() {
    if (!this.view.selectedFile || !this.view.fromCommit || !this.view.toCommit) return;
    
    if (!this.view.call || !this.view.call['Repo.get_file_content']) {
      console.log('GitDiffView: JRPC not ready yet for loadFileContents');
      return;
    }
    
    console.log(`GitDiffView: Loading file contents for ${this.view.selectedFile}`);
    
    try {
      // Load both versions in parallel
      const [fromResponse, toResponse] = await Promise.all([
        this.view.call['Repo.get_file_content'](this.view.selectedFile, this.view.fromCommit),
        this.view.call['Repo.get_file_content'](this.view.selectedFile, this.view.toCommit)
      ]);
      
      console.log('GitDiffView: Raw responses:', { fromResponse, toResponse });
      
      // Extract the actual content from JRPC responses
      let fromContent = '';
      let toContent = '';
      let hasError = false;
      let errorMessage = '';
      
      // Handle the response - it might be wrapped in a UUID object
      if (fromResponse) {
        const extracted = extractResponseData(fromResponse, null);
        console.log('GitDiffView: Extracted from content:', extracted);
        
        // Handle different response formats
        if (typeof extracted === 'string') {
          fromContent = extracted;
        } else if (extracted && typeof extracted === 'object') {
          // Check for error response
          if ('error' in extracted) {
            console.error('GitDiffView: Error in from content response:', extracted.error);
            hasError = true;
            errorMessage = `Error loading ${this.view.fromCommit} version: ${extracted.error}`;
            fromContent = '';
          } else if ('content' in extracted) {
            fromContent = extracted.content || '';
          } else if ('data' in extracted) {
            fromContent = extracted.data || '';
          }
        }
      }
      
      if (toResponse) {
        const extracted = extractResponseData(toResponse, null);
        console.log('GitDiffView: Extracted to content:', extracted);
        
        // Handle different response formats
        if (typeof extracted === 'string') {
          toContent = extracted;
        } else if (extracted && typeof extracted === 'object') {
          // Check for error response
          if ('error' in extracted) {
            console.error('GitDiffView: Error in to content response:', extracted.error);
            hasError = true;
            errorMessage = errorMessage ? `${errorMessage}\nError loading ${this.view.toCommit} version: ${extracted.error}` : `Error loading ${this.view.toCommit} version: ${extracted.error}`;
            toContent = '';
          } else if ('content' in extracted) {
            toContent = extracted.content || '';
          } else if ('data' in extracted) {
            toContent = extracted.data || '';
          }
        }
      }
      
      console.log(`GitDiffView: Loaded file contents, from length: ${fromContent.length} to length: ${toContent.length}`);
      
      // Update the view with the loaded content
      this.view.fromContent = fromContent;
      this.view.toContent = toContent;
      this.view.currentFilePath = this.view.selectedFile;
      
      // Set error if we encountered any
      if (hasError) {
        this.view.error = errorMessage;
      }
      
    } catch (error) {
      console.error('GitDiffView: Error loading file contents:', error);
      this.view.error = 'Failed to load file contents';
      // Set empty content on error
      this.view.fromContent = '';
      this.view.toContent = '';
    }
  }

  async loadConflictContent() {
    if (!this.view.selectedFile) return;
    
    if (!this.view.call || !this.view.call['Repo.get_conflict_content']) {
      console.log('GitDiffView: JRPC not ready yet for loadConflictContent');
      return;
    }
    
    try {
      console.log(`GitDiffView: Loading conflict content for ${this.view.selectedFile}`);
      const response = await this.view.call['Repo.get_conflict_content'](this.view.selectedFile);
      const conflictData = extractResponseData(response);
      
      if (conflictData && conflictData.success !== false) {
        this.view.fromContent = conflictData.ours || '';
        this.view.toContent = conflictData.theirs || '';
        
        // If there's a merged version with conflict markers, use it
        if (conflictData.merged) {
          this.view.toContent = conflictData.merged;
        }
        
        console.log('GitDiffView: Loaded conflict content');
      } else {
        this.view.error = conflictData?.error || 'Failed to load conflict content';
      }
      
    } catch (error) {
      console.error('GitDiffView: Error loading conflict content:', error);
      this.view.error = `Failed to load conflict content: ${error.message}`;
    }
  }
}
