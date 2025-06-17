import {css} from 'lit';

export class SidebarStyles {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100vh;
        border-right: 1px solid #ccc;
        background: #f5f5f5;
        transition: width 0.3s ease;
        overflow: hidden;
      }
      
      .sidebar-header {
        padding: 12px;
        border-bottom: 1px solid #ddd;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .connection-indicators {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .connection-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
      }
      
      .connection-label {
        font-weight: 500;
        color: #666;
      }
      
      .sidebar-content {
        flex: 1;
        overflow: auto;
        display: flex;
        flex-direction: column;
      }
      
      .connection-led {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        margin-right: 5px;
        display: inline-block;
        transition: background-color 0.3s ease;
      }
      
      .led-disconnected {
        background-color: #ff3b30;
        box-shadow: 0 0 5px #ff3b30;
      }
      
      .led-connecting {
        background-color: #ffcc00;
        box-shadow: 0 0 5px #ffcc00;
      }
      
      .led-connected {
        background-color: #34c759;
        box-shadow: 0 0 5px #34c759;
      }
      
      md-tabs {
        width: 100%;
      }
      
      .tab-content {
        padding: 8px;
        overflow: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      
      .tab-panel {
        display: none;
        height: 100%;
        flex: 1;
        overflow: auto;
      }
      
      .tab-panel.active {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 100px);
        width: 100%;
      }
      
      .file-tree-container {
        flex: 1;
        overflow: auto;
        min-height: 200px;
        display: flex;
        flex-direction: column;
      }
      
      .connection-status {
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .status-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }
      
      .sidebar-section {
        margin-bottom: 15px;
        overflow: hidden;
      }
      
      .server-settings {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background-color: #f9f9f9;
      }
      
      .server-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        cursor: pointer;
      }
      
      .server-details {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        width: 100%;
      }
      
      .server-input {
        flex-grow: 1;
        --md-filled-text-field-container-shape: 4px;
      }
      
      .current-server {
        font-size: 14px;
        color: #666;
        margin-top: 5px;
      }
      
      :host(.collapsed) .sidebar-section-title span,
      :host(.collapsed) .connection-status span:not(.connection-led) {
        display: none;
      }
      
      :host(.collapsed) .sidebar-section-content {
        display: none;
      }
      
      :host(.collapsed) .connection-indicators {
        flex-direction: row;
        gap: 8px;
      }
      
      :host(.collapsed) .connection-label {
        display: none;
      }
    `;
  }
}
