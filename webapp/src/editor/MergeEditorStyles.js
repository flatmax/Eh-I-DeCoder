import {css} from 'lit';

export const mergeEditorStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    position: relative;
  }

  .merge-editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .save-button {
    position: absolute;
    bottom: 24px;
    right: 24px;
    z-index: 10;
    --md-fab-container-color: #1976d2;
    --md-fab-icon-color: white;
    --md-sys-color-primary: #1976d2;
  }

  .merge-header {
    padding: 12px;
    border-bottom: 1px solid #ddd;
    background: #f8f9fa;
    display: grid;
    grid-template-columns: 1fr auto auto 1fr;
    align-items: center;
    gap: 16px;
  }
  
  .header-left { justify-self: start; }
  .header-center { text-align: center; }
  .header-buttons { justify-self: start; display: flex; gap: 8px; }
  .header-right { justify-self: end; }
  
  .view-toggle-button, .nav-button {
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .view-toggle-button {
    padding: 4px 8px;
    font-size: 12px;
    margin-right: 8px;
  }
  
  .nav-button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .view-toggle-button:hover, .nav-button:hover { background: #e0e0e0; }
  .view-toggle-button:active, .nav-button:active { background: #d0d0d0; }
  
  .nav-icon {
    font-size: 12px;
    color: #444;
  }

  .merge-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .label {
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 500;
  }

  .head-label { background: #e3f2fd; color: #1976d2; }
  .working-label { background: #fff3e0; color: #f57c00; }
  .unified-label { background: linear-gradient(to right, #e3f2fd, #fff3e0); color: #333; }
  
  .unsaved-indicator {
    color: #f44336;
    font-weight: bold;
    margin-left: 5px;
  }

  .merge-container {
    flex: 1;
    overflow: auto;
    position: relative;
  }

  .loading, .error, .no-file {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #666;
    font-style: italic;
  }

  .error { color: #d32f2f; }

  .merge-container :global(.cm-merge-view) {
    display: flex !important;
    flex-direction: row !important;
    height: 100%;
    width: 100%;
  }

  .merge-container :global(.cm-merge-view > .cm-editorPane) {
    flex-grow: 1;
    flex-basis: 0;
    overflow: hidden;
    height: 100%;
    position: relative;
  }

  .merge-container :global(.cm-editor) {
    position: relative !important;
    box-sizing: border-box !important;
    display: flex !important;
    flex-direction: column !important;
    height: 100%;
  }

  .merge-container :global(.cm-scroller) {
    flex-grow: 1 !important;
    overflow: auto !important;
    box-sizing: border-box !important;
    position: relative !important;
    outline: none !important;
    font-family: Monaco, Menlo, "Ubuntu Mono", monospace;
  }

  .merge-container :global(.cm-content) {
    box-sizing: border-box !important;
    position: relative !important;
  }

  .merge-container :global(.cm-merge-view .cm-merge-gap) {
    background: #f5f5f5;
    border-left: 1px solid #ddd;
    border-right: 1px solid #ddd;
    position: relative;
  }
  
  .merge-container :global(.cm-merge-view .cm-merge-gap .cm-merge-controls) {
    position: sticky;
    top: 30px;
    padding: 5px;
    background: #f0f0f0;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0 2px;
  }
  
  .merge-container :global(.cm-merge-view .cm-merge-controls button) {
    margin: 2px 0;
    padding: 2px 4px;
    font-size: 11px;
    border: 1px solid #ccc;
    border-radius: 3px;
    background: white;
    cursor: pointer;
  }
  
  .merge-container :global(.cm-merge-view .cm-merge-controls button:hover) {
    background: #e6e6e6;
  }
  
  .merge-container :global(.cm-diff-chunk) { background: rgba(180, 180, 255, 0.1); }
  .merge-container :global(.cm-diff-insert-line) { background: rgba(0, 255, 0, 0.1); border-left: 3px solid rgba(0, 200, 0, 0.8); }
  .merge-container :global(.cm-diff-delete-line) { background: rgba(255, 0, 0, 0.1); border-left: 3px solid rgba(200, 0, 0, 0.8); }
  .merge-container :global(.cm-diff-insert) { background: rgba(0, 255, 0, 0.15); border-radius: 2px; }
  .merge-container :global(.cm-diff-delete) { background: rgba(255, 0, 0, 0.15); border-radius: 2px; }
`;
