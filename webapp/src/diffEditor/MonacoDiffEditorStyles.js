import { css } from 'lit';

export class MonacoDiffEditorStyles {
  static get styles() {
    return css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }

      #diff-editor-container {
        width: 100%;
        height: 100%;
      }

      /* Monaco diff editor styling */
      .monaco-diff-editor .line-insert {
        background-color: rgba(155, 185, 85, 0.2);
      }

      .monaco-diff-editor .line-delete {
        background-color: rgba(255, 97, 136, 0.2);
      }

      .monaco-diff-editor .char-insert {
        background-color: rgba(155, 185, 85, 0.4);
      }

      .monaco-diff-editor .char-delete {
        background-color: rgba(255, 97, 136, 0.4);
      }

      /* Scrollbar styling */
      .monaco-scrollable-element > .scrollbar > .slider {
        background: rgba(121, 121, 121, 0.4);
      }

      .monaco-scrollable-element > .scrollbar > .slider:hover {
        background: rgba(100, 100, 100, 0.7);
      }

      /* Line numbers */
      .monaco-editor .margin-view-overlays .line-numbers {
        color: #858585;
      }

      /* Active line highlighting */
      .monaco-editor .view-overlays .current-line {
        background-color: rgba(255, 255, 255, 0.04);
      }

      /* Selection highlighting */
      .monaco-editor .selected-text {
        background-color: #264f78;
      }

      /* Revert icon styling */
      .monaco-diff-editor .editor-revert-button {
        cursor: pointer;
        opacity: 0.7;
      }

      .monaco-diff-editor .editor-revert-button:hover {
        opacity: 1;
        background-color: rgba(255, 255, 255, 0.1);
      }

      /* Inline diff decorations */
      .monaco-diff-editor .inline-deleted-margin-view-zone,
      .monaco-diff-editor .inline-added-margin-view-zone {
        margin-left: 3px;
      }
    `;
  }
}
