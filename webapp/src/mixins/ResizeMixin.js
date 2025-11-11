import { ResizeController } from '../utils/ResizeController.js';

export const ResizeMixin = (superClass) => class extends superClass {
  static properties = {
    ...superClass.properties,
    sidebarWidth: { type: Number, state: true }
  };

  constructor() {
    super();
    this.sidebarWidth = 280;
    this.resizeController = null;
  }

  firstUpdated() {
    super.firstUpdated?.();
    this.initializeResize();
  }

  initializeResize() {
    // Initialize resize controller for sidebar
    this.resizeController = new ResizeController(this.shadowRoot, {
      minWidth: 180,
      maxWidth: Math.floor(window.innerWidth / 3),
      direction: 'right',
      initialWidth: this.sidebarWidth,
      handleSelector: '.resize-handle',
      onResize: (width) => {
        this.sidebarWidth = width;
        this.requestUpdate();
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.resizeController) {
      this.resizeController.destroy();
      this.resizeController = null;
    }
  }

  // Remove the old mouse event handler methods since ResizeController handles them now
  _handleMouseDown(event) {
    // Deprecated - handled by ResizeController
  }

  _handleMouseMove(event) {
    // Deprecated - handled by ResizeController
  }

  _handleMouseUp(event) {
    // Deprecated - handled by ResizeController
  }
};
