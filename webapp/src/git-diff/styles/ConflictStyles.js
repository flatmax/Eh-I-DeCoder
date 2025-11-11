import { css } from 'lit';

export const conflictStyles = css`
  /* Conflict resolution controls */
  .conflict-controls {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .conflict-info {
    font-weight: 600;
    color: #856404;
  }

  .conflict-buttons {
    display: flex;
    gap: 8px;
  }

  .conflict-resolve-button {
    padding: 6px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }

  .conflict-resolve-button.ours {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .conflict-resolve-button.ours:hover {
    background: #c3e6cb;
  }

  .conflict-resolve-button.theirs {
    background: #cce5ff;
    color: #004085;
    border: 1px solid #b3d7ff;
  }

  .conflict-resolve-button.theirs:hover {
    background: #b3d7ff;
  }

  .conflict-resolve-button.manual {
    background: #e2e3e5;
    color: #383d41;
    border: 1px solid #d6d8db;
  }

  .conflict-resolve-button.manual:hover {
    background: #d6d8db;
  }
`;
