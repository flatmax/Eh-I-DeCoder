import { html } from 'lit';
import '@material/web/icon/icon.js';

export class ContextMenu {
  constructor(repoTree) {
    this.repoTree = repoTree;
    this.visible = false;
    this.x = 0;
    this.y = 0;
    this.path = '';
    this.isFile = false;
  }

  show(event, path, isFile) {
    event.preventDefault();
    event.stopPropagation();
    
    this.visible = true;
    this.x = event.clientX;
    this.y = event.clientY;
    this.path = path;
    this.isFile = isFile;
    
    this.repoTree.requestUpdate();
    
    // Add click listener to close menu
    setTimeout(() => {
      document.addEventListener('click', this.handleDocumentClick.bind(this), { once: true });
    }, 0);
  }

  hide() {
    this.visible = false;
    this.repoTree.requestUpdate();
  }

  handleDocumentClick(event) {
    // Check if click is inside the context menu
    const contextMenu = this.repoTree.shadowRoot?.querySelector('.context-menu');
    if (contextMenu && contextMenu.contains(event.target)) {
      return;
    }
    this.hide();
  }

  renderMenuItem(icon, label, handler) {
    return html`
      <div class="context-menu-item" @click=${handler}>
        <span class="context-menu-icon">
          <md-icon class="material-symbols-outlined">${icon}</md-icon>
        </span>
        <span class="context-menu-text">${label}</span>
      </div>
    `;
  }
}
