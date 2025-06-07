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
    // Only toggle if we weren't dragging
    if (!this.promptView.isDragging && !this.promptView._wasDragging) {
      // Toggle between minimized and maximized when header is clicked
      if (this.promptView.isMinimized) {
        this.maximize();
      } else {
        this.minimize();
      }
      // Prevent other click handlers from firing
      event.stopPropagation();
    }
    
    // Reset drag flag after click is processed
    this.promptView._wasDragging = false;
  }
  
  handleDocumentClick(event) {
    // Check if the click is inside the dialog
    const dialogContainer = this.promptView.shadowRoot.querySelector('.dialog-container');
    if (!dialogContainer) return;
    
    // Get the click target
    const clickTarget = event.target;
    
    // Check if click is inside this component
    const isInsideDialog = event.composedPath().includes(this.promptView) || 
                          this.promptView.shadowRoot.contains(clickTarget) ||
                          clickTarget === this.promptView;
    
    if (isInsideDialog) {
      // Click is inside the dialog - maximize if minimized
      if (this.promptView.isMinimized) {
        this.maximize();
      }
    }
  }
  
  handleDialogClick(event) {
    // Maximize when dialog is clicked (if minimized)
    if (this.promptView.isMinimized) {
      this.maximize();
    }
    // Stop propagation to prevent document click handler from running
    event.stopPropagation();
  }
  
  updateDialogClass() {
    if (this.promptView.isMinimized) {
      // Update minimized/maximized classes
      this.promptView.classList.add('minimized');
      this.promptView.classList.remove('maximized');
    } else {
      // Update maximized/minimized classes
      this.promptView.classList.add('maximized');
      this.promptView.classList.remove('minimized');
    }
    
    // Apply dragged state if needed
    if (this.promptView.hasBeenDragged) {
      this.promptView.classList.add('dragged');
      // Ensure transform is applied (might get cleared by CSS)
      requestAnimationFrame(() => {
        if (this.promptView.position && 
            this.promptView.position.x !== undefined && 
            this.promptView.position.y !== undefined) {
          this.promptView.style.transform = `translate3d(${this.promptView.position.x}px, ${this.promptView.position.y}px, 0)`;
          console.log('Updating position in rAF:', this.promptView.position);
        }
      });
    } else {
      this.promptView.classList.remove('dragged');
      this.promptView.style.transform = '';
    }
    
    // Remove dragging class if we're not actively dragging
    if (!this.promptView.isDragging) {
      this.promptView.classList.remove('dragging');
    }
  }
  
  maximize() {
    if (this.promptView.isMinimized) {
      this.promptView.isMinimized = false;
      
      // Reset position when switching to maximized view
      // if we haven't dragged it yet
      if (!this.promptView.hasBeenDragged) {
        this.promptView.style.transform = '';
      }
      
      this.updateDialogClass();
      this.promptView.requestUpdate();
    }
  }
  
  minimize() {
    if (!this.promptView.isMinimized) {
      this.promptView.isMinimized = true;
      
      // Reset position when switching to minimized view
      // if we haven't dragged it yet
      if (!this.promptView.hasBeenDragged) {
        this.promptView.style.transform = '';
      }
      
      this.updateDialogClass();
      this.promptView.requestUpdate();
    }
  }
}
