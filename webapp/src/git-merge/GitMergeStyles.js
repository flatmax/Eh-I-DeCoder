import { css } from 'lit';

export class GitMergeStyles {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
      }

      .git-merge-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #e1e4e8;
        flex-shrink: 0;
      }

      .commit-info {
        display: flex;
        align-items: center;
        gap: 16px;
        font-size: 12px;
        color: #586069;
      }

      .commit-hash {
        font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        background: #f1f8ff;
        padding: 2px 6px;
        border-radius: 3px;
        color: #0366d6;
        font-weight: 600;
      }

      .header-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .view-toggle-button {
        background: #f1f8ff;
        border: 1px solid #c8e1ff;
        color: #0366d6;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
      }

      .view-toggle-button:hover {
        background: #e1f5fe;
      }

      .file-tabs {
        display: flex;
        overflow-x: auto;
        background: #f6f8fa;
        border-bottom: 1px solid #e1e4e8;
        flex-shrink: 0;
      }

      .file-tab {
        padding: 8px 16px;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 12px;
        color: #586069;
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        transition: all 0.2s ease;
      }

      .file-tab:hover {
        background: #f1f3f4;
        color: #24292e;
      }

      .file-tab.active {
        color: #0366d6;
        border-bottom-color: #0366d6;
        background: white;
      }

      .merge-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .merge-container {
        flex: 1;
        overflow: hidden;
      }

      .loading, .error, .no-changes {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: #586069;
        font-style: italic;
        text-align: center;
        padding: 20px;
      }

      .error {
        color: #d73a49;
        background: #fff5f5;
        border: 1px solid #fed7d7;
        border-radius: 4px;
        margin: 16px;
      }

      .nav-button {
        background: #f1f8ff;
        border: 1px solid #c8e1ff;
        color: #0366d6;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .nav-button:hover {
        background: #e1f5fe;
      }

      .nav-icon {
        font-size: 10px;
      }
    `;
  }
}
