import {css} from 'lit';

export const diffStyles = css`
  /* VS Code-style diff colors - no underlines */
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
`;
