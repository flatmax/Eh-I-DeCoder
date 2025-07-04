/**
 * ChatScrollManager - Handles scroll behavior for chat history
 */
export class ChatScrollManager {
  constructor(chatPanel) {
    this.chatPanel = chatPanel;
    this.scrollContainer = null;
    this.shouldScrollToBottom = true;
    this.hasUserScrolled = false;
    this.scrollThreshold = 100; // pixels from bottom to consider "at bottom"
    this.isScrolling = false;
    this.scrollTimeout = null;
  }

  /**
   * Set up the scroll container reference
   */
  setupScrollContainer() {
    if (!this.scrollContainer) {
      this.scrollContainer = this.chatPanel.shadowRoot?.querySelector('.chat-history-container');
      if (this.scrollContainer) {
        this.scrollContainer.addEventListener('scroll', this.handleScroll.bind(this));
      }
    }
  }

  /**
   * Handle scroll events
   */
  handleScroll() {
    if (!this.scrollContainer) return;

    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Set scrolling flag
    this.isScrolling = true;

    // Check if we're at the top and should load more
    if (this.scrollContainer.scrollTop === 0 && this.chatPanel.hasMore && !this.chatPanel.isLoadingMore) {
      this.chatPanel.loadMoreContent();
    }

    // Check if user has scrolled away from bottom
    const isAtBottom = this.isScrolledToBottom();
    this.hasUserScrolled = !isAtBottom;

    // Update scroll button visibility
    this.chatPanel.updateScrollButtonVisibility(!isAtBottom);

    // Reset scrolling flag after a delay
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
    }, 150);
  }

  /**
   * Check if scrolled to bottom
   */
  isScrolledToBottom() {
    if (!this.scrollContainer) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = this.scrollContainer;
    return Math.abs(scrollHeight - clientHeight - scrollTop) < this.scrollThreshold;
  }

  /**
   * Scroll to bottom of the container
   */
  scrollToBottom() {
    if (!this.scrollContainer) return;
    
    this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
    this.hasUserScrolled = false;
  }

  /**
   * Scroll to bottom on initial load
   */
  scrollToBottomOnInitialLoad() {
    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      this.scrollToBottom();
    });
  }

  /**
   * Save current scroll state before content update
   */
  saveScrollState() {
    if (!this.scrollContainer) return null;
    
    return {
      scrollHeight: this.scrollContainer.scrollHeight,
      scrollTop: this.scrollContainer.scrollTop,
      clientHeight: this.scrollContainer.clientHeight
    };
  }

  /**
   * Restore scroll position after content update
   */
  restoreScrollState(state) {
    if (!state || !this.scrollContainer) return;
    
    // Calculate the height difference
    const heightDiff = this.scrollContainer.scrollHeight - state.scrollHeight;
    
    // Adjust scroll position to maintain visual position
    this.scrollContainer.scrollTop = state.scrollTop + heightDiff;
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.handleScroll.bind(this));
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }
}
