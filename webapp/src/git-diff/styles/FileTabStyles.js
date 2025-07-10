import { css } from 'lit';

export const fileTabStyles = css`
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
    display: flex;
    align-items: center;
    gap: 4px;
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

  .file-tab.conflict {
    color: #d73a49;
    background: #fff5f5;
  }

  .file-tab.conflict.active {
    border-bottom-color: #d73a49;
  }

  .file-tab.git-editor.active {
    color: #6f42c1;
    border-bottom-color: #6f42c1;
  }

  .conflict-indicator {
    color: #e36209;
    font-weight: bold;
  }
`;
