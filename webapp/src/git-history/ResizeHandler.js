export class ResizeHandler {
  constructor(gitHistoryView) {
    this.view = gitHistoryView;
    
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleLeftMouseDown = this.handleLeftMouseDown.bind(this);
    this.handleRightMouseDown = this.handleRightMouseDown.bind(this);
  }

  initialize() {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  cleanup() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  handleLeftMouseDown(event) {
    if (event.button !== 0) return;
    this.view.isDraggingLeft = true;
    event.preventDefault();
  }

  handleRightMouseDown(event) {
    if (event.button !== 0) return;
    this.view.isDraggingRight = true;
    event.preventDefault();
  }

  handleMouseMove(event) {
    if (!this.view.isDraggingLeft && !this.view.isDraggingRight) return;

    const containerRect = this.view.getBoundingClientRect();
    
    if (this.view.isDraggingLeft) {
      const newWidth = Math.max(200, Math.min(600, event.clientX - containerRect.left));
      this.view.leftPanelWidth = newWidth;
    }
    
    if (this.view.isDraggingRight) {
      const newWidth = Math.max(200, Math.min(600, containerRect.right - event.clientX));
      this.view.rightPanelWidth = newWidth;
    }
    
    this.view.requestUpdate();
  }

  handleMouseUp() {
    this.view.isDraggingLeft = false;
    this.view.isDraggingRight = false;
    this.view.requestUpdate();
  }
}
