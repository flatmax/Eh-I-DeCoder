import {css} from 'lit';

export const codeMirrorStyles = css`
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

  /* VS Code-style merge controls */
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
`;
