/**
 * Manages dialog state (minimized/maximized) and related UI interactions
 */

// Define dialog states
const DialogStates = {
  MINIMIZED: 'minimized',
  MAXIMIZED: 'maximized',
  DRAGGING: 'dragging',
  RESIZING: 'resizing'
};

// Define valid state transitions
const StateTransitions = {
  [DialogStates.MINIMIZED]: {
    headerClick: DialogStates.MAXIMIZED,
    dialogClick: DialogStates.MAXIMIZED,
    startDrag: DialogStates.DRAGGING,
    startResize: DialogStates.RESIZING
  },
  [DialogStates.MAXIMIZED]: {
    headerClick: DialogStates.MINIMIZED,
    startDrag: DialogStates.DRAGGING,
    startResize: DialogStates.RESIZING
  },
  [DialogStates.DRAGGING]: {
    endDrag: null, // Determined by previous state
    headerClick: null, // Ignore clicks while dragging
    dialogClick: null  // Ignore clicks while dragging
  },
  [DialogStates.RESIZING]: {
    endResize: null, // Determined by previous state
    headerClick: null, // Ignore clicks while resizing
    dialogClick: null  // Ignore clicks while resizing
  }
};

export class DialogStateManager {
  constructor(promptView) {
    this.promptView = promptView;
    this.currentState = DialogStates.MINIMIZED; // Start minimized
    this.previousState = null;
    this.stateHistory = [];
    
    // Bind methods to maintain context
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
  }
  
  initialize() {
    // Set initial state based on promptView properties
    if (this.promptView.isMinimized) {
      this.currentState = DialogStates.MINIMIZED;
    } else {
      this.currentState = DialogStates.MAXIMIZED;
    }
    
    // Apply initial state
    this.applyState(this.currentState);
    
    // Add document click listener
    document.addEventListener('click', this.handleDocumentClick, true);
  }
  
  cleanup() {
    document.removeEventListener('click', this.handleDocumentClick, true);
  }
  
  /**
   * Transition to a new state based on an action
   */
  transition(action) {
    const transitions = StateTransitions[this.currentState];
    
    if (!transitions || !(action in transitions)) {
      console.warn(`Invalid transition: ${action} from state ${this.currentState}`);
      return false;
    }
    
    let newState = transitions[action];
    
    // Handle special cases where new state depends on context
    if (newState === null) {
      newState = this.determineStateFromContext(action);
    }
    
    if (newState && newState !== this.currentState) {
      this.changeState(newState);
      return true;
    }
    
    return false;
  }
  
  /**
   * Determine the new state based on context for special transitions
   */
  determineStateFromContext(action) {
    switch (action) {
      case 'endDrag':
      case 'endResize':
        // Return to the state before dragging/resizing
        return this.previousState || DialogStates.MAXIMIZED;
      default:
        return null;
    }
  }
  
  /**
   * Change to a new state
   */
  changeState(newState) {
    // Store state history
    this.stateHistory.push(this.currentState);
    if (this.stateHistory.length > 10) {
      this.stateHistory.shift(); // Keep only last 10 states
    }
    
    // Store previous state for returning from temporary states
    if (this.currentState !== DialogStates.DRAGGING && this.currentState !== DialogStates.RESIZING) {
      this.previousState = this.currentState;
    }
    
    // Update current state
    this.currentState = newState;
    
    // Apply the new state
    this.applyState(newState);
  }
  
  /**
   * Apply the visual and behavioral changes for a state
   */
  applyState(state) {
    // Update promptView properties based on state
    switch (state) {
      case DialogStates.MINIMIZED:
        this.promptView.isMinimized = true;
        this.promptView.isDragging = false;
        break;
        
      case DialogStates.MAXIMIZED:
        this.promptView.isMinimized = false;
        this.promptView.isDragging = false;
        break;
        
      case DialogStates.DRAGGING:
        this.promptView.isDragging = true;
        break;
        
      case DialogStates.RESIZING:
        // Resizing is handled by DragHandler
        break;
    }
    
    // Update visual state
    this.updateDialogClass();
  }
  
  /**
   * Get the current state
   */
  getState() {
    return this.currentState;
  }
  
  /**
   * Check if in a specific state
   */
  isInState(state) {
    return this.currentState === state;
  }
  
  /**
   * Check if a transition is valid from current state
   */
  canTransition(action) {
    const transitions = StateTransitions[this.currentState];
    return transitions && action in transitions;
  }
  
  handleHeaderClick(event) {
    // Only process if we can transition
    if (!this.canTransition('headerClick')) {
      return;
    }
    
    // Check if we were dragging
    if (this.promptView._wasDragging) {
      this.promptView._wasDragging = false;
      return;
    }
    
    // Perform the transition
    this.transition('headerClick');
    
    // Prevent other click handlers from firing
    event.stopPropagation();
  }
  
  handleDocumentClick(event) {
    // Don't handle if in dragging or resizing state
    if (this.isInState(DialogStates.DRAGGING) || this.isInState(DialogStates.RESIZING)) {
      return;
    }
    
    // Check if we just finished dragging
    if (this.promptView._wasDragging) {
      // Don't maximize on document click after dragging
      return;
    }
    
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
    if (isInsideDialog && this.isInState(DialogStates.MINIMIZED)) {
      this.transition('dialogClick');
    }
  }
  
  handleDialogClick(event) {
    // Don't handle if we can't transition
    if (!this.canTransition('dialogClick')) {
      return;
    }
    
    // Don't handle if we're dragging
    if (this.promptView._wasDragging) {
      return;
    }
    
    // Only maximize when dialog content (not header) is clicked and we're minimized
    const isHeaderClick = event.target.closest('.dialog-header');
    if (!isHeaderClick && this.isInState(DialogStates.MINIMIZED)) {
      this.transition('dialogClick');
      // Stop propagation to prevent document click handler from running
      event.stopPropagation();
    }
  }
  
  /**
   * Notify state manager that dragging has started
   */
  startDragging() {
    this.transition('startDrag');
  }
  
  /**
   * Notify state manager that dragging has ended
   */
  endDragging() {
    this.transition('endDrag');
  }
  
  /**
   * Notify state manager that resizing has started
   */
  startResizing() {
    this.transition('startResize');
  }
  
  /**
   * Notify state manager that resizing has ended
   */
  endResizing() {
    this.transition('endResize');
  }
  
  updateDialogClass() {
    // Clear all state classes first
    this.promptView.classList.remove('minimized', 'maximized', 'dragged', 'dragging', 'resizing');
    
    // Apply state-specific classes
    switch (this.currentState) {
      case DialogStates.MINIMIZED:
        this.promptView.classList.add('minimized');
        break;
        
      case DialogStates.MAXIMIZED:
        this.promptView.classList.add('maximized');
        break;
        
      case DialogStates.DRAGGING:
        this.promptView.classList.add('dragging');
        // Also add the base state class
        if (this.previousState === DialogStates.MINIMIZED) {
          this.promptView.classList.add('minimized');
        } else {
          this.promptView.classList.add('maximized');
        }
        break;
        
      case DialogStates.RESIZING:
        this.promptView.classList.add('resizing');
        // Also add the base state class
        if (this.previousState === DialogStates.MINIMIZED) {
          this.promptView.classList.add('minimized');
        } else {
          this.promptView.classList.add('maximized');
        }
        break;
    }
    
    // Apply dragged class if the dialog has been dragged
    if (this.promptView.hasBeenDragged) {
      this.promptView.classList.add('dragged');
      
      // Apply transform positioning for dragged dialogs
      if (this.promptView.position && 
          this.promptView.position.x !== undefined && 
          this.promptView.position.y !== undefined) {
        this.promptView.style.top = '0';
        this.promptView.style.left = '0';
        this.promptView.style.bottom = 'auto';
        this.promptView.style.right = 'auto';
        this.promptView.style.transform = `translate3d(${this.promptView.position.x}px, ${this.promptView.position.y}px, 0)`;
      }
    } else {
      // Use CSS positioning for non-dragged state
      this.promptView.style.transform = '';
      this.promptView.style.top = '';
      this.promptView.style.left = '';
      this.promptView.style.bottom = '';
      this.promptView.style.right = '';
    }
  }
  
  maximize() {
    if (this.currentState === DialogStates.MINIMIZED) {
      this.changeState(DialogStates.MAXIMIZED);
      this.promptView.requestUpdate();
    }
  }
  
  minimize() {
    if (this.currentState === DialogStates.MAXIMIZED) {
      this.changeState(DialogStates.MINIMIZED);
      this.promptView.requestUpdate();
    }
  }
  
  /**
   * Get state history for debugging
   */
  getStateHistory() {
    return [...this.stateHistory, this.currentState];
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    this.currentState = DialogStates.MINIMIZED;
    this.previousState = null;
    this.stateHistory = [];
    this.applyState(this.currentState);
  }
}
