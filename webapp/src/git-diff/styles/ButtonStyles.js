import { css } from 'lit';

export const buttonStyles = css`
  .view-toggle-button, .refresh-button, .raw-status-toggle-button, .save-file-button, .add-all-files-button {
    background: #f1f8ff;
    border: 1px solid #c8e1ff;
    color: #0366d6;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .view-toggle-button:hover, .refresh-button:hover, .raw-status-toggle-button:hover, .save-file-button:hover, .add-all-files-button:hover {
    background: #e1f5fe;
  }

  .add-all-files-button {
    background: #28a745;
    color: white;
    border: 1px solid #1e7e34;
  }

  .add-all-files-button:hover {
    background: #218838;
  }

  .add-all-files-button:disabled {
    background: #6c757d;
    border-color: #6c757d;
    cursor: not-allowed;
    opacity: 0.65;
  }

  .raw-status-toggle-button.active {
    background: #0366d6;
    color: white;
  }

  .raw-status-toggle-button.active:hover {
    background: #0256cc;
  }

  .refresh-button {
    padding: 4px 6px;
    font-size: 14px;
  }

  .save-file-button {
    background: #28a745;
    color: white;
    border: 1px solid #1e7e34;
  }

  .save-file-button:hover {
    background: #218838;
  }

  .rebase-button {
    background: #28a745;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    margin-right: 8px;
  }

  .rebase-button:hover {
    background: #218838;
  }

  .execute-button {
    background: #007bff;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    margin-right: 8px;
  }

  .execute-button:hover {
    background: #0056b3;
  }

  .save-git-editor-button {
    background: #6f42c1;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    margin-right: 8px;
  }

  .save-git-editor-button:hover {
    background: #5a32a3;
  }

  .cancel-button, .abort-button {
    background: #dc3545;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    margin-right: 8px;
  }

  .cancel-button:hover, .abort-button:hover {
    background: #c82333;
  }

  .continue-button, .commit-button, .commit-amend-button {
    background: #28a745;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    margin-right: 8px;
  }

  .continue-button:hover, .commit-button:hover, .commit-amend-button:hover {
    background: #218838;
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
