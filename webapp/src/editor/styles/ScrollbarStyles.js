import {css} from 'lit';

export const scrollbarStyles = css`
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
    background-color: #2d883b;
  }

  .scrollbar-change-marker.deleted {
    background-color: #f44747;
  }

  .scrollbar-change-marker.modified {
    background-color: #ffd700;
  }
`;
