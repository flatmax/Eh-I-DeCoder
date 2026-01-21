/**
 * Manages scrolling behavior for the message history
 */
export class ScrollManager {
  constructor(promptView) {
    this.promptView = promptView;
    this.scrollThreshold = 100; // Show button when scrolled up more than 100px from bottom
    this.autoScrollEnabled = true; // Track if auto-scroll should happen
    this.codeBlockScrollPositions = new Map(); // Track horizontal scroll positions of code blocks
  }
  
  initialize() {
    console.log('ScrollManager initialized');
  }
  
  cleanup() {
    console.log('ScrollManager cleaned up');
    this.codeBlockScrollPositions.clear();
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
   * Save horizontal scroll positions of all code blocks
   */
  saveCodeBlockScrollPositions() {
    const historyContainer = this.promptView.shadowRoot?.getElementById('messageHistory');
    if (!historyContainer) return;
    
    // Find all code blocks with horizontal scroll
    const cards = historyContainer.querySelectorAll('assistant-card, user-card, commands-card');
    
    cards.forEach((card, cardIndex) => {
      const shadowRoot = card.shadowRoot;
      if (!shadowRoot) return;
      
      // Find pre elements (code blocks) within the card
      const preElements = shadowRoot.querySelectorAll('pre');
      preElements.forEach((pre, preIndex) => {
        if (pre.scrollLeft > 0) {
          const key = `${cardIndex}-${preIndex}`;
          this.codeBlockScrollPositions.set(key, pre.scrollLeft);
        }
      });
      
      // Also check for code-block-wrapper elements
      const wrappers = shadowRoot.querySelectorAll('.code-block-wrapper pre');
      wrappers.forEach((pre, wrapperIndex) => {
        if (pre.scrollLeft > 0) {
          const key = `${cardIndex}-wrapper-${wrapperIndex}`;
          this.codeBlockScrollPositions.set(key, pre.scrollLeft);
        }
      });
    });
  }
  
  /**
   * Restore horizontal scroll positions of all code blocks
   */
  restoreCodeBlockScrollPositions() {
    if (this.codeBlockScrollPositions.size === 0) return;
    
    const historyContainer = this.promptView.shadowRoot?.getElementById('messageHistory');
    if (!historyContainer) return;
    
    const cards = historyContainer.querySelectorAll('assistant-card, user-card, commands-card');
    
    cards.forEach((card, cardIndex) => {
      const shadowRoot = card.shadowRoot;
      if (!shadowRoot) return;
      
      // Restore pre elements
      const preElements = shadowRoot.querySelectorAll('pre');
      preElements.forEach((pre, preIndex) => {
        const key = `${cardIndex}-${preIndex}`;
        const savedScrollLeft = this.codeBlockScrollPositions.get(key);
        if (savedScrollLeft !== undefined) {
          pre.scrollLeft = savedScrollLeft;
        }
      });
      
      // Restore code-block-wrapper elements
      const wrappers = shadowRoot.querySelectorAll('.code-block-wrapper pre');
      wrappers.forEach((pre, wrapperIndex) => {
        const key = `${cardIndex}-wrapper-${wrapperIndex}`;
        const savedScrollLeft = this.codeBlockScrollPositions.get(key);
        if (savedScrollLeft !== undefined) {
          pre.scrollLeft = savedScrollLeft;
        }
      });
    });
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
    // Save code block scroll positions before update
    this.saveCodeBlockScrollPositions();
    
    // Always scroll to bottom when a new message is added
    // This ensures we see new messages immediately
    this.autoScrollEnabled = true;
    
    // Wait for the component to update, then scroll and restore
    this.promptView.updateComplete.then(() => {
      this._forceScrollToBottom();
      // Restore code block positions after a short delay to ensure DOM is ready
      requestAnimationFrame(() => {
        this.restoreCodeBlockScrollPositions();
      });
    });
  }
  
  /**
   * Hook called when a stream chunk is received
   */
  async onStreamChunk(chunk, final, role) {
    // Save code block scroll positions before update
    this.saveCodeBlockScrollPositions();
    
    // Only auto-scroll during streaming if we were already at the bottom
    if (this.autoScrollEnabled || this._isScrolledToBottom()) {
      await this.promptView.updateComplete;
      this._forceScrollToBottom();
    } else {
      await this.promptView.updateComplete;
    }
    
    // Restore code block positions after update
    requestAnimationFrame(() => {
      this.restoreCodeBlockScrollPositions();
    });
  }
  
  /**
   * Hook called when streaming is complete
   */
  async onStreamComplete() {
    // Save code block scroll positions before final update
    this.saveCodeBlockScrollPositions();
    
    // Ensure we're at the bottom when streaming completes
    await this.promptView.updateComplete;
    if (this.autoScrollEnabled) {
      this._forceScrollToBottom();
    }
    
    // Restore code block positions
    requestAnimationFrame(() => {
      this.restoreCodeBlockScrollPositions();
    });
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
