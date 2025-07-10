import {LitElement, html, css} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import {GitHistoryStyles} from './git-history/GitHistoryStyles.js';
import {CommitDataManager} from './git-history/CommitDataManager.js';
import {ResizeHandler} from './git-history/ResizeHandler.js';
import {BranchManager} from './git-history/BranchManager.js';
import {SelectionValidator} from './git-history/SelectionValidator.js';
import {PanelRenderer} from './git-history/PanelRenderer.js';
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
    this.branchManager = new BranchManager(this);
    this.selectionValidator = new SelectionValidator(this);
    this.panelRenderer = new PanelRenderer(this);
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
    this.branchManager.loadBranches();
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
    if (this.toCommit && !this.selectionValidator.isCommitAllowedForFrom(selectedHash)) {
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
    if (this.fromCommit && !this.selectionValidator.isCommitAllowedForTo(selectedHash)) {
      console.log('Cannot select commit older than the "from" commit');
      return;
    }
    
    this.toCommit = selectedHash;
    this.toBranch = ''; // Clear branch selection when commit is selected
    
    // If the current fromCommit is now newer than the new toCommit, clear it
    if (this.fromCommit && !this.selectionValidator.isCommitAllowedForFrom(this.fromCommit)) {
      this.fromCommit = '';
    }
    
    this.requestUpdate();
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

  render() {
    if (this.loading) {
      return html`<div class="loading">Loading commit history...</div>`;
    }

    if (this.error) {
      return html`<div class="error">${this.error}</div>`;
    }

    const emptyState = this.panelRenderer.renderEmptyState();
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
              this.panelRenderer.renderBranchList(this.branches, this.fromBranch, this.branchManager.getDisabledBranchesForFrom(), true) :
              html`
                <commit-list
                  .commits=${this.commits}
                  .selectedCommit=${this.fromCommit}
                  .disabledCommits=${this.selectionValidator.getDisabledCommitsForFrom()}
                  .serverURI=${this.serverURI}
                  @commit-select=${this.handleFromCommitSelect}
                  @commit-list-scroll=${this.handleCommitListScroll}
                ></commit-list>
              `
          ) : (
            this.leftPanelMode === 'branches' && this.branches.length > 0 ? 
              this.panelRenderer.renderCollapsedBranches(this.fromBranch, true) :
              this.panelRenderer.renderCollapsedCommitHashes(this.fromCommit, true)
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
          ${this.panelRenderer.renderSingleCommitWarning()}
          ${this.panelRenderer.renderSelectedCommits()}
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
              this.panelRenderer.renderBranchList(this.branches, this.toBranch, this.branchManager.getDisabledBranchesForTo(), false) :
              html`
                <commit-list
                  .commits=${this.commits}
                  .selectedCommit=${this.toCommit}
                  .disabledCommits=${this.selectionValidator.getDisabledCommitsForTo()}
                  .serverURI=${this.serverURI}
                  @commit-select=${this.handleToCommitSelect}
                  @commit-list-scroll=${this.handleCommitListScroll}
                ></commit-list>
              `
          ) : (
            this.rightPanelMode === 'branches' && this.branches.length > 0 ? 
              this.panelRenderer.renderCollapsedBranches(this.toBranch, false) :
              this.panelRenderer.renderCollapsedCommitHashes(this.toCommit, false)
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
