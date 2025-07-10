import { RebaseStatusManager } from './managers/RebaseStatusManager.js';
import { RebaseOperationsManager } from './managers/RebaseOperationsManager.js';
import { RebasePlanManager } from './managers/RebasePlanManager.js';
import { ConflictResolutionManager } from './managers/ConflictResolutionManager.js';
import { CommitOperationsManager } from './managers/CommitOperationsManager.js';

export class GitDiffRebaseManager {
  constructor(GitDiffView) {
    this.view = GitDiffView;
    
    // Initialize sub-managers
    this.statusManager = new RebaseStatusManager(GitDiffView);
    this.operationsManager = new RebaseOperationsManager(GitDiffView);
    this.planManager = new RebasePlanManager(GitDiffView);
    this.conflictManager = new ConflictResolutionManager(GitDiffView);
    this.commitManager = new CommitOperationsManager(GitDiffView);
  }

  // Delegate to RebaseStatusManager
  async checkRebaseStatus() {
    return this.statusManager.checkRebaseStatus();
  }

  async loadRawGitStatus() {
    return this.statusManager.loadRawGitStatus();
  }

  async saveGitEditorFile() {
    return this.statusManager.saveGitEditorFile();
  }

  // Delegate to RebaseOperationsManager
  async startInteractiveRebase() {
    return this.operationsManager.startInteractiveRebase();
  }

  async executeRebase() {
    return this.operationsManager.executeRebase();
  }

  async continueRebase() {
    return this.operationsManager.continueRebase();
  }

  async abortRebase() {
    return this.operationsManager.abortRebase();
  }

  // Delegate to RebasePlanManager
  updateRebaseAction(commitIndex, action) {
    return this.planManager.updateRebaseAction(commitIndex, action);
  }

  updateCommitMessage(commitIndex, message) {
    return this.planManager.updateCommitMessage(commitIndex, message);
  }

  moveCommit(fromIndex, toIndex) {
    return this.planManager.moveCommit(fromIndex, toIndex);
  }

  // Delegate to ConflictResolutionManager
  async resolveConflict(resolution) {
    return this.conflictManager.resolveConflict(resolution);
  }

  // Delegate to CommitOperationsManager
  async commitChanges() {
    return this.commitManager.commitChanges();
  }

  async commitAmend() {
    return this.commitManager.commitAmend();
  }

  // Convenience method to reset rebase state
  resetRebaseState() {
    this.view.resetRebaseState();
  }
}
