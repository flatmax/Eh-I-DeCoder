/**
 * Manages scrolling behavior for the message history
 */
export class ScrollManager {
  constructor(promptView) {
    this.promptView = promptView;
    this.scrollThreshold = 100; // Show button when scrolled up more than 100px from bottom
    this.autoScrollEnabled = true; // Track if auto-scroll should happen
  }
  
  initialize() {
    console.log('ScrollManager initialized');
  }
  
  cleanup() {
    console.log('ScrollManager cleaned up');
  }
  
  /**
   * Handle scroll events on the message history container
   */
  handleScroll(event) {
    const historyContainer = event.target;
    const { scrollTop, scrollHeight, clientHeight } = historyContainer;
    const distanceFromBottom = scrollHeight - clientHeight - scrollTop;
    
    // Show scroll-to-bottom button if user has scrolled up significantly
    const shouldShowButton = distanceFromBottom > this.scrollThreshold;
    
    if (this.promptView.showScrollToBottom !== shouldShowButton) {
      this.promptView.showScrollToBottom = shouldShowButton;
    }
    
    // Update auto-scroll state based on user's scroll position
    // If user is near the bottom, enable auto-scroll
    this.autoScrollEnabled = distanceFromBottom <= 50;
  }
  
  /**
   * Scroll to the bottom of the message history
   */
  scrollToBottom() {
    const historyContainer = this.promptView.shadowRoot.getElementById('messageHistory');
    if (historyContainer) {
      historyContainer.scrollTop = historyContainer.scrollHeight;
      // Hide the button immediately after scrolling
      this.promptView.showScrollToBottom = false;
      // Re-enable auto-scroll since user manually scrolled to bottom
      this.autoScrollEnabled = true;
    }
  }
  
  /**
   * Check if user is scrolled to bottom of the history container
   */
  _isScrolledToBottom() {
    const historyContainer = this.promptView.shadowRoot.getElementById('messageHistory');
    if (historyContainer) {
      const { scrollTop, scrollHeight, clientHeight } = historyContainer;
      // Consider "at bottom" if within 50px of actual bottom
      return Math.abs(scrollHeight - clientHeight - scrollTop) <= 50;
    }
    return true;
  }
  
  /**
   * Force scroll to bottom with proper timing
   */
  _forceScrollToBottom() {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      const historyContainer = this.promptView.shadowRoot.getElementById('messageHistory');
      if (historyContainer) {
        historyContainer.scrollTop = historyContainer.scrollHeight;
      }
    });
  }
  
  /**
   * Scroll to bottom if conditions are met
   */
  _scrollToBottomIfNeeded() {
    // Only auto-scroll if enabled and we're near the bottom
    if (this.autoScrollEnabled) {
      this._forceScrollToBottom();
    }
  }
  
  /**
   * Hook called when a message is added
   */
  onMessageAdded(role, content) {
    // Always scroll to bottom when a new message is added
    // This ensures we see new messages immediately
    this.autoScrollEnabled = true;
    
    // Wait for the component to update, then scroll
    this.promptView.updateComplete.then(() => {
      this._forceScrollToBottom();
    });
  }
  
  /**
   * Hook called when a stream chunk is received
   */
  async onStreamChunk(chunk, final, role) {
    // Only auto-scroll during streaming if we were already at the bottom
    if (this.autoScrollEnabled || this._isScrolledToBottom()) {
      await this.promptView.updateComplete;
      this._forceScrollToBottom();
    }
  }
  
  /**
   * Hook called when streaming is complete
   */
  async onStreamComplete() {
    // Ensure we're at the bottom when streaming completes
    await this.promptView.updateComplete;
    if (this.autoScrollEnabled) {
      this._forceScrollToBottom();
    }
  }
  
  /**
   * Hook called when a stream error occurs
   */
  async onStreamError(errorMessage) {
    // Scroll to bottom to show error message
    await this.promptView.updateComplete;
    this._forceScrollToBottom();
  }
}
