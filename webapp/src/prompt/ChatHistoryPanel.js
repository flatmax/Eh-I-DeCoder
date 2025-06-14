/**
 * ChatHistoryPanel component for displaying chat history with infinite scrolling
 */
import { html } from 'lit';
import {JRPCClient} from '@flatmax/jrpc-oo';
import { repeat } from 'lit/directives/repeat.js';
import { ChatHistoryStyles } from './ChatHistoryStyles.js';
import { MessageParser } from './MessageParser.js';
import { ChatScrollManager } from './ChatScrollManager.js';
import { extractResponseData } from '../Utils.js';
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
    this.remoteTimeout = 300;
    this.parsedMessages = [];
    
    this.messageParser = new MessageParser();
    this.scrollManager = new ChatScrollManager(this);
    console.log('ChatHistoryPanel::constructor')
  }

  static styles = ChatHistoryStyles.styles;

  firstUpdated() {
    console.log('ChatHistoryPanel::firstUpdated')
    // No logging needed here
  }

  updated(changedProperties) {
    console.log('ChatHistoryPanel::updated')
    super.updated(changedProperties);
    
    this.scrollManager.setupScrollContainer();

    // Parse content when it changes
    if (changedProperties.has('content')) {
      this.parsedMessages = this.messageParser.parseContent(this.content);
    }
  }

  connectedCallback() {
    console.log('ChatHistoryPanel::connectedCallback')
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  disconnectedCallback() {
    console.log('ChatHistoryPanel::disconnectedCallback')
    super.disconnectedCallback();
  }
  
  attributeChangedCallback() {
    console.log('ChatHistoryPanel::attributeChangedCallback')
  }
  
  adoptedCallback() {
    console.log('ChatHistoryPanel::adoptedCallback')
  }
  
  setupDone() {
    console.log('ChatHistoryPanel::setupDone')
    this.loadInitialContent();
  }

  async loadInitialContent() {
    try {
      this.loading = true;
      this.error = null;
      
      if (!this.call) {
        throw new Error('JRPC call object not available');
      }
      
      if (!this.call['ChatHistory.get_latest_content']) {
        console.error('ChatHistoryPanel: Available methods:', Object.keys(this.call));
        throw new Error('ChatHistory.get_latest_content method not available');
      }

      const response = await this.call['ChatHistory.get_latest_content']();
      
      // Extract the actual data from the UUID-wrapped response
      let data = null;
      
      // If response is an object with UUID keys, extract the first value
      if (response && typeof response === 'object' && !Array.isArray(response)) {
        const keys = Object.keys(response);
        if (keys.length > 0 && keys[0].match(/^[0-9a-f-]+$/i)) {
          // Looks like a UUID key, extract the value
          data = response[keys[0]];
        } else {
          // Not UUID wrapped, use as is
          data = response;
        }
      } else {
        data = response;
      }
      
      // Now check if data has the expected structure
      if (data && typeof data === 'object' && 'content' in data) {
        this.content = data.content || '';
        this.currentStartPos = data.start_pos || 0;
        this.hasMore = data.has_more || false;
        this.fileSize = data.file_size || 0;
      } else {
        console.warn('ChatHistoryPanel: Response does not have expected structure:', data);
        this.content = '';
        this.hasMore = false;
        this.fileSize = 0;
      }

      this.loading = false;

      // Scroll to bottom after content loads and DOM updates
      await this.updateComplete;
      this.scrollManager.scrollToBottomOnInitialLoad();

    } catch (error) {
      console.error('ChatHistoryPanel: Error loading chat history:', error);
      this.error = `Failed to load chat history: ${error.message}`;
      this.loading = false;
    }
  }

  async loadMoreContent() {
    if (this.isLoadingMore || !this.hasMore) {
      return;
    }

    try {
      this.isLoadingMore = true;

      const response = await this.call['ChatHistory.load_previous_chunk_remote'](this.currentStartPos);
      
      // Extract the actual data from the UUID-wrapped response
      let data = null;
      
      if (response && typeof response === 'object' && !Array.isArray(response)) {
        const keys = Object.keys(response);
        if (keys.length > 0 && keys[0].match(/^[0-9a-f-]+$/i)) {
          data = response[keys[0]];
        } else {
          data = response;
        }
      } else {
        data = response;
      }
      
      if (data && typeof data === 'object' && 'content' in data && data.content) {
        // Store current scroll position
        const scrollState = this.scrollManager.saveScrollState();

        // Prepend new content
        this.content = data.content + this.content;
        this.currentStartPos = data.start_pos || 0;
        this.hasMore = data.has_more || false;

        // Wait for DOM update
        await this.updateComplete;

        // Restore scroll position
        this.scrollManager.restoreScrollState(scrollState);
      } else {
        console.warn('ChatHistoryPanel: Invalid loadMoreContent response:', data);
      }

    } catch (error) {
      console.error('ChatHistoryPanel: Error loading more content:', error);
    } finally {
      this.isLoadingMore = false;
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
