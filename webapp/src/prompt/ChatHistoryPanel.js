/**
 * ChatHistoryPanel component for displaying chat history with infinite scrolling
 */
import { html, css } from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import { repeat } from 'lit/directives/repeat.js';
import './UserCard.js';
import './AssistantCard.js';
import './CommandsCard.js';

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
    isLoadingMore: { type: Boolean, state: true },
    parsedMessages: { type: Array, state: true }
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
    this.parsedMessages = [];
    
    // Streaming parser state
    this.parseBuffer = '';
    this.currentStreamRole = null;
    this.currentStreamContent = [];
    this.lastProcessedLength = 0;
    this.lastLineWasEmpty = false; // Track empty lines to detect breaks between command blocks
    
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

    user-card,
    assistant-card,
    commands-card {
      display: block;
      width: 100%;
      margin-bottom: 8px;
    }

    .debug-info {
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      padding: 8px;
      margin: 8px 0;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
    }
  `;

  firstUpdated() {
    console.log('ChatHistoryPanel: First updated');
    // Don't try to find scroll container here - it may not be rendered yet
    // We'll find it when we need it in other methods
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    
    // Set up scroll container after any update
    if (!this.scrollContainer) {
      this.scrollContainer = this.shadowRoot.querySelector('.chat-history-container');
      if (this.scrollContainer) {
        this.scrollContainer.addEventListener('scroll', this.handleScroll.bind(this));
        console.log('ChatHistoryPanel: Scroll listener added');
      }
    }

    // Parse content when it changes using streaming approach
    if (changedProperties.has('content')) {
      console.log('ChatHistoryPanel: Content changed, new length:', this.content?.length || 0);
      this.parseContentStreaming();
    }
  }

  parseContentStreaming() {
    if (!this.content || typeof this.content !== 'string') {
      this.parsedMessages = [];
      this.resetParsingState();
      return;
    }

    // Get only the new content since last parse
    const newContent = this.content.substring(this.lastProcessedLength);
    if (!newContent) {
      return; // No new content to process
    }

    console.log('ChatHistoryPanel: Processing new content chunk:', newContent.length, 'chars');
    
    // Process the new chunk
    this.parseStreamChunk(newContent);
    
    // Update the last processed position
    this.lastProcessedLength = this.content.length;
    
    console.log('ChatHistoryPanel: Parsed messages count:', this.parsedMessages.length);
  }

  parseStreamChunk(newChunk) {
    // Append to buffer for incomplete lines
    this.parseBuffer = this.parseBuffer + newChunk;
    
    const lines = this.parseBuffer.split('\n');
    // Keep the last line in buffer (might be incomplete)
    this.parseBuffer = lines.pop() || '';
    
    // Process all complete lines
    for (const line of lines) {
      this.processCompleteLine(line);
    }
  }

  processCompleteLine(line) {
    const trimmedLine = line.trim();
    const isEmpty = trimmedLine === '';
    let newRole = null;
    
    // Check for role change
    if (line.startsWith('#### ')) {
      newRole = 'user';
    } else if (line.startsWith('> ')) {
      newRole = 'command';
    } else {
      // Lines without prefixes are assistant content
      newRole = 'assistant';
    }
    
    // Special handling for command blocks: if we encounter a new command line
    // after empty lines, treat it as a new command block
    if (newRole === 'command' && this.currentStreamRole === 'command' && this.lastLineWasEmpty) {
      // Finalize the current command block and start a new one
      this.finalizeCurrentMessage();
      this.startNewMessage(newRole, line);
    } else if (newRole !== this.currentStreamRole) {
      // Role change - finalize current message and start new one
      this.finalizeCurrentMessage();
      this.startNewMessage(newRole, line);
    } else {
      // Same role, just add to current message
      this.addToCurrentMessage(line);
    }
    
    // Track if this line was empty for next iteration
    this.lastLineWasEmpty = isEmpty;
  }

  finalizeCurrentMessage() {
    if (this.currentStreamRole !== null && this.currentStreamContent.length > 0) {
      const content = this.currentStreamContent.join('\n').trim();
      if (content) {
        // Create a new array to trigger reactivity
        this.parsedMessages = [...this.parsedMessages, {
          role: this.currentStreamRole,
          content: content
        }];
      }
    }
  }

  startNewMessage(role, line) {
    this.currentStreamRole = role;
    this.currentStreamContent = [line];
  }

  addToCurrentMessage(line) {
    this.currentStreamContent.push(line);
  }

  resetParsingState() {
    this.parseBuffer = '';
    this.currentStreamRole = null;
    this.currentStreamContent = [];
    this.lastProcessedLength = 0;
    this.lastLineWasEmpty = false;
  }

  // Full reparse method for when we need to start fresh (e.g., when prepending content)
  parseContentFull(content) {
    if (!content || typeof content !== 'string') {
      return [];
    }

    const messages = [];
    const lines = content.split('\n');
    let currentRole = null;
    let currentContent = [];
    let lastLineWasEmpty = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      const isEmpty = trimmedLine === '';
      let newRole = null;

      // Determine the role based on prefix
      if (line.startsWith('#### ')) {
        newRole = 'user';
      } else if (line.startsWith('> ')) {
        newRole = 'command';
      } else {
        // Lines without prefixes are assistant content
        newRole = 'assistant';
      }

      // Special handling for command blocks: if we encounter a new command line
      // after empty lines, treat it as a new command block
      if (newRole === 'command' && currentRole === 'command' && lastLineWasEmpty) {
        // Save previous command message
        if (currentContent.length > 0) {
          const content = currentContent.join('\n').trim();
          if (content) {
            messages.push({
              role: currentRole,
              content: content
            });
          }
        }
        // Start new command message
        currentRole = newRole;
        currentContent = [line];
      } else if (newRole !== currentRole) {
        // Role change - save previous message if we have content
        if (currentRole !== null && currentContent.length > 0) {
          const content = currentContent.join('\n').trim();
          if (content) {
            messages.push({
              role: currentRole,
              content: content
            });
          }
        }

        // Start new message
        currentRole = newRole;
        currentContent = [line];
      } else {
        // Same role, just add to current message
        currentContent.push(line);
      }
      
      // Track if this line was empty for next iteration
      lastLineWasEmpty = isEmpty;
    }

    // Don't forget the last message
    if (currentRole !== null && currentContent.length > 0) {
      const content = currentContent.join('\n').trim();
      if (content) {
        messages.push({
          role: currentRole,
          content: content
        });
      }
    }

    return messages;
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
          // Reset parsing state for fresh start
          this.resetParsingState();
          
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

      // Scroll to bottom after content loads and DOM updates
      await this.updateComplete;
      if (this.shouldScrollToBottom) {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          this.scrollToBottom();
          this.shouldScrollToBottom = false; // Only scroll to bottom on initial load
        }, 100);
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

        // When prepending content, we need to do a full reparse
        // because the streaming parser assumes content is appended
        const newFullContent = responseData.content + this.content;
        
        // Reset parsing state and do full parse
        this.resetParsingState();
        this.parsedMessages = this.parseContentFull(newFullContent);
        
        // Update content and state
        this.content = newFullContent;
        this.currentStartPos = responseData.start_pos || 0;
        this.hasMore = responseData.has_more || false;
        
        // Reset the last processed length to the full content length
        this.lastProcessedLength = this.content.length;
        
        console.log('ChatHistoryPanel: Content updated:', {
          newContentLength: responseData.content.length,
          totalContentLength: this.content.length,
          newStartPos: this.currentStartPos,
          hasMore: this.hasMore,
          parsedMessagesCount: this.parsedMessages.length
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
    // Try to find scroll container if we don't have it
    if (!this.scrollContainer) {
      this.scrollContainer = this.shadowRoot.querySelector('.chat-history-container');
    }
    
    if (this.scrollContainer) {
      this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
      console.log('ChatHistoryPanel: Scrolled to bottom');
    } else {
      console.warn('ChatHistoryPanel: Cannot scroll - no scroll container found');
      // Try again after a short delay
      setTimeout(() => {
        this.scrollContainer = this.shadowRoot.querySelector('.chat-history-container');
        if (this.scrollContainer) {
          this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
          console.log('ChatHistoryPanel: Scrolled to bottom (delayed)');
        }
      }, 200);
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
      isLoadingMore: this.isLoadingMore,
      parsedMessagesCount: this.parsedMessages.length
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
          ${this.parsedMessages.length > 0 ? html`
            ${repeat(
              this.parsedMessages,
              (message, i) => i,
              message => {
                if (message.role === 'user') {
                  return html`<user-card .content=${message.content}></user-card>`;
                } else if (message.role === 'assistant') {
                  return html`<assistant-card .content=${message.content}></assistant-card>`;
                } else if (message.role === 'command') {
                  return html`<commands-card .content=${message.content}></commands-card>`;
                }
              }
            )}
          ` : html`
            <div class="debug-info">
              No messages parsed. 
              Content length: ${this.content?.length || 0}
              File size: ${this.fileSize}
              Has more: ${this.hasMore}
              Raw content preview: ${this.content?.substring(0, 200) || 'No content'}
            </div>
          `}
        </div>
      </div>
    `;
  }
}

customElements.define('chat-history-panel', ChatHistoryPanel);
