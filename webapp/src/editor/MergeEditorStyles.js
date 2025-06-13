import {css} from 'lit';
import {headerStyles} from './styles/HeaderStyles.js';
import {containerStyles} from './styles/ContainerStyles.js';
import {codeMirrorStyles} from './styles/CodeMirrorStyles.js';
import {diffStyles} from './styles/DiffStyles.js';
import {scrollbarStyles} from './styles/ScrollbarStyles.js';

export const mergeEditorStyles = [
  css`
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

    .loading, .error, .no-file {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      font-style: italic;
    }

    .error { color: #f44336; }
  `,
  headerStyles,
  containerStyles,
  codeMirrorStyles,
  diffStyles,
  scrollbarStyles
];
