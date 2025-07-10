export class SelectionValidator {
  constructor(gitHistoryView) {
    this.view = gitHistoryView;
  }

  /**
   * Check if a commit is allowed to be selected as the "from" commit
   * A commit is allowed if it's older than or equal to the selected "to" commit
   */
  isCommitAllowedForFrom(commitHash) {
    if (!this.view.toCommit || !commitHash) return true;
    
    const fromIndex = this.view.commits.findIndex(c => c.hash === commitHash);
    const toIndex = this.view.commits.findIndex(c => c.hash === this.view.toCommit);
    
    // If either commit is not found, allow it (fallback)
    if (fromIndex === -1 || toIndex === -1) return true;
    
    // In git history, newer commits have lower indices (they appear first)
    // So fromCommit should have a higher or equal index than toCommit
    return fromIndex >= toIndex;
  }

  /**
   * Check if a commit is allowed to be selected as the "to" commit
   * A commit is allowed if it's newer than or equal to the selected "from" commit
   */
  isCommitAllowedForTo(commitHash) {
    if (!this.view.fromCommit || !commitHash) return true;
    
    const toIndex = this.view.commits.findIndex(c => c.hash === commitHash);
    const fromIndex = this.view.commits.findIndex(c => c.hash === this.view.fromCommit);
    
    // If either commit is not found, allow it (fallback)
    if (toIndex === -1 || fromIndex === -1) return true;
    
    // In git history, newer commits have lower indices (they appear first)
    // So toCommit should have a lower or equal index than fromCommit
    return toIndex <= fromIndex;
  }

  /**
   * Get disabled commits for the left panel (from commits)
   */
  getDisabledCommitsForFrom() {
    if (!this.view.toCommit) return new Set();
    
    const toIndex = this.view.commits.findIndex(c => c.hash === this.view.toCommit);
    if (toIndex === -1) return new Set();
    
    const disabledCommits = new Set();
    
    // Disable all commits that are newer (have lower index) than the toCommit
    for (let i = 0; i < toIndex; i++) {
      disabledCommits.add(this.view.commits[i].hash);
    }
    
    return disabledCommits;
  }

  /**
   * Get disabled commits for the right panel (to commits)
   */
  getDisabledCommitsForTo() {
    if (!this.view.fromCommit) return new Set();
    
    const fromIndex = this.view.commits.findIndex(c => c.hash === this.view.fromCommit);
    if (fromIndex === -1) return new Set();
    
    const disabledCommits = new Set();
    
    // Disable all commits that are older (have higher index) than the fromCommit
    for (let i = fromIndex + 1; i < this.view.commits.length; i++) {
      disabledCommits.add(this.view.commits[i].hash);
    }
    
    return disabledCommits;
  }
}
