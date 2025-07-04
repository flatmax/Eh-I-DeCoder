/**
 * ChatScrollManager - Handles scroll behavior for chat history
 */
export class ChatScrollManager {
  constructor(chatPanel) {
    this.chatPanel = chatPanel;
    this.scrollContainer = null;
    this.shouldScrollToBottom = true;
    this.hasUserScrolled = false;
    this.handleScroll = this.handleScroll.bind(this);
  }

  setupScrollContainer() {
    if (!this.scrollContainer) {
      this.scrollContainer = this.chatPanel.shadowRoot.querySelector('.chat-history-container');
      if (this.scrollContainer) {
        this.scrollContainer.addEventListener('scroll', this.handleScroll);
        console.log('ChatScrollManager: Scroll listener added');
      }
    }
  }

  handleScroll(event) {
    const container = event.target;
    const { scrollTop, scrollHeight, clientHeight } = container;

    // Mark that user has scrolled
    this.hasUserScrolled = true;

    // Check if user scrolled near the top
    if (scrollTop < 100 && this.chatPanel.hasMore && !this.chatPanel.isLoadingMore) {
      console.log('ChatScrollManager: Scroll near top detected, loading more content');
      this.chatPanel.loadMoreContent();
    }
  }

  scrollToBottomOnInitialLoad() {
    if (this.shouldScrollToBottom) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        this.scrollToBottom();
        this.shouldScrollToBottom = false; // Only scroll to bottom on initial load
      }, 100);
    }
  }

  scrollToBottom() {
    // Try to find scroll container if we don't have it
    if (!this.scrollContainer) {
      this.scrollContainer = this.chatPanel.shadowRoot.querySelector('.chat-history-container');
    }
    
    if (this.scrollContainer) {
      this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
      console.log('ChatScrollManager: Scrolled to bottom');
    } else {
      console.warn('ChatScrollManager: Cannot scroll - no scroll container found');
      // Try again after a short delay
      setTimeout(() => {
        this.scrollContainer = this.chatPanel.shadowRoot.querySelector('.chat-history-container');
        if (this.scrollContainer) {
          this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
          console.log('ChatScrollManager: Scrolled to bottom (delayed)');
        }
      }, 200);
    }
  }

  saveScrollState() {
    if (!this.scrollContainer) return null;
    
    const scrollTop = this.scrollContainer.scrollTop;
    const scrollHeight = this.scrollContainer.scrollHeight;
    console.log('ChatScrollManager: Current scroll position:', { scrollTop, scrollHeight });
    
    return { scrollTop, scrollHeight };
  }

  restoreScrollState(scrollState) {
    if (!scrollState || !this.scrollContainer) return;
    
    const newScrollHeight = this.scrollContainer.scrollHeight;
    const heightDifference = newScrollHeight - scrollState.scrollHeight;
    this.scrollContainer.scrollTop = scrollState.scrollTop + heightDifference;
    
    console.log('ChatScrollManager: Scroll position restored:', {
      newScrollHeight,
      heightDifference,
      newScrollTop: this.scrollContainer.scrollTop
    });
  }
}
