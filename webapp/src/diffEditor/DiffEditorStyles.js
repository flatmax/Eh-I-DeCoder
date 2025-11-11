import { css } from 'lit';

export class DiffEditorStyles {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
      }

      .diff-editor-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        background: #1e1e1e;
        color: #d4d4d4;
        overflow: hidden;
      }

      .diff-header-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: #2d2d30;
        border-bottom: 1px solid #3e3e42;
        flex-shrink: 0;
        gap: 16px;
        min-height: 60px;
      }

      .diff-header-left {
        flex: 0 1 auto;
        min-width: 150px;
        max-width: 300px;
        overflow: hidden;
      }

      .diff-header-center {
        flex: 1 1 auto;
        overflow: hidden;
        min-width: 0;
      }

      .diff-header-right {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .diff-header-left h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #cccccc;
        font-family: monospace;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .file-path-container {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .file-path-container.right-file {
        text-align: right;
      }

      .file-directory {
        font-size: 11px;
        color: #969696;
        font-family: monospace;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .file-name {
        font-size: 14px;
        font-weight: 600;
        color: #cccccc;
        font-family: monospace;
        white-space: nowrap;
        overflow: visible;
        max-width: 100%;
      }

      .label {
        padding: 4px 12px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
      }

      .head-label { 
        background: none;
        border: none;
        color: #4ec9b0;
        padding: 0;
        margin-top: 4px;
        font-size: 11px;
        font-weight: normal;
        opacity: 0.8;
      }
      
      .working-label { 
        background: rgba(255, 215, 0, 0.2);
        color: #ffd700;
      }

      .save-indicator {
        background: rgba(0, 255, 0, 0.2);
        color: #00ff00;
        animation: pulse 0.5s ease-in-out;
      }

      @keyframes pulse {
        0% { opacity: 0.5; }
        50% { opacity: 1; }
        100% { opacity: 0.5; }
      }

      .comparison-mode-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 8px 16px;
        background: rgba(100, 100, 255, 0.1);
        border-radius: 4px;
      }

      .comparison-mode-indicator span {
        color: #6464ff;
        font-weight: 600;
        font-size: 13px;
      }

      .exit-comparison-btn {
        padding: 4px 12px;
        background: rgba(255, 100, 100, 0.2);
        color: #ff6464;
        border: 1px solid #ff6464;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s;
      }

      .exit-comparison-btn:hover {
        background: rgba(255, 100, 100, 0.3);
      }

      navigation-history-graph {
        height: 60px;
        width: 100%;
      }

      .diff-content {
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .loading, .error, .no-file {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #666;
        font-style: italic;
      }

      .error { color: #f44336; }

      monaco-diff-editor {
        width: 100%;
        height: 100%;
      }
    `;
  }
}
