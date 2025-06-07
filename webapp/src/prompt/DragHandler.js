/**
 * Handles drag functionality for the PromptView dialog
 */
export class DragHandler {
  constructor(promptView) {
    this.promptView = promptView;
    this.dragOffset = { x: 0, y: 0 };
    
    // Bind methods to maintain context
    this.handleDrag = this.handleDrag.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
  }
  
  initialize() {
    // Apply initial position
    if (this.promptView.hasBeenDragged) {
      this.promptView.style.transform = `translate3d(${this.promptView.position.x}px, ${this.promptView.position.y}px, 0)`;
    }
    
    // Add global mouse event listeners for dragging
    this._boundDragHandler = this.handleDrag.bind(this);
    this._boundDragEndHandler = this.handleDragEnd.bind(this);
    
    document.addEventListener('mousemove', this._boundDragHandler);
    document.addEventListener('mouseup', this._boundDragEndHandler);
    
    console.log('DragHandler initialized');
  }
  
  cleanup() {
    document.removeEventListener('mousemove', this._boundDragHandler);
    document.removeEventListener('mouseup', this._boundDragEndHandler);
    
    console.log('DragHandler cleaned up');
  }
  
  handleDragStart(event) {
    // Ignore non-left button clicks or if already dragging
    if (event.button !== 0 || this.promptView.isDragging) return;
    
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
}
