import { html } from 'lit';

export class MergeEditorUI {
  static renderHeader(editor) {
    return html`
      <div class="merge-header">
        <div class="header-top">
          <div class="header-left">
            ${editor.currentFile ? html`
              <h3>${editor.currentFile}${editor.hasChanges ? html`<span class="unsaved-indicator">●</span>` : ''}</h3>
            ` : html`
              <h3>No file open</h3>
            `}
            <span class="label head-label">HEAD</span>
          </div>
          <div class="header-center-graph">
            <div class="header-graph">
              <navigation-history-graph
                .currentFile=${editor.currentFile}
              ></navigation-history-graph>
            </div>
          </div>
          <div class="header-right">
            <span class="label working-label">Working Copy</span>
          </div>
        </div>
      </div>
    `;
  }

  static renderContent(editor) {
    return html`
      <div class="merge-container">
        ${editor.isLoading ? html`
          <div class="loading">Loading...</div>
        ` : editor.currentFile ? html`
          <div id="editor"></div>
        ` : html`
          <div class="no-file">Open a file to start editing</div>
        `}
      </div>
    `;
  }

  static renderSaveButton(editor) {
    if (!editor.hasChanges) return '';
    
    return html`
      <md-fab 
        class="save-button"
        @click=${() => editor.fileOperationsManager.saveFile()}
        ?disabled=${editor.isLoading}
      >
        <md-icon slot="icon">save</md-icon>
      </md-fab>
    `;
  }

  static render(editor) {
    return html`
      <div class="merge-editor-container">
        ${this.renderHeader(editor)}
        ${this.renderContent(editor)}
      </div>
      ${this.renderSaveButton(editor)}
    `;
  }
}
