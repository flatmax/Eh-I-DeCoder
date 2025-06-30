import { extractResponseData } from '../Utils.js';
import { FileContentService } from '../services/FileContentService.js';
import { EventHelper } from '../utils/EventHelper.js';

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
      console.log('GitDiffView: Loading changed files between', this.view.fromCommit, 'and', this.view.toCommit);
      const response = await this.view.call['Repo.get_changed_files'](this.view.fromCommit, this.view.toCommit);
      console.log('GitDiffView: Changed files response:', response);
      
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
      console.log('GitDiffView: JRPC not ready yet for loadFileContents');
      return;
    }
    
    try {
      console.log('GitDiffView: Loading file contents for', this.view.selectedFile);
      
      const [fromContent, toContent] = await Promise.all([
        FileContentService.loadFile(this.view, this.view.selectedFile, this.view.fromCommit),
        FileContentService.loadFile(this.view, this.view.selectedFile, this.view.toCommit)
      ]);
      
      this.view.fromContent = fromContent;
      this.view.toContent = toContent;
      console.log('GitDiffView: Loaded file contents, from length:', this.view.fromContent.length, 'to length:', this.view.toContent.length);
      
    } catch (error) {
      console.error('Error loading file contents:', error);
      this.view.error = `Failed to load file contents: ${error.message}`;
      this.view.requestUpdate();
    }
  }

  async loadConflictContent() {
    if (!this.view.selectedFile) return;
    
    if (!this.view.call || !this.view.call['Repo.get_conflict_content']) {
      console.log('GitDiffView: JRPC not ready yet for loadConflictContent');
      return;
    }
    
    try {
      console.log('GitDiffView: Loading conflict content for', this.view.selectedFile);
      const conflictData = await FileContentService.loadConflictContent(this.view, this.view.selectedFile);
      
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
      console.error('Error loading conflict content:', error);
      this.view.error = `Failed to load conflict content: ${error.message}`;
      this.view.requestUpdate();
    }
  }
}
