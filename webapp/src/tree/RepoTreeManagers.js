import {ContextMenu} from './ContextMenu.js';
import {GitStatusManager} from './GitStatusManager.js';
import {GitActions} from './GitActions.js';

export class RepoTreeManagers {
  constructor(repoTree) {
    this.repoTree = repoTree;
    this.gitStatusManager = new GitStatusManager();
    this.contextMenu = new ContextMenu(repoTree);
    this.gitActions = new GitActions(repoTree, this.contextMenu, () => repoTree.handleGitActionComplete());
  }

  async fetchGitStatus() {
    try {
      const statusResponse = await this.repoTree.call['Repo.get_status']();
      
      this.gitStatusManager.loadGitStatus(statusResponse);
      
      // Update component properties for reactivity
      this.repoTree.gitStatus = this.gitStatusManager.gitStatus;
      this.repoTree.modifiedFiles = this.gitStatusManager.modifiedFiles;
      this.repoTree.stagedFiles = this.gitStatusManager.stagedFiles;
      this.repoTree.untrackedFiles = this.gitStatusManager.untrackedFiles;
      
      // Fetch line diffs for changed files
      await this.fetchLineDiffs();
      
    } catch (error) {
      console.error('Error fetching git status:', error);
      this.repoTree.error = `Failed to load Git status: ${error.message}`;
    }
  }

  async fetchLineDiffs() {
    try {
      const changedFiles = this.gitStatusManager.getChangedFilePaths();
      
      if (changedFiles.length === 0) {
        this.gitStatusManager.lineDiffs = {};
        return;
      }
      
      const lineDiffsResponse = await this.repoTree.call['Repo.get_file_line_diffs'](changedFiles);
      this.gitStatusManager.loadLineDiffs(lineDiffsResponse);
      
    } catch (error) {
      console.warn('Could not fetch line diffs:', error);
      this.gitStatusManager.lineDiffs = {};
    }
  }

  expandModifiedAndUntrackedFilePaths() {
    const modifiedPaths = this.gitStatusManager.getModifiedFilePaths();
    const untrackedPaths = this.gitStatusManager.untrackedFiles || [];
    
    const allPathsToExpand = [...modifiedPaths, ...untrackedPaths];
    
    if (allPathsToExpand.length > 0) {
      allPathsToExpand.forEach(filePath => {
        this.repoTree.treeExpansion.expandPathToFile(filePath);
      });
      this.repoTree.requestUpdate();
    }
  }
}
