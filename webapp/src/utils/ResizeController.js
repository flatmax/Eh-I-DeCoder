/**
 * Unified ResizeController class for handling element resizing
 * Consolidates resize logic from ResizeMixin and ResizeHandler
 */
export class ResizeController {
  constructor(element, options = {}) {
    this.element = element;
    this.options = {
      minWidth: 180,
      maxWidth: 600,
      direction: 'right', // 'left', 'right', 'both'
      onResize: null,
      onResizeStart: null,
      onResizeEnd: null,
      handleSelector: '.resize-handle',
      activeClass: 'active',
      ...options
    };
    
    this.isResizing = false;
    this.currentDirection = null;
    this.initialX = 0;
    this.initialWidth = 0;
    this.currentWidth = this.options.initialWidth || 300;
    
    // Bind methods
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    
    this.setupResize();
  }
  
  setupResize() {
    // Find resize handles based on direction
    if (this.options.direction === 'both' || this.options.direction === 'left') {
      const leftHandle = this.element.querySelector(`${this.options.handleSelector}.left, ${this.options.handleSelector}-left`);
      if (leftHandle) {
        leftHandle.addEventListener('mousedown', (e) => this.handleMouseDown(e, 'left'));
      }
    }
    
    if (this.options.direction === 'both' || this.options.direction === 'right') {
      const rightHandle = this.element.querySelector(`${this.options.handleSelector}.right, ${this.options.handleSelector}-right, ${this.options.handleSelector}`);
      if (rightHandle) {
        rightHandle.addEventListener('mousedown', (e) => this.handleMouseDown(e, 'right'));
      }
    }
    
    // Add global listeners
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }
  
  handleMouseDown(event, direction) {
    if (event.button !== 0) return; // Only left mouse button
    
    this.isResizing = true;
    this.currentDirection = direction;
    this.initialX = event.clientX;
    this.initialWidth = this.currentWidth;
    
    // Add active class to handle
    const handle = event.currentTarget;
    handle.classList.add(this.options.activeClass);
    
    // Prevent text selection
    event.preventDefault();
    
    // Call start callback
    if (this.options.onResizeStart) {
      this.options.onResizeStart(direction);
    }
  }
  
  handleMouseMove(event) {
    if (!this.isResizing) return;
    
    const deltaX = event.clientX - this.initialX;
    let newWidth;
    
    if (this.currentDirection === 'left') {
      // Resizing from left edge - decrease width as mouse moves right
      newWidth = this.initialWidth - deltaX;
    } else {
      // Resizing from right edge - increase width as mouse moves right
      newWidth = this.initialWidth + deltaX;
    }
    
    // Apply constraints
    newWidth = Math.max(this.options.minWidth, Math.min(this.options.maxWidth, newWidth));
    
    // Update width
    this.currentWidth = newWidth;
    
    // Call resize callback
    if (this.options.onResize) {
      this.options.onResize(newWidth, this.currentDirection);
    }
  }
  
  handleMouseUp(event) {
    if (!this.isResizing) return;
    
    this.isResizing = false;
    
    // Remove active class from all handles
    const handles = this.element.querySelectorAll(this.options.handleSelector);
    handles.forEach(handle => handle.classList.remove(this.options.activeClass));
    
    // Call end callback
    if (this.options.onResizeEnd) {
      this.options.onResizeEnd(this.currentWidth, this.currentDirection);
    }
    
    this.currentDirection = null;
  }
  
  setWidth(width) {
    this.currentWidth = Math.max(this.options.minWidth, Math.min(this.options.maxWidth, width));
    if (this.options.onResize) {
      this.options.onResize(this.currentWidth, null);
    }
  }
  
  getWidth() {
    return this.currentWidth;
  }
  
  destroy() {
    // Remove global listeners
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    
    // Remove handle listeners
    const handles = this.element.querySelectorAll(this.options.handleSelector);
    handles.forEach(handle => {
      handle.removeEventListener('mousedown', this.handleMouseDown);
    });
  }
}
