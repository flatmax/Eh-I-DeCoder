import {html} from 'lit';

export class PanelRenderer {
  constructor(gitHistoryView) {
    this.view = gitHistoryView;
  }

  renderBranchList(branches, selectedBranch, disabledBranches, isLeft = true) {
    return html`
      <div class="branch-list">
        ${branches.map(branch => {
          const isDisabled = disabledBranches.has(branch.name);
          const isSelected = selectedBranch === branch.name;
          const disabledMessage = isLeft ? 
            'Cannot select branch newer than "To" selection' : 
            'Cannot select branch older than "From" selection';
          
          return html`
            <div 
              class="branch-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}"
              @click=${isDisabled ? null : () => isLeft ? this.view.branchManager.handleFromBranchSelect(branch) : this.view.branchManager.handleToBranchSelect(branch)}
              title="${isDisabled ? disabledMessage : `${branch.name}${branch.commit ? ' (' + branch.commit.substring(0, 7) + ')' : ''}`}"
            >
              <span class="branch-icon">🌿</span>
              <span class="branch-name">${branch.name}</span>
              ${branch.commit ? html`<span class="branch-commit">${branch.commit.substring(0, 7)}</span>` : ''}
            </div>
          `;
        })}
      </div>
    `;
  }

  renderCollapsedBranches(selectedBranch, isLeft = true) {
    if (!this.view.branches || this.view.branches.length === 0) return '';
    
    const disabledBranches = isLeft ? this.view.branchManager.getDisabledBranchesForFrom() : this.view.branchManager.getDisabledBranchesForTo();
    
    return html`
      <div class="collapsed-branches">
        ${this.view.branches.map(branch => {
          const isDisabled = disabledBranches.has(branch.name);
          const isSelected = selectedBranch === branch.name;
          const disabledMessage = isLeft ? 
            'Cannot select branch newer than "To" selection' : 
            'Cannot select branch older than "From" selection';
          
          return html`
            <div 
              class="collapsed-branch ${isSelected ? 'active' : ''} ${isDisabled ? 'disabled' : ''}"
              @click=${isDisabled ? null : () => isLeft ? this.view.branchManager.handleFromBranchSelect(branch) : this.view.branchManager.handleToBranchSelect(branch)}
              title="${isDisabled ? disabledMessage : branch.name}"
            >
              🌿 ${branch.name}
            </div>
          `;
        })}
      </div>
    `;
  }

  renderCollapsedCommitHashes(selectedCommit, isLeft = true) {
    if (!this.view.commits || this.view.commits.length === 0) return '';
    
    const disabledCommits = isLeft ? this.view.selectionValidator.getDisabledCommitsForFrom() : this.view.selectionValidator.getDisabledCommitsForTo();
    
    return html`
      <div class="collapsed-commit-hashes">
        ${this.view.commits.map(commit => {
          const isDisabled = disabledCommits.has(commit.hash);
          const disabledMessage = isLeft ? 
            'Cannot select newer commit than "To" commit' : 
            'Cannot select older commit than "From" commit';
          
          return html`
            <div 
              class="collapsed-hash ${selectedCommit === commit.hash ? 'active' : ''} ${isDisabled ? 'disabled' : ''}"
              @click=${isDisabled ? null : () => isLeft ? this.view.handleFromCommitSelect({detail: {commitHash: commit.hash}}) : this.view.handleToCommitSelect({detail: {commitHash: commit.hash}})}
              title="${isDisabled ? disabledMessage : `${commit.hash} - ${commit.message || 'No message'}`}"
              style="${isDisabled ? 'cursor: not-allowed; opacity: 0.5;' : ''}"
            >
              ${commit.hash?.substring(0, 7) || '???????'}
            </div>
          `;
        })}
      </div>
    `;
  }

  renderEmptyState() {
    if (this.view.commits.length === 0) {
      return html`
        <div class="empty-state">
          <p>No commits found in this repository.</p>
          <p>Make your first commit to see history.</p>
        </div>
      `;
    }
    return null;
  }
  
  renderSingleCommitWarning() {
    if (this.view.commits.length === 1) {
      const commit = this.view.commits[0];
      return html`
        <div class="notification-banner">
          <p><strong>Only one commit available: ${commit.hash?.substring(0, 7) || 'Unknown'}</strong></p>
          <p>${commit.message || 'No message'} (${commit.author || 'Unknown author'})</p>
          <p>This is showing the contents of the initial commit. Make more commits to see change comparisons.</p>
          <button @click=${() => this.view.isConnected ? this.view.commitDataManager.loadGitLogManually() : null} class="manual-refresh-button" ?disabled=${!this.view.isConnected}>
            Refresh Git History
          </button>
        </div>
      `;
    }
    return null;
  }

  renderSelectedCommits() {
    if (!this.view.fromCommit || !this.view.toCommit) return '';
    
    const fromCommitObj = this.view.commits.find(c => c.hash === this.view.fromCommit);
    const toCommitObj = this.view.commits.find(c => c.hash === this.view.toCommit);
    
    return html`
      <div class="selected-commits">
        Comparing: 
        ${this.view.fromBranch ? html`<strong>${this.view.fromBranch}</strong> ` : ''}
        ${fromCommitObj?.hash?.substring(0, 7) || 'Unknown'} 
        → 
        ${this.view.toBranch ? html`<strong>${this.view.toBranch}</strong> ` : ''}
        ${toCommitObj?.hash?.substring(0, 7) || 'Unknown'}
        (${this.view.totalCommitsLoaded} commits loaded)
      </div>
    `;
  }
}
