import {LitElement, html, css} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {GitHistoryStyles} from './git-history/GitHistoryStyles.js';
import {CommitDataManager} from './git-history/CommitDataManager.js';
import {ResizeHandler} from './git-history/ResizeHandler.js';
import './CommitList.js';
import './GitMergeView.js';

export class GitHistoryView extends JRPCClient {
  static properties = {
    serverURI: { type: String },
    fromCommit: { type: String, state: true },
    toCommit: { type: String, state: true },
    commits: { type: Array, state: true },
    loading: { type: Boolean, state: true },
    loadingMore: { type: Boolean, state: true },
    error: { type: String, state: true },
    leftPanelWidth: { type: Number, state: true },
    rightPanelWidth: { type: Number, state: true },
    isDraggingLeft: { type: Boolean, state: true },
    isDraggingRight: { type: Boolean, state: true },
    page: { type: Number, state: true },
    hasMoreCommits: { type: Boolean, state: true },
    pageSize: { type: Number, state: true },
    totalCommitsLoaded: { type: Number, state: true },
    leftPanelHovered: { type: Boolean, state: true },
    rightPanelHovered: { type: Boolean, state: true }
  };

  constructor() {
    super();
    this.fromCommit = '';
    this.toCommit = '';
    this.commits = [];
    this.loading = false;
    this.loadingMore = false;
    this.error = null;
    this.leftPanelWidth = 300;
    this.rightPanelWidth = 300;
    this.isDraggingLeft = false;
    this.isDraggingRight = false;
    this.page = 1;
    this.hasMoreCommits = true;
    this.pageSize = 50;
    this.totalCommitsLoaded = 0;
    this.leftPanelHovered = false;
    this.rightPanelHovered = false;

    // Initialize managers
    this.commitDataManager = new CommitDataManager(this);
    this.resizeHandler = new ResizeHandler(this);
  }

  static styles = GitHistoryStyles.styles;

  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    this.resizeHandler.initialize();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeHandler.cleanup();
  }

  setupDone() {
    super.setupDone?.();
    this.commitDataManager.loadCommits();
  }
  
  remoteIsUp() {
    if (super.remoteIsUp) super.remoteIsUp();
    setTimeout(() => this.commitDataManager.loadCommits(), 500);
  }

  handleCommitListScroll(event) {
    this.commitDataManager.handleScroll(event);
  }

  handleFromCommitSelect(event) {
    const selectedHash = event.detail.commitHash;
    
    // Check if this commit is allowed (not newer than the toCommit)
    if (this.toCommit && !this.isCommitAllowedForFrom(selectedHash)) {
      console.log('Cannot select commit newer than the "to" commit');
      return;
    }
    
    this.fromCommit = selectedHash;
    this.requestUpdate();
  }

  handleToCommitSelect(event) {
    this.toCommit = event.detail.commitHash;
    
    // If the current fromCommit is now newer than the new toCommit, clear it
    if (this.fromCommit && !this.isCommitAllowedForFrom(this.fromCommit)) {
      this.fromCommit = '';
    }
    
    this.requestUpdate();
  }

  /**
   * Check if a commit is allowed to be selected as the "from" commit
   * A commit is allowed if it's older than or equal to the selected "to" commit
   */
  isCommitAllowedForFrom(commitHash) {
    if (!this.toCommit || !commitHash) return true;
    
    const fromIndex = this.commits.findIndex(c => c.hash === commitHash);
    const toIndex = this.commits.findIndex(c => c.hash === this.toCommit);
    
    // If either commit is not found, allow it (fallback)
    if (fromIndex === -1 || toIndex === -1) return true;
    
    // In git history, newer commits have lower indices (they appear first)
    // So fromCommit should have a higher or equal index than toCommit
    return fromIndex >= toIndex;
  }

  /**
   * Get disabled commits for the left panel
   */
  getDisabledCommitsForFrom() {
    if (!this.toCommit) return new Set();
    
    const toIndex = this.commits.findIndex(c => c.hash === this.toCommit);
    if (toIndex === -1) return new Set();
    
    const disabledCommits = new Set();
    
    // Disable all commits that are newer (have lower index) than the toCommit
    for (let i = 0; i < toIndex; i++) {
      disabledCommits.add(this.commits[i].hash);
    }
    
    return disabledCommits;
  }

  handleLeftPanelMouseEnter() {
    this.leftPanelHovered = true;
  }

  handleLeftPanelMouseLeave() {
    this.leftPanelHovered = false;
  }

  handleRightPanelMouseEnter() {
    this.rightPanelHovered = true;
  }

  handleRightPanelMouseLeave() {
    this.rightPanelHovered = false;
  }

  getLeftPanelWidth() {
    if (this.isDraggingLeft) return this.leftPanelWidth;
    return this.leftPanelHovered ? this.leftPanelWidth : 60;
  }

  getRightPanelWidth() {
    if (this.isDraggingRight) return this.rightPanelWidth;
    return this.rightPanelHovered ? this.rightPanelWidth : 60;
  }

  renderCollapsedCommitHashes(selectedCommit, isLeft = true) {
    if (!this.commits || this.commits.length === 0) return '';
    
    const disabledCommits = isLeft ? this.getDisabledCommitsForFrom() : new Set();
    
    return html`
      <div class="collapsed-commit-hashes">
        ${this.commits.map(commit => {
          const isDisabled = disabledCommits.has(commit.hash);
          return html`
            <div 
              class="collapsed-hash ${selectedCommit === commit.hash ? 'active' : ''} ${isDisabled ? 'disabled' : ''}"
              @click=${isDisabled ? null : () => isLeft ? this.handleFromCommitSelect({detail: {commitHash: commit.hash}}) : this.handleToCommitSelect({detail: {commitHash: commit.hash}})}
              title="${isDisabled ? 'Cannot select newer commit than "To" commit' : `${commit.hash} - ${commit.message || 'No message'}`}"
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
    if (this.commits.length === 0) {
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
    if (this.commits.length === 1) {
      const commit = this.commits[0];
      return html`
        <div class="notification-banner">
          <p><strong>Only one commit available: ${commit.hash?.substring(0, 7) || 'Unknown'}</strong></p>
          <p>${commit.message || 'No message'} (${commit.author || 'Unknown author'})</p>
          <p>This is showing the contents of the initial commit. Make more commits to see change comparisons.</p>
          <button @click=${() => this.commitDataManager.loadGitLogManually()} class="manual-refresh-button">
            Refresh Git History
          </button>
        </div>
      `;
    }
    return null;
  }

  renderSelectedCommits() {
    if (!this.fromCommit || !this.toCommit) return '';
    
    const fromCommitObj = this.commits.find(c => c.hash === this.fromCommit);
    const toCommitObj = this.commits.find(c => c.hash === this.toCommit);
    
    return html`
      <div class="selected-commits">
        Comparing: ${fromCommitObj?.hash?.substring(0, 7) || 'Unknown'} → ${toCommitObj?.hash?.substring(0, 7) || 'Unknown'}
        (${this.totalCommitsLoaded} commits loaded)
      </div>
    `;
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading commit history...</div>`;
    }

    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    const emptyState = this.renderEmptyState();
    if (emptyState) return emptyState;
    
    if (!this.fromCommit || !this.toCommit) {
      return html`<div class="error">Missing commit references. Check console for details.</div>`;
    }

    return html`
      <div class="git-history-container">
        <!-- Left Panel -->
        <div 
          class="commit-panel left-panel ${this.leftPanelHovered ? 'expanded' : 'collapsed'}" 
          style="width: ${this.getLeftPanelWidth()}px;"
          @mouseenter=${this.handleLeftPanelMouseEnter}
          @mouseleave=${this.handleLeftPanelMouseLeave}
        >
          <div class="commit-panel-header">
            ${this.leftPanelHovered ? 'From Commit (Older)' : 'From'}
          </div>
          ${this.leftPanelHovered ? html`
            <commit-list
              .commits=${this.commits}
              .selectedCommit=${this.fromCommit}
              .disabledCommits=${this.getDisabledCommitsForFrom()}
              .serverURI=${this.serverURI}
              @commit-select=${this.handleFromCommitSelect}
              @commit-list-scroll=${this.handleCommitListScroll}
            ></commit-list>
          ` : this.renderCollapsedCommitHashes(this.fromCommit, true)}
          ${this.loadingMore ? html`
            <div class="loading-more">
              <div class="loading-more-spinner"></div>
              ${this.leftPanelHovered ? 'Loading more commits...' : '...'}
            </div>
          ` : ''}
        </div>

        <!-- Left Resize Handle -->
        <div 
          class="resize-handle ${this.isDraggingLeft ? 'active' : ''}"
          @mousedown=${this.resizeHandler.handleLeftMouseDown}
        ></div>

        <!-- Center Panel -->
        <div class="center-panel">
          ${this.renderSingleCommitWarning()}
          ${this.renderSelectedCommits()}
          <git-merge-view
            .serverURI=${this.serverURI}
            .fromCommit=${this.fromCommit}
            .toCommit=${this.toCommit}
            .gitHistoryMode=${true}
          ></git-merge-view>
        </div>

        <!-- Right Resize Handle -->
        <div 
          class="resize-handle ${this.isDraggingRight ? 'active' : ''}"
          @mousedown=${this.resizeHandler.handleRightMouseDown}
        ></div>

        <!-- Right Panel -->
        <div 
          class="commit-panel right-panel ${this.rightPanelHovered ? 'expanded' : 'collapsed'}" 
          style="width: ${this.getRightPanelWidth()}px;"
          @mouseenter=${this.handleRightPanelMouseEnter}
          @mouseleave=${this.handleRightPanelMouseLeave}
        >
          <div class="commit-panel-header">
            ${this.rightPanelHovered ? 'To Commit (Newer)' : 'To'}
          </div>
          ${this.rightPanelHovered ? html`
            <commit-list
              .commits=${this.commits}
              .selectedCommit=${this.toCommit}
              .serverURI=${this.serverURI}
              @commit-select=${this.handleToCommitSelect}
              @commit-list-scroll=${this.handleCommitListScroll}
            ></commit-list>
          ` : this.renderCollapsedCommitHashes(this.toCommit, false)}
          ${this.loadingMore ? html`
            <div class="loading-more">
              <div class="loading-more-spinner"></div>
              ${this.rightPanelHovered ? 'Loading more commits...' : '...'}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('git-history-view', GitHistoryView);
