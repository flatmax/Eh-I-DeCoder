/**
 * Handles drag and resize functionality for the PromptView dialog
 */
export class DragHandler {
  constructor(promptView) {
    this.promptView = promptView;
    this.dragOffset = { x: 0, y: 0 };
    this.isResizing = false;
    this.resizeType = null; // 'right' only
    this.initialWidth = 0;
    this.initialMouseX = 0;
    
    // Bind methods to maintain context
    this.handleDrag = this.handleDrag.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleResizeEnd = this.handleResizeEnd.bind(this);
  }
  
  initialize() {
    // Apply initial position
    if (this.promptView.hasBeenDragged) {
      this.promptView.style.transform = `translate3d(${this.promptView.position.x}px, ${this.promptView.position.y}px, 0)`;
    }
    
    // Apply initial width if set
    if (this.promptView.dialogWidth) {
      this.promptView.style.width = `${this.promptView.dialogWidth}px`;
    }
    
    // Add global mouse event listeners for dragging and resizing
    this._boundDragHandler = this.handleDrag.bind(this);
    this._boundDragEndHandler = this.handleDragEnd.bind(this);
    this._boundResizeHandler = this.handleResize.bind(this);
    this._boundResizeEndHandler = this.handleResizeEnd.bind(this);
    
    document.addEventListener('mousemove', this._boundDragHandler);
    document.addEventListener('mouseup', this._boundDragEndHandler);
    document.addEventListener('mousemove', this._boundResizeHandler);
    document.addEventListener('mouseup', this._boundResizeEndHandler);
    
    console.log('DragHandler initialized');
  }
  
  cleanup() {
    document.removeEventListener('mousemove', this._boundDragHandler);
    document.removeEventListener('mouseup', this._boundDragEndHandler);
    document.removeEventListener('mousemove', this._boundResizeHandler);
    document.removeEventListener('mouseup', this._boundResizeEndHandler);
    
    console.log('DragHandler cleaned up');
  }
  
  handleDragStart(event) {
    // Ignore non-left button clicks or if already dragging/resizing
    if (event.button !== 0 || this.promptView.isDragging || this.isResizing) return;
    
    // Get current position
    const rect = this.promptView.getBoundingClientRect();
    
    // Calculate the offset between mouse position and dialog top-left
    this.dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Store initial position
    this.promptView.position = { 
      x: rect.left, 
      y: rect.top 
    };
    
    // Add dragging class to disable transitions during drag
    this.promptView.classList.add('dragging');
    this.promptView.style.cursor = 'grabbing';
    
    // Mark as dragging
    this.promptView.isDragging = true;
    
    // Update position with translate3d for hardware acceleration
    this.promptView.style.transform = `translate3d(${this.promptView.position.x}px, ${this.promptView.position.y}px, 0)`;
    
    // Prevent default to avoid text selection
    event.preventDefault();
    
    console.log('Drag start:', this.promptView.position);
  }
  
  handleResizeStart(event, resizeType) {
    // Only allow right-side resizing
    if (resizeType !== 'right') return;
    
    // Ignore non-left button clicks or if already dragging/resizing
    if (event.button !== 0 || this.promptView.isDragging || this.isResizing) return;
    
    // Get current dimensions
    const rect = this.promptView.getBoundingClientRect();
    
    // Store initial state
    this.isResizing = true;
    this.resizeType = resizeType;
    this.initialWidth = rect.width;
    this.initialMouseX = event.clientX;
    
    // Add resizing class
    this.promptView.classList.add('resizing');
    this.promptView.style.cursor = 'e-resize';
    
    // Prevent default to avoid text selection
    event.preventDefault();
    event.stopPropagation(); // Prevent drag from starting
    
    console.log('Resize start:', resizeType, this.initialWidth);
  }
  
  handleDrag(event) {
    if (!this.promptView.isDragging) return;
    
    // Calculate new position
    const x = event.clientX - this.dragOffset.x;
    const y = event.clientY - this.dragOffset.y;
    
    // Update position state
    this.promptView.position = { x, y };
    
    // Apply position using translate3d for hardware acceleration
    this.promptView.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    
    // Mark as dragged
    this.promptView.hasBeenDragged = true;
    
    // Set flag to prevent click handler from firing
    this.promptView._wasDragging = true;
    
    // Prevent default behavior
    event.preventDefault();
    
    // Debug
    if (event.clientX % 100 < 1) {
      console.log('Dragging to:', x, y);
    }
  }
  
  handleResize(event) {
    if (!this.isResizing) return;
    
    const deltaX = event.clientX - this.initialMouseX;
    let newWidth;
    
    // Only handle right-side resizing
    if (this.resizeType === 'right') {
      // Resizing from right edge - increase width as mouse moves right
      newWidth = this.initialWidth + deltaX;
    } else {
      return; // Should not happen since we only allow right resizing
    }
    
    // Apply constraints
    const minWidth = 300;
    const maxWidth = window.innerWidth * 0.8;
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    
    // Apply new width
    this.promptView.dialogWidth = newWidth;
    this.promptView.style.width = `${newWidth}px`;
    
    // Mark as resized
    this.promptView.hasBeenResized = true;
    
    // Prevent default behavior
    event.preventDefault();
    
    console.log('Resizing to width:', newWidth);
  }
  
  handleDragEnd(event) {
    if (!this.promptView.isDragging) return;
    
    // Update dragging state
    this.promptView.isDragging = false;
    
    // Reset cursor
    this.promptView.style.cursor = '';
    
    // Keep dragged state and final position
    this.promptView.classList.remove('dragging');
    this.promptView.classList.add('dragged');
    
    console.log('Drag ended at:', this.promptView.position.x, this.promptView.position.y);
    console.log('Final transform:', this.promptView.style.transform);
  }
  
  handleResizeEnd(event) {
    if (!this.isResizing) return;
    
    // Update resizing state
    this.isResizing = false;
    this.resizeType = null;
    
    // Reset cursor
    this.promptView.style.cursor = '';
    
    // Remove resizing class
    this.promptView.classList.remove('resizing');
    this.promptView.classList.add('resized');
    
    console.log('Resize ended at width:', this.promptView.dialogWidth);
  }
}
