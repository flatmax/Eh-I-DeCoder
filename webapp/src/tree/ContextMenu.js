import {html} from 'lit';
import '@material/web/icon/icon.js';

export class ContextMenu {
  constructor(host) {
    this.host = host;
    this.visible = false;
    this.path = null;
    this.isFile = false;
  }

  show(event, path, isFile) {
    // Prevent default browser context menu
    event.preventDefault();
    
    // Set the path and type for the selected item
    this.path = path;
    this.isFile = isFile;
    this.visible = true;
    
    // Position context menu immediately to avoid flickering
    const x = event.clientX;
    const y = event.clientY;
    
    // Force immediate update and then position the menu
    this.host.requestUpdate().then(() => {
      this.host.updateComplete.then(() => {
        const contextMenu = this.host.shadowRoot.querySelector('.context-menu');
        if (contextMenu) {
          // Position context menu at mouse position
          contextMenu.style.left = `${x}px`;
          contextMenu.style.top = `${y}px`;
          
          // Add event listener for clicks outside the menu
          requestAnimationFrame(() => {
            const closeMenu = (e) => {
              // Check if click is outside the context menu
              if (!contextMenu.contains(e.target)) {
                this.hide();
                document.removeEventListener('click', closeMenu);
              }
            };
            
            document.addEventListener('click', closeMenu);
          });
        }
      });
    });
  }

  hide() {
    this.visible = false;
    this.host.requestUpdate();
  }

  renderMenuItem(icon, text, handler) {
    return html`
      <div class="context-menu-item" @click=${handler}>
        <span class="context-menu-icon">
          <md-icon class="material-symbols-outlined">${icon}</md-icon>
        </span>
        <span class="context-menu-text">${text}</span>
      </div>
    `;
  }
}
