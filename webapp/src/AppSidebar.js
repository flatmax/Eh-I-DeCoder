import {LitElement, html, css} from 'lit';
import {classMap} from 'lit/directives/class-map.js';
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';
import '@material/web/iconbutton/filled-icon-button.js';
import '@material/web/button/filled-button.js';
import '@material/web/textfield/filled-text-field.js';
import '../commands-tab.js';
import '../find-in-files.js';
import '../prompt-view.js';
import '../repo-tree.js';
import {SidebarStyles} from './sidebar/SidebarStyles.js';
import {TabConfig} from './sidebar/TabConfig.js';

export class AppSidebar extends LitElement {
  static properties = {
    expanded: { type: Boolean },
    width: { type: Number },
    activeTabIndex: { type: Number },
    serverURI: { type: String },
    newServerURI: { type: String },
    connectionStatus: { type: String },
    lspConnectionStatus: { type: String },
    showConnectionDetails: { type: Boolean }
  };

  constructor() {
    super();
    this.expanded = true;
    this.width = 280;
    this.activeTabIndex = 0;
    this.showConnectionDetails = false;
    this.lspConnectionStatus = 'disconnected';
  }

  static styles = css`
    ${SidebarStyles.styles}
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

  _getLedClasses() {
    return {
      'connection-led': true,
      [`led-${this.connectionStatus}`]: true
    };
  }

  _getLspLedClasses() {
    return {
      'connection-led': true,
      [`led-${this.lspConnectionStatus}`]: true
    };
  }

  _renderHeader() {
    return html`
      <div class="sidebar-header">
        <div class="connection-indicators">
          <div class="connection-item">
            <span class=${classMap(this._getLedClasses())}></span>
            <span class="connection-label">Server</span>
          </div>
          <div class="connection-item">
            <span class=${classMap(this._getLspLedClasses())}></span>
            <span class="connection-label">LSP</span>
          </div>
        </div>
        <md-filled-icon-button 
          icon="${this.expanded ? 'chevron_left' : 'chevron_right'}" 
          @click=${this.toggleExpanded}>
        </md-filled-icon-button>
      </div>
    `;
  }

  _renderTabs() {
    return html`
      <md-tabs
        .activeTabIndex=${this.activeTabIndex}
        @change=${this.handleTabChange}
      >
        ${TabConfig.tabs.map(tab => html`
          <md-primary-tab 
            aria-label="${tab.label}" 
            title=${this.expanded ? tab.title : ""}
          >
            ${this.expanded ? tab.title : html`<md-icon>${tab.icon}</md-icon>`}
          </md-primary-tab>
        `)}
      </md-tabs>
    `;
  }

  _renderTabPanel(index, content) {
    const isActive = this.activeTabIndex === index;
    return html`
      <div class=${classMap({
        'tab-panel': true,
        'active': isActive
      })} style="${isActive ? 'display: flex;' : 'display: none;'}">
        ${content}
      </div>
    `;
  }

  _renderServerSettings() {
    return html`
      <div class="connection-status">
        <div class="status-row">
          <span class=${classMap(this._getLedClasses())}></span>
          <span>Server: ${this.connectionStatus}</span>
        </div>
        <div class="status-row">
          <span class=${classMap(this._getLspLedClasses())}></span>
          <span>LSP: ${this.lspConnectionStatus}</span>
        </div>
      </div>
      
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
    `;
  }

  render() {
    return html`
      ${this._renderHeader()}
      
      <div class="sidebar-content">
        ${this._renderTabs()}
        
        <div class="tab-content">
          ${this._renderTabPanel(0, html`
            <div class="file-tree-container">
              <repo-tree .serverURI=${this.serverURI}></repo-tree>
            </div>
          `)}
          
          ${this._renderTabPanel(1, html`
            <find-in-files .serverURI=${this.serverURI} @open-file=${this.handleOpenFile}></find-in-files>
          `)}
          
          ${this._renderTabPanel(2, html`
            <commands-tab .serverURI=${this.serverURI}></commands-tab>
          `)}
          
          ${this._renderTabPanel(3, this._renderServerSettings())}
        </div>
      </div>
    `;
  }
}
