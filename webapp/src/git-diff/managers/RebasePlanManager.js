export class RebasePlanManager {
  constructor(gitDiffView) {
    this.view = gitDiffView;
  }

  updateRebaseAction(commitIndex, action) {
    if (this.view.rebasePlan[commitIndex]) {
      this.view.rebasePlan[commitIndex].action = action;
      this.view.requestUpdate();
    }
  }

  updateCommitMessage(commitIndex, message) {
    if (this.view.rebasePlan[commitIndex]) {
      this.view.rebasePlan[commitIndex].message = message;
      this.view.requestUpdate();
    }
  }

  moveCommit(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    
    const commits = [...this.view.rebasePlan];
    const [movedCommit] = commits.splice(fromIndex, 1);
    commits.splice(toIndex, 0, movedCommit);
    this.view.rebasePlan = commits;
  }
}
