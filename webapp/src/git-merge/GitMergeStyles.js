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

      .view-toggle-button, .refresh-button, .raw-status-toggle-button, .save-file-button {
        background: #f1f8ff;
        border: 1px solid #c8e1ff;
        color: #0366d6;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
      }

      .view-toggle-button:hover, .refresh-button:hover, .raw-status-toggle-button:hover, .save-file-button:hover {
        background: #e1f5fe;
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

      .merge-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
      }

      .rebase-mode-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
      }

      .no-changes {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
      }

      .no-changes-message {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 1;
        color: #586069;
        font-style: italic;
        text-align: center;
        padding: 20px;
      }

      .merge-container {
        flex: 1;
        overflow: auto;
        min-height: 0;
        position: relative;
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

      /* Ensure CodeMirror editors can scroll properly */
      .merge-container :global(.cm-editor) {
        height: 100%;
        overflow: auto;
      }

      .merge-container :global(.cm-scroller) {
        overflow: auto;
      }

      /* For merge view specifically */
      .merge-container :global(.cm-merge-view) {
        height: 100%;
        overflow: auto;
      }

      .merge-container :global(.cm-merge-view .cm-editor) {
        height: 100%;
        overflow: auto;
      }

      .loading, .error {
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
