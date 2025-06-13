import {css} from 'lit';

export const containerStyles = css`
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
`;
