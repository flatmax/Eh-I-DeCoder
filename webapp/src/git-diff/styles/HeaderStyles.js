import { css } from 'lit';

export const headerStyles = css`
  .git-diff-header {
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

  .read-only-indicator {
    color: #666;
    font-style: italic;
    font-size: 12px;
    margin-left: 8px;
  }

  .rebase-indicator {
    color: #e36209;
    font-weight: 600;
    font-size: 12px;
    margin-left: 8px;
  }

  .git-editor-indicator {
    color: #6f42c1;
    font-weight: 600;
    font-size: 12px;
    margin-left: 8px;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;
