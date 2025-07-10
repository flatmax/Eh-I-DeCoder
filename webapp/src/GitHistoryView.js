import {LitElement, html, css} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {GitHistoryStyles} from './git-history/GitHistoryStyles.js';
import {CommitDataManager} from './git-history/CommitDataManager.js';
import {ResizeHandler} from './git-history/ResizeHandler.js';
import './CommitList.js';
import './GitDiffView.js';

export class GitHistoryView extends JRPCClient {
  static properties = {
    serverURI: { type: String },
    fromCommit: { type: String, state: true },
    toCommit: { type: String, state: true },
    fromBranch: { type: String, state: true },
    toBranch: { type: String, state: true },
    commits: { type: Array, state: true },
    branches: { type: Array, state: true },
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
    rightPanelHovered: { type: Boolean, state: true },
    isConnected: { type: Boolean, state: true },
    leftPanelMode: { type: String, state: true }, // 'commits' or 'branches'
    rightPanelMode: { type: String, state: true } // 'commits' or 'branches'
  };

  constructor() {
    super();
    this.fromCommit = '';
    this.toCommit = '';
    this.fromBranch = '';
    this.toBranch = '';
    this.commits = [];
    this.branches = [];
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
    this.isConnected = false;
    this.leftPanelMode = 'commits';
    this.rightPanelMode = 'commits';

    // Initialize managers
    this.commitDataManager = new CommitDataManager(this);
    this.resizeHandler = new ResizeHandler(this);
  }

  static styles = [
    GitHistoryStyles.styles,
    css`
      .mode-toggle {
        display: flex;
        gap: 4px;
        padding: 8px;
        background: #f8f9fa;
        border-bottom: 1px solid #e1e4e8;
      }

      .mode-toggle button {
        flex: 1;
        padding: 6px 12px;
        border: 1px solid #e1e4e8;
        background: white;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
      }

      .mode-toggle button.active {
        background: #0366d6;
        color: white;
        border-color: #0366d6;
      }

      .mode-toggle button:hover:not(.active) {
        background: #f1f8ff;
      }

      .branch-list {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }

      .branch-item {
        padding: 8px 12px;
        margin: 4px 0;
        background: white;
        border: 1px solid #e1e4e8;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .branch-item:hover {
        background: #f1f8ff;
        border-color: #c8e1ff;
      }

      .branch-item.selected {
        background: #0366d6;
        color: white;
        border-color: #0366d6;
      }

      .branch-item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .branch-item.disabled:hover {
        background: white;
        border-color: #e1e4e8;
      }

      .branch-icon {
        font-size: 14px;
      }

      .branch-name {
        flex: 1;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
      }

      .branch-commit {
        font-size: 10px;
        opacity: 0.7;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      }

      .collapsed-branches {
        flex: 1;
        overflow-y: auto;
        padding: 8px 4px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .collapsed-branch {
        writing-mode: vertical-rl;
        text-orientation: mixed;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 10px;
        padding: 4px 2px;
        background: #ffffff;
        border: 1px solid #e1e4e8;
        border-radius: 3px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
        color: #586069;
        min-height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .collapsed-branch:hover {
        background: #f1f8ff;
        border-color: #c8e1ff;
        color: #0366d6;
      }

      .collapsed-branch.active {
        background: #0366d6;
        border-color: #0366d6;
        color: white;
        font-weight: bold;
      }

      .collapsed-branch.disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
    `
  ];

  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    this.resizeHandler.initialize();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeHandler.cleanup();
  }

  /**
   * Called when JRPC connection is established and ready
   */
  setupDone() {
    console.log('GitHistoryView::setupDone - Connection ready');
    this.isConnected = true;
    super.setupDone?.();
    this.commitDataManager.loadCommits();
    this.loadBranches();
  }
  
  /**
   * Called when remote is up but not yet ready
   */
  remoteIsUp() {
    console.log('GitHistoryView::remoteIsUp - Remote connected');
    if (super.remoteIsUp) super.remoteIsUp();
    // Don't load commits yet - wait for setupDone
  }
  
  /**
   * Called when remote disconnects
   */
  remoteDisconnected() {
    console.log('GitHistoryView::remoteDisconnected');
    this.isConnected = false;
    this.error = 'Connection lost. Waiting for reconnection...';
  }

  async loadBranches() {
    if (!this.isConnected || !this.call) {
      console.warn('Cannot load branches - not connected');
      return;
    }

    try {
      console.log('GitHistoryView: Loading branches...');
      
      // Try different possible method names
      const methodsList = ['Repo.get_branches', 'Git.get_branches', 'Git.branches', 'Repo.list_branches'];
      let methodToCall = null;
      
      for (const method of methodsList) {
        if (this.call[method]) {
          methodToCall = method;
          console.log(`Found git branches method: ${methodToCall}`);
          break;
        }
      }
      
      if (!methodToCall) {
        console.warn('No git branches method found. Branch selection will not be available.');
        return;
      }

      const response = await this.call[methodToCall]();
      const branches = this.extractBranchesFromResponse(response);
      
      console.log(`GitHistoryView: Loaded ${branches.length} branches`);
      this.branches = branches;
      
    } catch (error) {
      console.error('Error loading branches:', error);
      // Don't show error to user - branch selection is optional
    }
  }

  extractBranchesFromResponse(response) {
    if (!response) return [];
    
    // Handle direct array response
    if (Array.isArray(response)) {
      return response;
    }
    
    // Handle wrapped response
    if (typeof response === 'object') {
      const keys = Object.keys(response);
      
      // Check for common property names
      for (const propName of ['branches', 'data', 'results', 'list']) {
        if (response[propName] && Array.isArray(response[propName])) {
          return response[propName];
        }
      }
      
      // Check for UUID-wrapped response
      if (keys.length === 1 && Array.isArray(response[keys[0]])) {
        return response[keys[0]];
      }
    }
    
    return [];
  }

  toggleLeftPanelMode() {
    this.leftPanelMode = this.leftPanelMode === 'commits' ? 'branches' : 'commits';
    this.requestUpdate();
  }

  toggleRightPanelMode() {
    this.rightPanelMode = this.rightPanelMode === 'commits' ? 'branches' : 'commits';
    this.requestUpdate();
  }

  handleCommitListScroll(event) {
    if (!this.isConnected) {
      console.warn('Cannot load more commits - not connected');
      return;
    }
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
    this.fromBranch = ''; // Clear branch selection when commit is selected
    this.requestUpdate();
  }

  handleToCommitSelect(event) {
    const selectedHash = event.detail.commitHash;
    
    // Check if this commit is allowed (not older than the fromCommit)
    if (this.fromCommit && !this.isCommitAllowedForTo(selectedHash)) {
      console.log('Cannot select commit older than the "from" commit');
      return;
    }
    
    this.toCommit = selectedHash;
    this.toBranch = ''; // Clear branch selection when commit is selected
    
    // If the current fromCommit is now newer than the new toCommit, clear it
    if (this.fromCommit && !this.isCommitAllowedForFrom(this.fromCommit)) {
      this.fromCommit = '';
    }
    
    this.requestUpdate();
  }

  async handleFromBranchSelect(branch) {
    if (!branch || !branch.name) return;
    
    // Check if this branch's commit is allowed
    if (this.toCommit && branch.commit && !this.isCommitAllowedForFrom(branch.commit)) {
      console.log('Cannot select branch newer than the "to" commit');
      return;
    }
    
    this.fromBranch = branch.name;
    this.fromCommit = branch.commit || await this.resolveBranchToCommit(branch.name);
    this.requestUpdate();
  }

  async handleToBranchSelect(branch) {
    if (!branch || !branch.name) return;
    
    // Check if this branch's commit is allowed
    if (this.fromCommit && branch.commit && !this.isCommitAllowedForTo(branch.commit)) {
      console.log('Cannot select branch older than the "from" commit');
      return;
    }
    
    this.toBranch = branch.name;
    this.toCommit = branch.commit || await this.resolveBranchToCommit(branch.name);
    
    // If the current fromCommit is now newer than the new toCommit, clear it
    if (this.fromCommit && !this.isCommitAllowedForFrom(this.fromCommit)) {
      this.fromCommit = '';
      this.fromBranch = '';
    }
    
    this.requestUpdate();
  }

  async resolveBranchToCommit(branchName) {
    if (!this.isConnected || !this.call) {
      console.warn('Cannot resolve branch - not connected');
      return null;
    }

    try {
      // Try to find a method to resolve branch to commit
      const methodsList = ['Repo.get_branch_commit', 'Git.rev_parse', 'Repo.resolve_ref'];
      let methodToCall = null;
      
      for (const method of methodsList) {
        if (this.call[method]) {
          methodToCall = method;
          break;
        }
      }
      
      if (!methodToCall) {
        console.warn('No method found to resolve branch to commit');
        return null;
      }

      const response = await this.call[methodToCall](branchName);
      
      // Extract commit hash from response
      if (typeof response === 'string') {
        return response.trim();
      } else if (response && typeof response === 'object') {
        // Check for common property names
        for (const prop of ['commit', 'hash', 'sha', 'oid']) {
          if (response[prop]) {
            return response[prop];
          }
        }
        // Check for UUID-wrapped response
        const keys = Object.keys(response);
        if (keys.length === 1 && typeof response[keys[0]] === 'string') {
          return response[keys[0]].trim();
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error resolving branch to commit:', error);
      return null;
    }
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
   * Check if a commit is allowed to be selected as the "to" commit
   * A commit is allowed if it's newer than or equal to the selected "from" commit
   */
  isCommitAllowedForTo(commitHash) {
    if (!this.fromCommit || !commitHash) return true;
    
    const toIndex = this.commits.findIndex(c => c.hash === commitHash);
    const fromIndex = this.commits.findIndex(c => c.hash === this.fromCommit);
    
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

  /**
   * Get disabled commits for the right panel (to commits)
   */
  getDisabledCommitsForTo() {
    if (!this.fromCommit) return new Set();
    
    const fromIndex = this.commits.findIndex(c => c.hash === this.fromCommit);
    if (fromIndex === -1) return new Set();
    
    const disabledCommits = new Set();
    
    // Disable all commits that are older (have higher index) than the fromCommit
    for (let i = fromIndex + 1; i < this.commits.length; i++) {
      disabledCommits.add(this.commits[i].hash);
    }
    
    return disabledCommits;
  }

  /**
   * Get disabled branches for the left panel
   */
  getDisabledBranchesForFrom() {
    if (!this.toCommit) return new Set();
    
    const disabledBranches = new Set();
    
    for (const branch of this.branches) {
      if (branch.commit && !this.isCommitAllowedForFrom(branch.commit)) {
        disabledBranches.add(branch.name);
      }
    }
    
    return disabledBranches;
  }

  /**
   * Get disabled branches for the right panel
   */
  getDisabledBranchesForTo() {
    if (!this.fromCommit) return new Set();
    
    const disabledBranches = new Set();
    
    for (const branch of this.branches) {
      if (branch.commit && !this.isCommitAllowedForTo(branch.commit)) {
        disabledBranches.add(branch.name);
      }
    }
    
    return disabledBranches;
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
              @click=${isDisabled ? null : () => isLeft ? this.handleFromBranchSelect(branch) : this.handleToBranchSelect(branch)}
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
    if (!this.branches || this.branches.length === 0) return '';
    
    const disabledBranches = isLeft ? this.getDisabledBranchesForFrom() : this.getDisabledBranchesForTo();
    
    return html`
      <div class="collapsed-branches">
        ${this.branches.map(branch => {
          const isDisabled = disabledBranches.has(branch.name);
          const isSelected = selectedBranch === branch.name;
          const disabledMessage = isLeft ? 
            'Cannot select branch newer than "To" selection' : 
            'Cannot select branch older than "From" selection';
          
          return html`
            <div 
              class="collapsed-branch ${isSelected ? 'active' : ''} ${isDisabled ? 'disabled' : ''}"
              @click=${isDisabled ? null : () => isLeft ? this.handleFromBranchSelect(branch) : this.handleToBranchSelect(branch)}
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
    if (!this.commits || this.commits.length === 0) return '';
    
    const disabledCommits = isLeft ? this.getDisabledCommitsForFrom() : this.getDisabledCommitsForTo();
    
    return html`
      <div class="collapsed-commit-hashes">
        ${this.commits.map(commit => {
          const isDisabled = disabledCommits.has(commit.hash);
          const disabledMessage = isLeft ? 
            'Cannot select newer commit than "To" commit' : 
            'Cannot select older commit than "From" commit';
          
          return html`
            <div 
              class="collapsed-hash ${selectedCommit === commit.hash ? 'active' : ''} ${isDisabled ? 'disabled' : ''}"
              @click=${isDisabled ? null : () => isLeft ? this.handleFromCommitSelect({detail: {commitHash: commit.hash}}) : this.handleToCommitSelect({detail: {commitHash: commit.hash}})}
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
          <button @click=${() => this.isConnected ? this.commitDataManager.loadGitLogManually() : null} class="manual-refresh-button" ?disabled=${!this.isConnected}>
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
        Comparing: 
        ${this.fromBranch ? html`<strong>${this.fromBranch}</strong> ` : ''}
        ${fromCommitObj?.hash?.substring(0, 7) || 'Unknown'} 
        → 
        ${this.toBranch ? html`<strong>${this.toBranch}</strong> ` : ''}
        ${toCommitObj?.hash?.substring(0, 7) || 'Unknown'}
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
          ${this.leftPanelHovered && this.branches.length > 0 ? html`
            <div class="mode-toggle">
              <button 
                class="${this.leftPanelMode === 'commits' ? 'active' : ''}"
                @click=${() => this.toggleLeftPanelMode()}
              >
                Commits
              </button>
              <button 
                class="${this.leftPanelMode === 'branches' ? 'active' : ''}"
                @click=${() => this.toggleLeftPanelMode()}
              >
                Branches
              </button>
            </div>
          ` : ''}
          ${this.leftPanelHovered ? (
            this.leftPanelMode === 'branches' ? 
              this.renderBranchList(this.branches, this.fromBranch, this.getDisabledBranchesForFrom(), true) :
              html`
                <commit-list
                  .commits=${this.commits}
                  .selectedCommit=${this.fromCommit}
                  .disabledCommits=${this.getDisabledCommitsForFrom()}
                  .serverURI=${this.serverURI}
                  @commit-select=${this.handleFromCommitSelect}
                  @commit-list-scroll=${this.handleCommitListScroll}
                ></commit-list>
              `
          ) : (
            this.leftPanelMode === 'branches' && this.branches.length > 0 ? 
              this.renderCollapsedBranches(this.fromBranch, true) :
              this.renderCollapsedCommitHashes(this.fromCommit, true)
          )}
          ${this.loadingMore && this.leftPanelMode === 'commits' ? html`
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
          <git-diff-view
            .serverURI=${this.serverURI}
            .fromCommit=${this.fromCommit}
            .toCommit=${this.toCommit}
            .gitHistoryMode=${true}
          ></git-diff-view>
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
          ${this.rightPanelHovered && this.branches.length > 0 ? html`
            <div class="mode-toggle">
              <button 
                class="${this.rightPanelMode === 'commits' ? 'active' : ''}"
                @click=${() => this.toggleRightPanelMode()}
              >
                Commits
              </button>
              <button 
                class="${this.rightPanelMode === 'branches' ? 'active' : ''}"
                @click=${() => this.toggleRightPanelMode()}
              >
                Branches
              </button>
            </div>
          ` : ''}
          ${this.rightPanelHovered ? (
            this.rightPanelMode === 'branches' ? 
              this.renderBranchList(this.branches, this.toBranch, this.getDisabledBranchesForTo(), false) :
              html`
                <commit-list
                  .commits=${this.commits}
                  .selectedCommit=${this.toCommit}
                  .disabledCommits=${this.getDisabledCommitsForTo()}
                  .serverURI=${this.serverURI}
                  @commit-select=${this.handleToCommitSelect}
                  @commit-list-scroll=${this.handleCommitListScroll}
                ></commit-list>
              `
          ) : (
            this.rightPanelMode === 'branches' && this.branches.length > 0 ? 
              this.renderCollapsedBranches(this.toBranch, false) :
              this.renderCollapsedCommitHashes(this.toCommit, false)
          )}
          ${this.loadingMore && this.rightPanelMode === 'commits' ? html`
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
