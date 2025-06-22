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

      .diff-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 16px;
        background: #2d2d30;
        border-bottom: 1px solid #3e3e42;
        flex-shrink: 0;
      }

      .diff-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #cccccc;
        font-family: monospace;
      }

      .label {
        padding: 4px 12px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: 500;
      }

      .head-label { 
        background: rgba(78, 201, 176, 0.2);
        color: #4ec9b0;
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

      navigation-history-graph {
        flex-shrink: 0;
        border-bottom: 1px solid #3e3e42;
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
