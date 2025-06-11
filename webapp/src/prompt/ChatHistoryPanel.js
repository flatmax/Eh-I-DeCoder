/**
 * ChatHistoryPanel component for displaying chat history with infinite scrolling
 */
import { html, css } from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import { CardMarkdown } from './CardMarkdown.js';

export class ChatHistoryPanel extends JRPCClient {
  static properties = {
    ...JRPCClient.properties,
    serverURI: { type: String },
    content: { type: String, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true },
    hasMore: { type: Boolean, state: true },
    currentStartPos: { type: Number, state: true },
    fileSize: { type: Number, state: true },
    isLoadingMore: { type: Boolean, state: true }
  };

  constructor() {
    super();
    this.content = '';
    this.loading = true;
    this.error = null;
    this.hasMore = false;
    this.currentStartPos = 0;
    this.fileSize = 0;
    this.isLoadingMore = false;
    this.scrollContainer = null;
    this.lastScrollHeight = 0;
    this.remoteTimeout = 300;
    this.shouldScrollToBottom = true; // Flag to control initial scroll
    
    console.log('ChatHistoryPanel: Constructor called');
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .chat-history-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background-color: #f9f9f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
    }

    .loading-indicator {
      text-align: center;
      padding: 20px;
      color: #666;
      font-style: italic;
    }

    .error-message {
      text-align: center;
      padding: 20px;
      color: #d32f2f;
      background-color: #ffebee;
      border-radius: 4px;
      margin: 16px;
    }

    .load-more-indicator {
      text-align: center;
      padding: 10px;
      color: #666;
      font-size: 12px;
      background-color: rgba(255, 255, 255, 0.8);
      border-bottom: 1px solid #e0e0e0;
    }

    .content-wrapper {
      word-wrap: break-word;
      max-width: 100%;
    }

    .file-info {
      position: sticky;
      top: 0;
      background-color: rgba(245, 245, 245, 0.95);
      padding: 8px 16px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      z-index: 1;
    }

    card-markdown {
      display: block;
      width: 100%;
    }
  `;

  firstUpdated() {
    console.log('ChatHistoryPanel: First updated');
    this.scrollContainer = this.shadowRoot.querySelector('.chat-history-container');
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', this.handleScroll.bind(this));
      console.log('ChatHistoryPanel: Scroll listener added');
    } else {
      console.warn('ChatHistoryPanel: Could not find scroll container');
    }
  }

  setupDone(){
    console.log('ChatHistoryPanel: setupDone called');
    console.log('ChatHistoryPanel: this.call =', this.call);
    console.log('ChatHistoryPanel: Available methods:', this.call ? Object.keys(this.call) : 'No call object');
    this.loadInitialContent();
  }

  async loadInitialContent() {
    console.log('ChatHistoryPanel: loadInitialContent called');
    
    try {
      this.loading = true;
      this.error = null;
      
      console.log('ChatHistoryPanel: About to call ChatHistory.get_latest_content');
      console.log('ChatHistoryPanel: this.call =', this.call);
      
      if (!this.call) {
        console.error('ChatHistoryPanel: JRPC call object not available');
        throw new Error('JRPC call object not available');
      }
      
      if (!this.call['ChatHistory.get_latest_content']) {
        console.error('ChatHistoryPanel: Available methods:', Object.keys(this.call));
        throw new Error('ChatHistory.get_latest_content method not available');
      }

      const response = await this.call['ChatHistory.get_latest_content']();
      console.log('ChatHistoryPanel: Response received:', response);
      
      if (response && typeof response === 'object') {
        // Extract data from the response object (which contains remote UUID keys)
        const responseData = this.extractResponseData(response);
        console.log('ChatHistoryPanel: Extracted response data:', responseData);
        
        if (responseData) {
          this.content = responseData.content || '';
          this.currentStartPos = responseData.start_pos || 0;
          this.hasMore = responseData.has_more || false;
          this.fileSize = responseData.file_size || 0;
          
          console.log('ChatHistoryPanel: Content loaded:', {
            contentLength: this.content.length,
            currentStartPos: this.currentStartPos,
            hasMore: this.hasMore,
            fileSize: this.fileSize
          });
        } else {
          console.warn('ChatHistoryPanel: No valid data in response');
          this.content = '';
          this.hasMore = false;
        }
      } else {
        console.warn('ChatHistoryPanel: Invalid response format:', response);
        this.content = '';
        this.hasMore = false;
      }

      this.loading = false;

      // Scroll to bottom after content loads
      await this.updateComplete;
      if (this.shouldScrollToBottom) {
        this.scrollToBottom();
        this.shouldScrollToBottom = false; // Only scroll to bottom on initial load
      }
      console.log('ChatHistoryPanel: Initial content load complete');

    } catch (error) {
      console.error('ChatHistoryPanel: Error loading chat history:', error);
      console.error('ChatHistoryPanel: Error stack:', error.stack);
      this.error = `Failed to load chat history: ${error.message}`;
      this.loading = false;
    }
  }

  async loadMoreContent() {
    console.log('ChatHistoryPanel: loadMoreContent called');
    console.log('ChatHistoryPanel: isLoadingMore =', this.isLoadingMore, 'hasMore =', this.hasMore);
    
    if (this.isLoadingMore || !this.hasMore) {
      console.log('ChatHistoryPanel: Skipping loadMoreContent - already loading or no more content');
      return;
    }

    try {
      this.isLoadingMore = true;
      console.log('ChatHistoryPanel: About to call load_previous_chunk_remote with currentStartPos =', this.currentStartPos);

      const response = await this.call['ChatHistory.load_previous_chunk_remote'](this.currentStartPos);
      console.log('ChatHistoryPanel: loadMoreContent response:', response);
      
      const responseData = this.extractResponseData(response);
      console.log('ChatHistoryPanel: Extracted loadMoreContent data:', responseData);
      
      if (responseData && responseData.content) {
        // Store current scroll position
        const scrollTop = this.scrollContainer.scrollTop;
        const scrollHeight = this.scrollContainer.scrollHeight;
        console.log('ChatHistoryPanel: Current scroll position:', { scrollTop, scrollHeight });

        // Prepend new content
        this.content = responseData.content + this.content;
        this.currentStartPos = responseData.start_pos || 0;
        this.hasMore = responseData.has_more || false;
        
        console.log('ChatHistoryPanel: Content updated:', {
          newContentLength: responseData.content.length,
          totalContentLength: this.content.length,
          newStartPos: this.currentStartPos,
          hasMore: this.hasMore
        });

        // Wait for DOM update
        await this.updateComplete;

        // Restore scroll position relative to new content
        const newScrollHeight = this.scrollContainer.scrollHeight;
        const heightDifference = newScrollHeight - scrollHeight;
        this.scrollContainer.scrollTop = scrollTop + heightDifference;
        
        console.log('ChatHistoryPanel: Scroll position restored:', {
          newScrollHeight,
          heightDifference,
          newScrollTop: this.scrollContainer.scrollTop
        });
      } else {
        console.warn('ChatHistoryPanel: Invalid loadMoreContent response:', responseData);
      }

    } catch (error) {
      console.error('ChatHistoryPanel: Error loading more content:', error);
      console.error('ChatHistoryPanel: Error stack:', error.stack);
    } finally {
      this.isLoadingMore = false;
      console.log('ChatHistoryPanel: loadMoreContent complete');
    }
  }

  extractResponseData(response) {
    // Handle the JRPC response format which contains remote UUID keys
    if (!response || typeof response !== 'object') {
      return null;
    }
    
    // Get the first (and likely only) value from the response object
    const keys = Object.keys(response);
    if (keys.length === 0) {
      return null;
    }
    
    return response[keys[0]];
  }

  handleScroll(event) {
    const container = event.target;
    const { scrollTop, scrollHeight, clientHeight } = container;

    // Check if user scrolled near the top
    if (scrollTop < 100 && this.hasMore && !this.isLoadingMore) {
      console.log('ChatHistoryPanel: Scroll near top detected, loading more content');
      this.loadMoreContent();
    }
  }

  scrollToBottom() {
    if (this.scrollContainer) {
      this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
      console.log('ChatHistoryPanel: Scrolled to bottom');
    } else {
      console.warn('ChatHistoryPanel: Cannot scroll - no scroll container');
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  render() {
    console.log('ChatHistoryPanel: Rendering with state:', {
      loading: this.loading,
      error: this.error,
      contentLength: this.content.length,
      hasMore: this.hasMore,
      isLoadingMore: this.isLoadingMore
    });
    
    if (this.loading) {
      return html`
        <div class="loading-indicator">
          Loading chat history...
        </div>
      `;
    }

    if (this.error) {
      return html`
        <div class="error-message">
          ${this.error}
        </div>
      `;
    }

    return html`
      <div class="file-info">
        Chat History (${this.formatFileSize(this.fileSize)})
        ${this.hasMore ? html` - Scroll up to load more` : ''}
      </div>
      
      ${this.hasMore && this.isLoadingMore ? html`
        <div class="load-more-indicator">
          Loading more content...
        </div>
      ` : ''}
      
      <div class="chat-history-container">
        <div class="content-wrapper">
          <card-markdown .content=${this.content} role="assistant"></card-markdown>
        </div>
      </div>
    `;
  }
}

customElements.define('chat-history-panel', ChatHistoryPanel);
