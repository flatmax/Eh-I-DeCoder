/**
 * Manages dialog state (minimized/maximized) and related UI interactions
 */
export class DialogStateManager {
  constructor(promptView) {
    this.promptView = promptView;
    
    // Bind methods to maintain context
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
  }
  
  initialize() {
    // Set initial state
    this.updateDialogClass();
    
    // Add document click listener
    document.addEventListener('click', this.handleDocumentClick, true);
    
    console.log('DialogStateManager initialized');
  }
  
  cleanup() {
    document.removeEventListener('click', this.handleDocumentClick, true);
    
    console.log('DialogStateManager cleaned up');
  }
  
  handleHeaderClick(event) {
    console.log('Header clicked, isDragging:', this.promptView.isDragging, '_wasDragging:', this.promptView._wasDragging);
    
    // Only toggle if we weren't dragging
    if (!this.promptView.isDragging && !this.promptView._wasDragging) {
      // Toggle between minimized and maximized when header is clicked
      if (this.promptView.isMinimized) {
        console.log('Maximizing from header click');
        this.maximize();
      } else {
        console.log('Minimizing from header click');
        this.minimize();
      }
      // Prevent other click handlers from firing
      event.stopPropagation();
    }
    
    // Reset drag flag after click is processed
    this.promptView._wasDragging = false;
  }
  
  handleDocumentClick(event) {
    // Don't handle document clicks if we're currently dragging
    if (this.promptView.isDragging) return;
    
    // Check if the click is inside the dialog
    const dialogContainer = this.promptView.shadowRoot.querySelector('.dialog-container');
    if (!dialogContainer) return;
    
    // Get the click target
    const clickTarget = event.target;
    
    // Check if click is inside this component
    const isInsideDialog = event.composedPath().includes(this.promptView) || 
                          this.promptView.shadowRoot.contains(clickTarget) ||
                          clickTarget === this.promptView;
    
    // Only maximize on document click if we're minimized and click is inside
    if (isInsideDialog && this.promptView.isMinimized) {
      console.log('Maximizing from document click inside dialog');
      this.maximize();
    }
  }
  
  handleDialogClick(event) {
    // Don't handle if we're dragging
    if (this.promptView.isDragging || this.promptView._wasDragging) {
      return;
    }
    
    // Only maximize when dialog content (not header) is clicked and we're minimized
    const isHeaderClick = event.target.closest('.dialog-header');
    if (!isHeaderClick && this.promptView.isMinimized) {
      console.log('Maximizing from dialog content click');
      this.maximize();
      // Stop propagation to prevent document click handler from running
      event.stopPropagation();
    }
  }
  
  updateDialogClass() {
    // Clear all state classes first
    this.promptView.classList.remove('minimized', 'maximized', 'dragged', 'dragging');
    
    // Determine the primary state (minimized vs maximized)
    // hasBeenDragged doesn't override the minimized/maximized state
    if (this.promptView.isMinimized) {
      // Apply minimized state
      this.promptView.classList.add('minimized');
      
      // If dragged while minimized, also apply dragged positioning
      if (this.promptView.hasBeenDragged && this.promptView.position && 
          this.promptView.position.x !== undefined && 
          this.promptView.position.y !== undefined) {
        this.promptView.classList.add('dragged');
        // Use transform positioning for dragged dialogs
        this.promptView.style.top = '0';
        this.promptView.style.left = '0';
        this.promptView.style.bottom = 'auto';
        this.promptView.style.right = 'auto';
        this.promptView.style.transform = `translate3d(${this.promptView.position.x}px, ${this.promptView.position.y}px, 0)`;
      } else {
        // Use CSS positioning for non-dragged minimized state
        this.promptView.style.transform = '';
        this.promptView.style.top = '';
        this.promptView.style.left = '';
        this.promptView.style.bottom = '';
        this.promptView.style.right = '';
      }
    } else {
      // Apply maximized state
      this.promptView.classList.add('maximized');
      
      // If dragged while maximized, also apply dragged positioning
      if (this.promptView.hasBeenDragged && this.promptView.position && 
          this.promptView.position.x !== undefined && 
          this.promptView.position.y !== undefined) {
        this.promptView.classList.add('dragged');
        // Use transform positioning for dragged dialogs
        this.promptView.style.top = '0';
        this.promptView.style.left = '0';
        this.promptView.style.bottom = 'auto';
        this.promptView.style.right = 'auto';
        this.promptView.style.transform = `translate3d(${this.promptView.position.x}px, ${this.promptView.position.y}px, 0)`;
      } else {
        // Use CSS positioning for non-dragged maximized state
        this.promptView.style.transform = '';
        this.promptView.style.top = '';
        this.promptView.style.left = '';
        this.promptView.style.bottom = '';
        this.promptView.style.right = '';
      }
    }
    
    // Apply dragging class if actively dragging
    if (this.promptView.isDragging) {
      this.promptView.classList.add('dragging');
    }
    
    console.log('Dialog classes updated:', this.promptView.className, 'isMinimized:', this.promptView.isMinimized);
  }
  
  maximize() {
    console.log('maximize() called, current isMinimized:', this.promptView.isMinimized);
    if (this.promptView.isMinimized) {
      this.promptView.isMinimized = false;
      
      this.updateDialogClass();
      this.promptView.requestUpdate();
      
      console.log('Dialog maximized, new isMinimized:', this.promptView.isMinimized);
    }
  }
  
  minimize() {
    console.log('minimize() called, current isMinimized:', this.promptView.isMinimized);
    if (!this.promptView.isMinimized) {
      this.promptView.isMinimized = true;
      
      this.updateDialogClass();
      this.promptView.requestUpdate();
      
      console.log('Dialog minimized, new isMinimized:', this.promptView.isMinimized);
    }
  }
}
