import { ResizeController } from '../utils/ResizeController.js';

export class ResizeHandler {
  constructor(gitHistoryView) {
    this.view = gitHistoryView;
    this.leftController = null;
    this.rightController = null;
  }

  initialize() {
    // Initialize left panel resize controller
    this.leftController = new ResizeController(this.view.shadowRoot, {
      minWidth: 200,
      maxWidth: 600,
      direction: 'left',
      initialWidth: this.view.leftPanelWidth,
      handleSelector: '.resize-handle',
      onResize: (width) => {
        this.view.leftPanelWidth = width;
        this.view.requestUpdate();
      },
      onResizeStart: () => {
        this.view.isDraggingLeft = true;
      },
      onResizeEnd: () => {
        this.view.isDraggingLeft = false;
        this.view.requestUpdate();
      }
    });

    // Initialize right panel resize controller
    this.rightController = new ResizeController(this.view.shadowRoot, {
      minWidth: 200,
      maxWidth: 600,
      direction: 'right',
      initialWidth: this.view.rightPanelWidth,
      handleSelector: '.resize-handle',
      onResize: (width) => {
        this.view.rightPanelWidth = width;
        this.view.requestUpdate();
      },
      onResizeStart: () => {
        this.view.isDraggingRight = true;
      },
      onResizeEnd: () => {
        this.view.isDraggingRight = false;
        this.view.requestUpdate();
      }
    });
  }

  cleanup() {
    if (this.leftController) {
      this.leftController.destroy();
      this.leftController = null;
    }
    if (this.rightController) {
      this.rightController.destroy();
      this.rightController = null;
    }
  }

  handleLeftMouseDown(event) {
    // This is now handled by the ResizeController
    // Keep method for backward compatibility if needed
  }

  handleRightMouseDown(event) {
    // This is now handled by the ResizeController
    // Keep method for backward compatibility if needed
  }

  handleMouseMove(event) {
    // This is now handled by the ResizeController
    // Keep method for backward compatibility if needed
  }

  handleMouseUp() {
    // This is now handled by the ResizeController
    // Keep method for backward compatibility if needed
  }
}
