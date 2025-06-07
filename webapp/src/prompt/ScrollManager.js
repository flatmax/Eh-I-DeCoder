/**
 * Manages scrolling behavior for the message history
 */
export class ScrollManager {
  constructor(promptView) {
    this.promptView = promptView;
    this.scrollThreshold = 100; // Show button when scrolled up more than 100px from bottom
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
    }
  }
  
  /**
   * Check if user is scrolled to bottom of the history container
   */
  _isScrolledToBottom() {
    const historyContainer = this.promptView.shadowRoot.getElementById('messageHistory');
    if (historyContainer) {
      const { scrollTop, scrollHeight, clientHeight } = historyContainer;
      // Consider "at bottom" if within 10px of actual bottom
      return Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
    }
    return true;
  }
  
  /**
   * Scroll to bottom if we were already at the bottom
   */
  _scrollToBottomIfNeeded(shouldScrollToBottom) {
    this.promptView.updateComplete.then(() => {
      const historyContainer = this.promptView.shadowRoot.getElementById('messageHistory');
      if (historyContainer && shouldScrollToBottom) {
        historyContainer.scrollTop = historyContainer.scrollHeight;
      }
    });
  }
  
  /**
   * Hook called when a message is added
   */
  onMessageAdded(role, content) {
    // Check if we're at bottom before adding content
    const shouldScrollToBottom = this._isScrolledToBottom();
    
    // Only scroll to bottom if we were already there
    this._scrollToBottomIfNeeded(shouldScrollToBottom);
  }
  
  /**
   * Hook called when a stream chunk is received
   */
  async onStreamChunk(chunk, final, role) {
    // Check if we're at bottom before modifying content
    const shouldScrollToBottom = this._isScrolledToBottom();
    
    // Only scroll to bottom if we were already there
    await this.promptView.updateComplete;
    const historyContainer = this.promptView.shadowRoot.getElementById('messageHistory');
    if (historyContainer && shouldScrollToBottom) {
      historyContainer.scrollTop = historyContainer.scrollHeight;
    }
  }
  
  /**
   * Hook called when streaming is complete
   */
  async onStreamComplete() {
    await this.promptView.updateComplete;
  }
  
  /**
   * Hook called when a stream error occurs
   */
  async onStreamError(errorMessage) {
    // Check if we're at bottom before modifying content
    const shouldScrollToBottom = this._isScrolledToBottom();
    
    // Only scroll to bottom if we were already there
    await this.promptView.updateComplete;
    const historyContainer = this.promptView.shadowRoot.getElementById('messageHistory');
    if (historyContainer && shouldScrollToBottom) {
      historyContainer.scrollTop = historyContainer.scrollHeight;
    }
  }
}
