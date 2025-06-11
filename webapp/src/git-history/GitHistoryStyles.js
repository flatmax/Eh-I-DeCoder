import { css } from 'lit';

export class GitHistoryStyles {
  static get styles() {
    return css`
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
        transition: width 0.3s ease;
        position: relative;
      }

      .commit-panel.collapsed {
        min-width: 60px;
      }

      .commit-panel.collapsed .commit-panel-header {
        writing-mode: vertical-rl;
        text-orientation: mixed;
        padding: 16px 8px;
        text-align: center;
        font-size: 12px;
      }

      .commit-panel.collapsed commit-list {
        display: none;
      }

      .commit-panel.collapsed .loading-more {
        padding: 8px;
        font-size: 10px;
        writing-mode: vertical-rl;
        text-orientation: mixed;
      }

      .commit-panel.expanded {
        min-width: 200px;
      }

      .commit-panel-header {
        padding: 12px 16px;
        background: #f1f3f4;
        border-bottom: 1px solid #e1e4e8;
        font-weight: 600;
        font-size: 14px;
        color: #24292e;
        text-align: right;
        transition: all 0.3s ease;
        flex-shrink: 0;
      }

      .collapsed-commit-hashes {
        flex: 1;
        overflow-y: auto;
        padding: 8px 4px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .collapsed-hash {
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

      .collapsed-hash:hover {
        background: #f1f8ff;
        border-color: #c8e1ff;
        color: #0366d6;
      }

      .collapsed-hash.active {
        background: #0366d6;
        border-color: #0366d6;
        color: white;
        font-weight: bold;
      }

      .collapsed-hash.active:hover {
        background: #0256cc;
        border-color: #0256cc;
      }

      .left-panel {
        border-right: none;
      }

      .right-panel {
        border-left: none;
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
      
      .loading-more {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        color: #666;
        font-style: italic;
        background: #f5f5f5;
        border-top: 1px solid #e1e4e8;
        transition: all 0.3s ease;
      }
      
      .loading-more-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(0, 0, 0, 0.1);
        border-top: 2px solid #0366d6;
        border-radius: 50%;
        margin-right: 8px;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .notification-banner {
        background-color: #fff3cd;
        color: #856404;
        padding: 8px 16px;
        border: 1px solid #ffeeba;
        margin: 8px 16px;
        border-radius: 4px;
        text-align: center;
        width: calc(100% - 32px);
        box-sizing: border-box;
      }
      
      .notification-banner p {
        margin: 4px 0;
      }
      
      .manual-refresh-button {
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        margin-top: 8px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .manual-refresh-button:hover {
        background-color: #0069d9;
      }
    `;
  }
}
