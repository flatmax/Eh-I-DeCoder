import {LitElement, html, css} from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import './CommitList.js';
import './GitMergeView.js';

export class GitHistoryView extends JRPCClient {
  static properties = {
    serverURI: { type: String },
    fromCommit: { type: String, state: true },
    toCommit: { type: String, state: true },
    commits: { type: Array, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true },
    leftPanelWidth: { type: Number, state: true },
    rightPanelWidth: { type: Number, state: true },
    isDraggingLeft: { type: Boolean, state: true },
    isDraggingRight: { type: Boolean, state: true }
  };

  constructor() {
    super();
    this.fromCommit = '';
    this.toCommit = '';
    this.commits = [];
    this.loading = false;
    this.error = null;
    this.leftPanelWidth = 300;
    this.rightPanelWidth = 300;
    this.isDraggingLeft = false;
    this.isDraggingRight = false;

    // Bind methods
    this.handleFromCommitSelect = this.handleFromCommitSelect.bind(this);
    this.handleToCommitSelect = this.handleToCommitSelect.bind(this);
    this.handleLeftMouseDown = this.handleLeftMouseDown.bind(this);
    this.handleRightMouseDown = this.handleRightMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  static styles = css`
    :host {
      display: flex;
      height: 100vh;
      overflow: hidden;
      font-family: sans-serif;
    }

    .git-history-container {
      display: flex;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    .commit-panel {
      display: flex;
      flex-direction: column;
      background: #f8f9fa;
      border: 1px solid #e1e4e8;
      overflow: hidden;
    }

    .commit-panel-header {
      padding: 12px 16px;
      background: #f1f3f4;
      border-bottom: 1px solid #e1e4e8;
      font-weight: 600;
      font-size: 14px;
      color: #24292e;
      text-align: right;
    }

    .left-panel {
      min-width: 200px;
    }

    .right-panel {
      min-width: 200px;
    }

    .center-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 400px;
      overflow: hidden;
    }

    .resize-handle {
      width: 5px;
      background-color: #ddd;
      cursor: col-resize;
      transition: background-color 0.2s;
      z-index: 10;
      flex-shrink: 0;
    }

    .resize-handle:hover,
    .resize-handle.active {
      background-color: #2196F3;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #666;
      font-style: italic;
    }

    .error {
      padding: 16px;
      background: #fff5f5;
      border: 1px solid #fed7d7;
      border-radius: 4px;
      color: #c53030;
      margin: 16px;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #666;
      text-align: center;
      padding: 20px;
      font-style: italic;
    }

    .selected-commits {
      padding: 8px 16px;
      background: #e8f4fd;
      border-bottom: 1px solid #b8daff;
      font-size: 12px;
      color: #0366d6;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    // Add global mouse event listeners for resize
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  // Override setupDone to load commits when JRPC connection is ready
  setupDone() {
    super.setupDone?.();
    console.log('GitHistoryView: JRPC connection ready, loading commits');
    this.loadCommits();
  }

  async loadCommits() {
    // Check if JRPC connection is ready
    if (!this.call || !this.call['Repo.get_commit_history']) {
      console.log('GitHistoryView: JRPC not ready yet, will retry when connection is established');
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      console.log('GitHistoryView: Calling Repo.get_commit_history');
      // Get commit history from backend
      const response = await this.call['Repo.get_commit_history']();
      console.log('GitHistoryView: Received response:', response);
      
      this.commits = this.extractCommitsFromResponse(response);
      
      // Set initial commits if we have any
      if (this.commits.length > 0) {
        this.toCommit = this.commits[0].hash; // HEAD
        this.fromCommit = this.commits.length > 1 ? this.commits[1].hash : this.commits[0].hash;
      }
      
    } catch (error) {
      console.error('Error loading commits:', error);
      this.error = `Failed to load commit history: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  extractCommitsFromResponse(response) {
    // Handle different response formats
    if (!response) return [];
    
    if (Array.isArray(response)) {
      return response;
    }
    
    // Handle UUID-wrapped responses
    if (typeof response === 'object') {
      const keys = Object.keys(response);
      if (keys.length === 1 && Array.isArray(response[keys[0]])) {
        return response[keys[0]];
      }
    }
    
    return [];
  }

  handleFromCommitSelect(event) {
    this.fromCommit = event.detail.commitHash;
    this.requestUpdate();
  }

  handleToCommitSelect(event) {
    this.toCommit = event.detail.commitHash;
    this.requestUpdate();
  }

  handleLeftMouseDown(event) {
    if (event.button !== 0) return;
    this.isDraggingLeft = true;
    event.preventDefault();
  }

  handleRightMouseDown(event) {
    if (event.button !== 0) return;
    this.isDraggingRight = true;
    event.preventDefault();
  }

  handleMouseMove(event) {
    if (!this.isDraggingLeft && !this.isDraggingRight) return;

    const containerRect = this.getBoundingClientRect();
    
    if (this.isDraggingLeft) {
      const newWidth = Math.max(200, Math.min(600, event.clientX - containerRect.left));
      this.leftPanelWidth = newWidth;
    }
    
    if (this.isDraggingRight) {
      const newWidth = Math.max(200, Math.min(600, containerRect.right - event.clientX));
      this.rightPanelWidth = newWidth;
    }
    
    this.requestUpdate();
  }

  handleMouseUp() {
    this.isDraggingLeft = false;
    this.isDraggingRight = false;
    this.requestUpdate();
  }

  renderEmptyState() {
    if (this.commits.length === 0) {
      return html`<div class="empty-state">No commits found in this repository.<br>Make your first commit to see history.</div>`;
    }
    
    if (this.commits.length === 1) {
      return html`<div class="empty-state">Only one commit available.<br>Make more commits to compare changes.</div>`;
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
    if (emptyState) {
      return emptyState;
    }

    return html`
      <div class="git-history-container">
        <!-- Left Panel: From Commits -->
        <div class="commit-panel left-panel" style="width: ${this.leftPanelWidth}px;">
          <div class="commit-panel-header">From Commit (Older)</div>
          <commit-list
            .commits=${this.commits}
            .selectedCommit=${this.fromCommit}
            .serverURI=${this.serverURI}
            @commit-select=${this.handleFromCommitSelect}
          ></commit-list>
        </div>

        <!-- Left Resize Handle -->
        <div 
          class="resize-handle ${this.isDraggingLeft ? 'active' : ''}"
          @mousedown=${this.handleLeftMouseDown}
        ></div>

        <!-- Center Panel: Git Merge View -->
        <div class="center-panel">
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
          @mousedown=${this.handleRightMouseDown}
        ></div>

        <!-- Right Panel: To Commits -->
        <div class="commit-panel right-panel" style="width: ${this.rightPanelWidth}px;">
          <div class="commit-panel-header">To Commit (Newer)</div>
          <commit-list
            .commits=${this.commits}
            .selectedCommit=${this.toCommit}
            .serverURI=${this.serverURI}
            @commit-select=${this.handleToCommitSelect}
          ></commit-list>
        </div>
      </div>
    `;
  }
}

customElements.define('git-history-view', GitHistoryView);
