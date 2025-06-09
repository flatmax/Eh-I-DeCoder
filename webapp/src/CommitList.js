import {LitElement, html, css} from 'lit';
import {classMap} from 'lit/directives/class-map.js';

export class CommitList extends LitElement {
  static properties = {
    commits: { type: Array },
    selectedCommit: { type: String },
    serverURI: { type: String },
    expandedCommits: { type: Set, state: true }
  };

  constructor() {
    super();
    this.commits = [];
    this.selectedCommit = '';
    this.expandedCommits = new Set();
    
    // Bind scroll handler
    this.handleScroll = this.handleScroll.bind(this);
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .commit-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .commit-item {
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      margin-bottom: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .commit-item:hover {
      border-color: #0366d6;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .commit-item.selected {
      border-color: #0366d6;
      background: #f1f8ff;
      box-shadow: 0 0 0 2px rgba(3, 102, 214, 0.2);
    }

    .commit-header {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .commit-hash {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 12px;
      color: #0366d6;
      font-weight: 600;
    }

    .commit-message {
      font-size: 14px;
      color: #24292e;
      font-weight: 500;
      line-height: 1.3;
      margin: 2px 0;
    }

    .commit-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #586069;
      margin-top: 4px;
    }

    .commit-author {
      font-weight: 500;
    }

    .commit-date {
      font-style: italic;
    }

    .commit-branch {
      background: #f1f8ff;
      color: #0366d6;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      border: 1px solid #c8e1ff;
    }

    .commit-details {
      border-top: 1px solid #e1e4e8;
      padding: 12px;
      background: #f8f9fa;
      font-size: 12px;
      color: #586069;
    }

    .commit-details-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .commit-details-row:last-child {
      margin-bottom: 0;
    }

    .expand-toggle {
      background: none;
      border: none;
      color: #0366d6;
      cursor: pointer;
      font-size: 12px;
      padding: 2px 4px;
      border-radius: 3px;
      margin-left: 8px;
    }

    .expand-toggle:hover {
      background: #f1f8ff;
    }

    .no-commits {
      padding: 20px;
      text-align: center;
      color: #586069;
      font-style: italic;
    }
  `;

  firstUpdated() {
    super.firstUpdated?.();
    this.setupScrollListener();
  }

  setupScrollListener() {
    const commitListContainer = this.shadowRoot.querySelector('.commit-list');
    if (commitListContainer) {
      commitListContainer.addEventListener('scroll', this.handleScroll);
    }
  }

  handleScroll(event) {
    // Dispatch a custom scroll event that bubbles up to the parent GitHistoryView
    this.dispatchEvent(new CustomEvent('commit-list-scroll', {
      detail: {
        scrollTop: event.target.scrollTop,
        scrollHeight: event.target.scrollHeight,
        clientHeight: event.target.clientHeight,
        distanceFromBottom: event.target.scrollHeight - event.target.scrollTop - event.target.clientHeight
      },
      bubbles: true,
      composed: true
    }));
  }

  handleCommitClick(commit) {
    this.dispatchEvent(new CustomEvent('commit-select', {
      detail: { commitHash: commit.hash }
    }));
  }

  toggleCommitDetails(commit, event) {
    event.stopPropagation();
    
    if (this.expandedCommits.has(commit.hash)) {
      this.expandedCommits.delete(commit.hash);
    } else {
      this.expandedCommits.add(commit.hash);
    }
    
    this.requestUpdate();
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (error) {
      return dateString;
    }
  }

  formatCommitMessage(message) {
    if (!message) return 'No commit message';
    
    // Truncate long commit messages for the summary view
    const maxLength = 60;
    if (message.length > maxLength) {
      return message.substring(0, maxLength) + '...';
    }
    return message;
  }

  renderCommitItem(commit) {
    const isSelected = this.selectedCommit === commit.hash;
    const isExpanded = this.expandedCommits.has(commit.hash);
    
    return html`
      <div 
        class=${classMap({
          'commit-item': true,
          'selected': isSelected
        })}
        @click=${() => this.handleCommitClick(commit)}
      >
        <div class="commit-header">
          <div class="commit-hash">
            ${commit.hash?.substring(0, 8) || 'Unknown'}
            <button 
              class="expand-toggle"
              @click=${(e) => this.toggleCommitDetails(commit, e)}
            >
              ${isExpanded ? '▼' : '▶'}
            </button>
          </div>
          
          <div class="commit-message">
            ${this.formatCommitMessage(commit.message)}
          </div>
          
          <div class="commit-meta">
            <span class="commit-author">${commit.author || 'Unknown'}</span>
            ${commit.branch ? html`<span class="commit-branch">${commit.branch}</span>` : ''}
          </div>
          
          <div class="commit-date">
            ${this.formatDate(commit.date)}
          </div>
        </div>
        
        ${isExpanded ? html`
          <div class="commit-details">
            <div class="commit-details-row">
              <strong>Full Hash:</strong>
              <span>${commit.hash || 'Unknown'}</span>
            </div>
            <div class="commit-details-row">
              <strong>Author:</strong>
              <span>${commit.author || 'Unknown'}</span>
            </div>
            <div class="commit-details-row">
              <strong>Date:</strong>
              <span>${this.formatDate(commit.date)}</span>
            </div>
            ${commit.branch ? html`
              <div class="commit-details-row">
                <strong>Branch:</strong>
                <span>${commit.branch}</span>
              </div>
            ` : ''}
            <div class="commit-details-row">
              <strong>Message:</strong>
              <span>${commit.message || 'No commit message'}</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  render() {
    if (!this.commits || this.commits.length === 0) {
      return html`<div class="no-commits">No commits available</div>`;
    }

    return html`
      <div class="commit-list">
        ${this.commits.map(commit => this.renderCommitItem(commit))}
      </div>
    `;
  }
}

customElements.define('commit-list', CommitList);
