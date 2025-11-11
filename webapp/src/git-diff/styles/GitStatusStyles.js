import { css } from 'lit';

export const gitStatusStyles = css`
  /* Raw Git Status Styles */
  .raw-git-status-container {
    background: #f8f9fa;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    margin: 12px 16px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .raw-git-status-header {
    background: #e9ecef;
    padding: 8px 12px;
    border-bottom: 1px solid #e1e4e8;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .raw-git-status-title {
    font-weight: 600;
    color: #24292e;
    font-size: 13px;
  }

  .raw-git-status-controls {
    display: flex;
    gap: 6px;
  }

  .raw-git-status-refresh, .raw-git-status-close {
    background: #6c757d;
    color: white;
    border: none;
    padding: 3px 6px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
  }

  .raw-git-status-refresh:hover, .raw-git-status-close:hover {
    background: #5a6268;
  }

  .raw-git-status-content {
    padding: 12px;
    background: #ffffff;
    max-height: 300px;
    overflow-y: auto;
    border-radius: 0 0 6px 6px;
  }

  .raw-git-status-content pre {
    margin: 0;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 12px;
    line-height: 1.4;
    color: #24292e;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  /* Git status panel styles */
  .git-status-panel {
    background: #f8f9fa;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    padding: 12px 16px;
    margin: 0 0 12px 0;
    flex-shrink: 0;
  }

  .git-status-panel h4 {
    margin: 0 0 12px 0;
    color: #24292e;
    font-size: 14px;
    font-weight: 600;
  }

  .git-status-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .status-section {
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 4px;
    padding: 8px 12px;
  }

  .status-section h5 {
    margin: 0 0 8px 0;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-section.staged h5 {
    color: #28a745;
  }

  .status-section.modified h5 {
    color: #e36209;
  }

  .status-section.untracked h5 {
    color: #6f42c1;
  }

  .status-section ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .status-section li {
    padding: 2px 0;
    font-size: 12px;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }

  .staged-file {
    color: #28a745;
  }

  .modified-file {
    color: #e36209;
  }

  .untracked-file {
    color: #6f42c1;
  }

  /* Git editor help styles */
  .git-editor-help {
    background: #f8f4ff;
    border: 1px solid #e1d5ff;
    padding: 12px 16px;
    margin: 0 0 12px 0;
    flex-shrink: 0;
  }

  .git-editor-help h4 {
    margin: 0 0 8px 0;
    color: #6f42c1;
    font-size: 14px;
  }

  .git-editor-help p {
    margin: 4px 0;
    color: #6a737d;
    font-size: 12px;
  }
`;
