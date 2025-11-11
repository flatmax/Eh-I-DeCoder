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
    this.dragStartTime = 0;
    this.dragThreshold = 5; // pixels to move before considering it a drag
    this.dragStartPosition = { x: 0, y: 0 };
    
    // Bind methods to maintain context
    this.handleDrag = this.handleDrag.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleResizeEnd = this.handleResizeEnd.bind(this);
  }
  
  initialize() {
    // Apply initial position if dragged
    if (this.promptView.hasBeenDragged && this.promptView.position) {
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
  }
  
  cleanup() {
    document.removeEventListener('mousemove', this._boundDragHandler);
    document.removeEventListener('mouseup', this._boundDragEndHandler);
    document.removeEventListener('mousemove', this._boundResizeHandler);
    document.removeEventListener('mouseup', this._boundResizeEndHandler);
  }
  
  handleDragStart(event) {
    // Ignore non-left button clicks or if already dragging/resizing
    if (event.button !== 0 || this.promptView.isDragging || this.isResizing) return;
    
    // Store drag start time and position for threshold detection
    this.dragStartTime = Date.now();
    this.dragStartPosition = { x: event.clientX, y: event.clientY };
    
    // Get current position from the actual rendered element
    const rect = this.promptView.getBoundingClientRect();
    
    // Calculate the offset between mouse position and dialog top-left
    this.dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Store the current actual position as our starting point
    this.promptView.position = { 
      x: rect.left, 
      y: rect.top 
    };
    
    // Mark as potentially dragging (but not actually dragging until threshold is met)
    this.promptView.isDragging = true;
    
    // Notify state manager
    this.promptView.dialogStateManager.startDragging();
    
    // Add dragging class to disable transitions during drag
    this.promptView.classList.add('dragging');
    this.promptView.style.cursor = 'grabbing';
    
    // Prevent default to avoid text selection
    event.preventDefault();
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
    
    // Notify state manager
    this.promptView.dialogStateManager.startResizing();
    
    // Add resizing class
    this.promptView.classList.add('resizing');
    this.promptView.style.cursor = 'e-resize';
    
    // Prevent default to avoid text selection
    event.preventDefault();
    event.stopPropagation(); // Prevent drag from starting
  }
  
  handleDrag(event) {
    if (!this.promptView.isDragging) return;
    
    // Check if we've moved enough to consider this a real drag
    const deltaX = Math.abs(event.clientX - this.dragStartPosition.x);
    const deltaY = Math.abs(event.clientY - this.dragStartPosition.y);
    const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // If we haven't moved enough, don't start actual dragging yet
    if (totalDelta < this.dragThreshold) {
      return;
    }
    
    // Now we're actually dragging - mark as dragged and switch to transform positioning
    if (!this.promptView.hasBeenDragged) {
      this.promptView.hasBeenDragged = true;
      
      // Switch to transform-based positioning immediately
      // Clear any CSS positioning and use transform instead
      this.promptView.style.top = '0';
      this.promptView.style.left = '0';
      this.promptView.style.bottom = 'auto';
      this.promptView.style.right = 'auto';
      this.promptView.style.transform = `translate3d(${this.promptView.position.x}px, ${this.promptView.position.y}px, 0)`;
      
      // Update dialog state manager to reflect dragged state
      this.promptView.dialogStateManager.updateDialogClass();
    }
    
    // Calculate new position based on mouse position and drag offset
    const x = event.clientX - this.dragOffset.x;
    const y = event.clientY - this.dragOffset.y;
    
    // Constrain to viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dialogRect = this.promptView.getBoundingClientRect();
    
    const constrainedX = Math.max(0, Math.min(viewportWidth - dialogRect.width, x));
    const constrainedY = Math.max(0, Math.min(viewportHeight - dialogRect.height, y));
    
    // Update position state
    this.promptView.position = { x: constrainedX, y: constrainedY };
    
    // Apply position using translate3d for hardware acceleration
    this.promptView.style.transform = `translate3d(${constrainedX}px, ${constrainedY}px, 0)`;
    
    // Set flag to prevent click handler from firing
    this.promptView._wasDragging = true;
    
    // Prevent default behavior
    event.preventDefault();
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
  }
  
  handleDragEnd(event) {
    if (!this.promptView.isDragging) return;
    
    // Check if this was actually a drag or just a click
    const deltaX = Math.abs(event.clientX - this.dragStartPosition.x);
    const deltaY = Math.abs(event.clientY - this.dragStartPosition.y);
    const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const timeDelta = Date.now() - this.dragStartTime;
    
    // If it was a small movement and quick, treat it as a click, not a drag
    if (totalDelta < this.dragThreshold && timeDelta < 200) {
      this.promptView._wasDragging = false;
    } else {
      this.promptView._wasDragging = true;
    }
    
    // Update dragging state
    this.promptView.isDragging = false;
    
    // Reset cursor
    this.promptView.style.cursor = '';
    
    // Remove dragging class
    this.promptView.classList.remove('dragging');
    
    // Notify state manager
    this.promptView.dialogStateManager.endDragging();
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
    
    // Notify state manager
    this.promptView.dialogStateManager.endResizing();
  }
}
