/**
 * CommandsTab component for the new tab containing command buttons and settings
 */
import {LitElement, html, css} from 'lit';
import './CommandsButtons.js';

export class CommandsTab extends LitElement {
  static properties = {
    serverURI: { type: String }
  };
  
  constructor() {
    super();
    this.serverURI = "ws://0.0.0.0:9000";
  }

  static styles = css`
    :host {
      display: block;
      padding: 20px;
      height: 100%;
      overflow-y: auto;
    }

    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      color: #333;
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 5px;
    }

    .settings-placeholder {
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 8px;
      color: #666;
      font-style: italic;
      text-align: center;
    }
  `;

  render() {
    return html`
      <div class="section">
        <div class="section-title">Commands</div>
        <commands-buttons .serverURI=${this.serverURI}></commands-buttons>
      </div>
      
      <div class="section">
        <div class="section-title">Settings</div>
        <div class="settings-placeholder">
          Settings panel will be implemented here
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Files</div>
        <div class="settings-placeholder">
          Additional file management tools will be implemented here
        </div>
      </div>
    `;
  }
}

customElements.define('files-and-settings', CommandsTab);
