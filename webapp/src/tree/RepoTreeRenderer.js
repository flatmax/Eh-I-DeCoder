import {html} from 'lit';

export class RepoTreeRenderer {
  constructor(repoTree) {
    this.repoTree = repoTree;
  }

  renderBranchInfo() {
    const branchInfo = this.repoTree.repoManagers.gitStatusManager.getBranchInfo();
    
    return branchInfo.branch ? html`
      <div class="branch-row">
        <span class="branch-info">Branch: ${branchInfo.branch}</span>
        ${branchInfo.isDirty ? html`<span class="dirty-indicator">●</span>` : ''}
      </div>
    ` : html``;
  }

  renderFabAndContextMenu() {
    return html`
      ${this.renderContextMenu()}
    `;
  }

  renderGitStatusIndicator(node, nodePath) {
    if (node.isFile) {
      const gitStatus = this.repoTree.repoManagers.gitStatusManager.getFileGitStatus(nodePath);
      if (gitStatus !== 'clean') {
        return html`
          <span class="git-status-indicator">${this.repoTree.repoManagers.gitStatusManager.getGitStatusSymbol(gitStatus)}</span>
        `;
      }
    }
    return html``;
  }

  renderContextMenu() {
    if (!this.repoTree.repoManagers.contextMenu.visible) return html``;

    const path = this.repoTree.repoManagers.contextMenu.path;
    const isFile = this.repoTree.repoManagers.contextMenu.isFile;

    return html`
      <div class="context-menu">
        ${isFile ? html`
          <!-- File context menu options -->
          ${this.repoTree.repoManagers.contextMenu.renderMenuItem('edit', 'Rename File', () => this.repoTree.repoManagers.gitActions.handleRenameFile())}
          
          ${path && this.repoTree.repoManagers.gitStatusManager.getFileGitStatus(path) === 'staged' ? 
            this.repoTree.repoManagers.contextMenu.renderMenuItem('remove_circle', 'Unstage File', () => this.repoTree.repoManagers.gitActions.handleUnstageFile()) :
            this.repoTree.repoManagers.contextMenu.renderMenuItem('add_circle', 'Stage File', () => this.repoTree.repoManagers.gitActions.handleStageFile())
          }
          
          ${path && this.repoTree.repoManagers.gitStatusManager.getFileGitStatus(path) === 'modified' ?
            this.repoTree.repoManagers.contextMenu.renderMenuItem('restore', 'Discard Changes', () => this.repoTree.repoManagers.gitActions.handleDiscardChanges()) : ''
          }

          ${path && this.repoTree.repoManagers.gitStatusManager.getFileGitStatus(path) === 'untracked' ?
            this.repoTree.repoManagers.contextMenu.renderMenuItem('delete', 'Delete File', () => this.repoTree.repoManagers.gitActions.handleDeleteFile()) : ''
          }
        ` : html`
          <!-- Directory context menu options -->
          ${this.repoTree.repoManagers.contextMenu.renderMenuItem('add', 'Create File', () => this.repoTree.repoManagers.gitActions.handleCreateFile())}
        `}
      </div>
    `;
  }
}
