import {LitElement, html, css} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';
import '@material/web/iconbutton/filled-icon-button.js';
import '@material/web/button/filled-button.js';
import '@material/web/textfield/filled-text-field.js';
import './CommandsTab.js';
import './FindInFiles.js';
import '../prompt-view.js';
import '../repo-tree.js';

export class AppSidebar extends LitElement {
  static properties = {
    expanded: { type: Boolean },
    width: { type: Number },
    activeTabIndex: { type: Number },
    serverURI: { type: String },
    newServerURI: { type: String },
    connectionStatus: { type: String },
    showConnectionDetails: { type: Boolean }
  };

  constructor() {
    super();
    this.expanded = true;
    this.width = 280;
    this.activeTabIndex = 0;
    this.showConnectionDetails = false;
  }

  static styles = css`
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
      align-items: center;
      gap: 8px;
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
  `;

  handleTabChange(e) {
    this.activeTabIndex = e.target.activeTabIndex;
    this.dispatchEvent(new CustomEvent('tab-change', {
      detail: { activeTabIndex: this.activeTabIndex }
    }));
  }

  toggleExpanded() {
    this.expanded = !this.expanded;
    this.dispatchEvent(new CustomEvent('toggle-expanded', {
      detail: { expanded: this.expanded }
    }));
  }

  toggleConnectionDetails() {
    this.showConnectionDetails = !this.showConnectionDetails;
  }

  updateServerURI() {
    this.dispatchEvent(new CustomEvent('update-server-uri', {
      detail: { newServerURI: this.newServerURI }
    }));
  }

  handleOpenFile(e) {
    this.dispatchEvent(new CustomEvent('open-file', {
      detail: e.detail
    }));
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    
    if (changedProperties.has('activeTabIndex')) {
      const tabsElement = this.shadowRoot.querySelector('md-tabs');
      if (tabsElement && tabsElement.activeTabIndex !== this.activeTabIndex) {
        tabsElement.activeTabIndex = this.activeTabIndex;
      }
    }
  }

  render() {
    const ledClasses = {
      'connection-led': true,
      [`led-${this.connectionStatus}`]: true
    };

    return html`
      <!-- Sidebar Header -->
      <div class="sidebar-header">
        <span class=${classMap(ledClasses)}></span>
        <md-filled-icon-button 
          icon="${this.expanded ? 'chevron_left' : 'chevron_right'}" 
          @click=${this.toggleExpanded}>
        </md-filled-icon-button>
      </div>
      
      <!-- Sidebar Content -->
      <div class="sidebar-content">
        <!-- Tabs Navigation -->
        <md-tabs
          .activeTabIndex=${this.activeTabIndex}
          @change=${this.handleTabChange}
        >
          <md-primary-tab 
            aria-label="Repository Tab" 
            title=${this.expanded ? "Repository" : ""}
          >
            ${this.expanded ? "Repository" : html`<md-icon>source</md-icon>`}
          </md-primary-tab>
          <md-primary-tab 
            aria-label="Search Tab" 
            title=${this.expanded ? "Search" : ""}
          >
            ${this.expanded ? "Search" : html`<md-icon>search</md-icon>`}
          </md-primary-tab>
          <md-primary-tab 
            aria-label="Commands Tab" 
            title=${this.expanded ? "Commands" : ""}
          >
            ${this.expanded ? "Commands" : html`<md-icon>tune</md-icon>`}
          </md-primary-tab>
          <md-primary-tab 
            aria-label="Settings Tab" 
            title=${this.expanded ? "Settings" : ""}
          >
            ${this.expanded ? "Settings" : html`<md-icon>settings</md-icon>`}
          </md-primary-tab>
        </md-tabs>
        
        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Repository Tab Panel -->
          <div class=${classMap({
            'tab-panel': true,
            'active': this.activeTabIndex === 0
          })} style="${this.activeTabIndex === 0 ? 'display: flex;' : 'display: none;'}">
            <div class="file-tree-container">
              <repo-tree .serverURI=${this.serverURI}></repo-tree>
            </div>
          </div>
          
          <!-- Search Tab Panel -->
          <div class=${classMap({
            'tab-panel': true,
            'active': this.activeTabIndex === 1
          })} style="${this.activeTabIndex === 1 ? 'display: flex;' : 'display: none;'}">
            <find-in-files .serverURI=${this.serverURI} @open-file=${this.handleOpenFile}></find-in-files>
          </div>
          
          <!-- Commands Tab Panel -->
          <div class=${classMap({
            'tab-panel': true,
            'active': this.activeTabIndex === 2
          })} style="${this.activeTabIndex === 2 ? 'display: flex;' : 'display: none;'}">
            <files-and-settings .serverURI=${this.serverURI}></files-and-settings>
          </div>
          
          <!-- Settings Tab Panel -->
          <div class=${classMap({
            'tab-panel': true,
            'active': this.activeTabIndex === 3
          })} style="${this.activeTabIndex === 3 ? 'display: flex;' : 'display: none;'}">
            <!-- Server Status Section -->
            <div class="connection-status">
              <span class=${classMap(ledClasses)}></span>
              <span>${this.connectionStatus}</span>
            </div>
            
            <!-- Server Settings Section -->
            <div class="sidebar-section">
              <div class="sidebar-section-content">
                <div class="server-settings">
                  <div class="server-header" @click=${this.toggleConnectionDetails}>
                    <div>
                      <span>Server: ${this.showConnectionDetails ? '' : this.serverURI}</span>
                    </div>
                    <md-filled-button dense>
                      ${this.showConnectionDetails ? 'Hide Details' : 'Show Details'}
                    </md-filled-button>
                  </div>
                  
                  ${this.showConnectionDetails ? html`
                    <div class="server-details">
                      <md-filled-text-field
                        class="server-input"
                        .value=${this.newServerURI}
                        @input=${e => this.newServerURI = e.target.value}
                        label="Server URI"
                      ></md-filled-text-field>
                      <md-filled-button @click=${this.updateServerURI}>
                        Connect
                      </md-filled-button>
                    </div>
                    <div class="current-server">Current: ${this.serverURI}</div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('app-sidebar', AppSidebar);
