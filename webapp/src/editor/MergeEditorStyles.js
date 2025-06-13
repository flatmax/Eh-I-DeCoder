import {css} from 'lit';

export const mergeEditorStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    position: relative;
    overflow: hidden;
  }

  .merge-editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: #1e1e1e;
    color: #d4d4d4;
    overflow: hidden;
  }
  
  .save-button {
    position: absolute;
    bottom: 24px;
    right: 24px;
    z-index: 10;
    --md-fab-container-color: #0e639c;
    --md-fab-icon-color: white;
  }

  .merge-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: #2d2d30;
    border-bottom: 1px solid #3e3e42;
    min-height: 40px;
    gap: 16px;
    flex-shrink: 0;
  }
  
  .header-left {
    flex: 1;
  }
  
  .header-center {
    padding: 0 16px;
  }
  
  .header-right {
    flex: 1;
    display: flex;
    justify-content: flex-end;
  }

  .merge-header h3 {
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
  
  .unsaved-indicator {
    color: #ffd700;
    font-weight: bold;
    margin-left: 8px;
  }

  .language-status {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #888;
  }

  .language-status.connected {
    color: #4ec9b0;
  }

  .merge-container {
    flex: 1;
    overflow: hidden;
    position: relative;
    background: #1e1e1e;
    min-height: 0;
  }

  #editor {
    height: 100%;
    width: 100%;
    overflow: hidden;
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

  /* CodeMirror merge view specific styles */
  .cm-merge-view {
    height: 100% !important;
    display: flex !important;
    flex-direction: row !important;
    overflow: hidden !important;
  }

  .cm-merge-a,
  .cm-merge-b {
    flex: 1 !important;
    height: 100% !important;
    overflow: hidden !important;
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
  }

  .cm-merge-gap {
    width: 2% !important;
    min-width: 20px !important;
    background: #2d2d30 !important;
    flex-shrink: 0 !important;
  }

  /* Ensure editors fill their containers */
  .cm-editor {
    height: 100% !important;
    flex: 1 !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }

  .cm-editor.cm-focused {
    outline: none !important;
  }

  /* Force scrollbars to be visible and contained */
  .cm-scroller {
    overflow: auto !important;
    scrollbar-width: thin;
    scrollbar-color: #424242 #1e1e1e;
    height: 100% !important;
    max-height: 100% !important;
  }

  /* VS Code-style diff colors - no underlines */
  .cm-merge-revert {
    background: #0e639c;
    color: white;
    border: none;
    border-radius: 2px;
    padding: 2px 8px;
    margin: 0 4px;
    cursor: pointer;
    font-size: 11px;
  }

  .cm-merge-revert:hover {
    background: #1177bb;
  }

  .cm-deletedChunk {
    background-color: rgba(255, 0, 0, 0.15);
    text-decoration: none !important;
  }

  .cm-deletedLine {
    background-color: rgba(255, 0, 0, 0.2);
    text-decoration: none !important;
  }

  .cm-insertedChunk {
    background-color: rgba(0, 255, 0, 0.15);
    text-decoration: none !important;
  }

  .cm-insertedLine {
    background-color: rgba(0, 255, 0, 0.2);
    text-decoration: none !important;
  }

  .cm-changedChunk {
    background-color: rgba(255, 255, 0, 0.15);
    text-decoration: none !important;
  }

  .cm-changedLine {
    background-color: rgba(255, 255, 0, 0.2);
    text-decoration: none !important;
  }

  /* Gutter styling */
  .cm-gutter-lint {
    width: 8px;
  }

  .cm-diff-gutter-insert {
    background-color: #4ec9b0;
    width: 3px;
    margin-left: 2px;
  }

  .cm-diff-gutter-delete {
    background-color: #f44747;
    width: 3px;
    margin-left: 2px;
  }

  .cm-diff-gutter-change {
    background-color: #ffd700;
    width: 3px;
    margin-left: 2px;
  }

  /* VS Code-style scrollbar with change indicators */
  .cm-scroller::-webkit-scrollbar {
    width: 14px !important;
    height: 14px !important;
    display: block !important;
    visibility: visible !important;
  }

  .cm-scroller::-webkit-scrollbar-track {
    background: #1e1e1e !important;
    visibility: visible !important;
  }

  .cm-scroller::-webkit-scrollbar-thumb {
    background: #424242 !important;
    border: 3px solid #1e1e1e !important;
    border-radius: 7px !important;
    visibility: visible !important;
  }

  .cm-scroller::-webkit-scrollbar-thumb:hover {
    background: #4f4f4f !important;
  }

  .cm-scroller::-webkit-scrollbar-corner {
    background: #1e1e1e !important;
  }

  /* Firefox scrollbar styling */
  @supports (scrollbar-width: thin) {
    .cm-scroller {
      scrollbar-width: thin !important;
      scrollbar-color: #424242 #1e1e1e !important;
    }
  }

  /* Change indicators in scrollbar */
  .cm-merge-a .cm-scroller,
  .cm-merge-b .cm-scroller {
    position: relative;
  }

  /* Scrollbar change indicators overlay */
  .scrollbar-changes {
    position: absolute;
    right: 0;
    top: 0;
    width: 14px;
    height: 100%;
    pointer-events: none;
    z-index: 10;
  }

  .scrollbar-change-marker {
    position: absolute;
    right: 3px;
    width: 8px;
    min-height: 2px;
    border-radius: 1px;
  }

  .scrollbar-change-marker.added {
    background-color: #4ec9b0;
  }

  .scrollbar-change-marker.deleted {
    background-color: #f44747;
  }

  .scrollbar-change-marker.modified {
    background-color: #ffd700;
  }
`;
