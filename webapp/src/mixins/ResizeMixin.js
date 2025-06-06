export const ResizeMixin = (superClass) => class extends superClass {
  static properties = {
    ...superClass.properties,
    sidebarWidth: { type: Number, state: true }
  };

  constructor() {
    super();
    this.sidebarWidth = 280;
    this.isResizing = false;
  }

  _handleMouseDown(e) {
    if (e.button !== 0) return;
    
    this.isResizing = true;
    this.initialX = e.clientX;
    this.initialWidth = this.sidebarWidth;
    
    e.currentTarget.classList.add('active');
    e.preventDefault();
  }
  
  _handleMouseMove(e) {
    if (!this.isResizing) return;
    
    const delta = e.clientX - this.initialX;
    const maxWidth = Math.floor(window.innerWidth / 3);
    let newWidth = Math.max(180, Math.min(maxWidth, this.initialWidth + delta));
    
    this.sidebarWidth = newWidth;
    this.requestUpdate();
  }
  
  _handleMouseUp(e) {
    if (!this.isResizing) return;
    
    this.isResizing = false;
    
    const handle = this.shadowRoot.querySelector('.resize-handle');
    if (handle) {
      handle.classList.remove('active');
    }
  }
};
