import {css} from 'lit';

export const scrollbarStyles = css`
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
