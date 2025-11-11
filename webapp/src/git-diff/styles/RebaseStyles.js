import { css } from 'lit';

export const rebaseStyles = css`
  /* Rebase plan styles */
  .rebase-plan {
    padding: 16px;
    background: #f8f9fa;
    flex: 1;
    overflow-y: auto;
  }

  .rebase-plan-header {
    margin-bottom: 16px;
  }

  .rebase-plan-header h3 {
    margin: 0 0 8px 0;
    color: #24292e;
  }

  .rebase-plan-header p {
    margin: 0;
    color: #586069;
    font-size: 14px;
  }

  .rebase-commits {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rebase-commit {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: white;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    cursor: move;
    transition: all 0.2s ease;
  }

  .rebase-commit:hover {
    border-color: #c8e1ff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .rebase-commit:active {
    transform: scale(0.98);
  }

  .rebase-action {
    padding: 4px 8px;
    border: 1px solid #d1d5da;
    border-radius: 4px;
    font-size: 12px;
    min-width: 80px;
  }

  .rebase-action option[value="pick"] {
    color: #28a745;
  }

  .rebase-action option[value="drop"] {
    color: #dc3545;
  }

  .rebase-action option[value="squash"] {
    color: #ffc107;
  }

  .rebase-action option[value="edit"] {
    color: #17a2b8;
  }

  .commit-message {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #d1d5da;
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
  }

  .commit-message:focus {
    outline: none;
    border-color: #0366d6;
    box-shadow: 0 0 0 2px rgba(3, 102, 214, 0.2);
  }

  /* Rebase completion styles */
  .rebase-completing {
    padding: 16px;
    background: #f8f9fa;
    flex: 1;
    overflow-y: auto;
  }

  .rebase-completing h3 {
    margin: 0 0 16px 0;
    color: #24292e;
  }

  .rebase-completing p {
    margin: 8px 0;
    color: #586069;
  }

  .rebase-completing ul {
    margin: 16px 0;
    padding-left: 20px;
    color: #586069;
  }

  .rebase-completing li {
    margin: 4px 0;
  }

  .rebase-message {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    padding: 12px;
    margin: 12px 0;
  }

  .rebase-message h4 {
    margin: 0 0 8px 0;
    color: #856404;
  }

  .rebase-message p {
    margin: 0;
    color: #856404;
  }

  .rebase-error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    padding: 8px;
    margin: 8px 0 0 0;
  }

  .rebase-error strong {
    color: #721c24;
  }

  .rebase-error pre {
    margin: 4px 0 0 0;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 12px;
    color: #721c24;
    white-space: pre-wrap;
  }
`;
