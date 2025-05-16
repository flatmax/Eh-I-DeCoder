/**
 * PromptView component that interfaces with Aider's prompt system via JSON-RPC
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import '@material/web/button/filled-button.js';

export class PromptView extends JRPCClient {
  constructor() {
    super();
    this.remoteTimeout = 300;
    this.debug = false;
    this.messageHistory = [];
    this.inputValue = '';
  }

  static styles = css`
    :host {
      display: block;
      font-family: sans-serif;
      width: 100%;
    }
    .prompt-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }
    .message-history {
      flex-grow: 1;
      overflow-y: auto;
      border: 1px solid #ccc;
      padding: 10px;
      margin-bottom: 10px;
      background-color: #f9f9f9;
      border-radius: 4px;
      max-height: 400px;
    }
    .user-message {
      background-color: #e1f5fe;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      align-self: flex-end;
    }
    .assistant-message {
      background-color: #f1f1f1;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      align-self: flex-start;
    }
    .input-area {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
    }
    .controls {
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
    }
    textarea {
      flex-grow: 1;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #ccc;
      min-height: 60px;
      resize: vertical;
    }
    button {
      padding: 8px 16px;
      background-color: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #1565c0;
    }
  `;

  /**
   * Called when server is ready to use
   */
  setupDone() {
    console.log('PromptView setupDone: Ready to interact with Aider');
    this.requestUpdate();
  }

  /**
   * Called when remote server is up
   */
  remoteIsUp() {
    console.log('PromptView::remoteIsUp');
    this.addClass(this);
    this.requestUpdate();
  }
  
  /**
   * LitElement render method
   */
  render() {
    return html`
      <div class="prompt-container">
        <div class="message-history" id="messageHistory">
          ${this.messageHistory.map(message => html`
            <div class="${message.role === 'user' ? 'user-message' : 'assistant-message'}">
              ${message.content}
            </div>
          `)}
        </div>
        <div class="input-area">
          <textarea 
            id="promptInput" 
            placeholder="Enter your prompt" 
            rows="3"
            .value=${this.inputValue}
            @input=${e => this.inputValue = e.target.value}
            @keydown=${this.handleKeyDown}
          ></textarea>
          <md-filled-button id="sendButton" @click=${this.sendPrompt}>Send</md-filled-button>
        </div>
        <div class="controls">
          <md-filled-button id="clearButton" @click=${this.clearHistory}>Clear History</md-filled-button>
          <md-filled-button id="fileButton" @click=${this.selectFiles}>Select Files</md-filled-button>
        </div>
      </div>
    `;
  }
  
  /**
   * Handle keyboard events
   */
  handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendPrompt();
    }
  }

  /**
   * Send prompt to Aider via JSON-RPC
   */
  async sendPrompt() {
    const message = this.inputValue.trim();
    
    if (!message) return;
    
    // Add user message to history
    this.addMessageToHistory('user', message);
    
    // Clear input
    this.inputValue = '';
    this.requestUpdate();
    
    try {
      // Call Aider's chat method via RPC
      const response = await this.server['Aider.chat'](message);
      
      // Add assistant response to history
      this.addMessageToHistory('assistant', response);
    } catch (error) {
      console.error('Error sending prompt to Aider:', error);
      this.addMessageToHistory('assistant', `Error: ${error.message || 'Failed to communicate with Aider'}`);
    }
  }

  /**
   * Add a message to the chat history
   */
  addMessageToHistory(role, content) {
    this.messageHistory.push({ role, content });
    this.requestUpdate();
    
    // Scroll to bottom after update
    this.updateComplete.then(() => {
      const historyContainer = this.shadowRoot.getElementById('messageHistory');
      if (historyContainer) {
        historyContainer.scrollTop = historyContainer.scrollHeight;
      }
    });
  }

  /**
   * Clear chat history
   */
  clearHistory() {
    this.messageHistory = [];
    this.requestUpdate();
  }

  /**
   * Method to select files to be added to Aider's context
   */
  async selectFiles() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      
      input.onchange = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
          const fileNames = files.map(f => f.name);
          try {
            // Call Aider method to add files
            const result = await this.server['Aider.add_files'](fileNames);
            this.addMessageToHistory('assistant', `Added files: ${fileNames.join(', ')}`);
          } catch (error) {
            console.error('Error adding files:', error);
            this.addMessageToHistory('assistant', `Error adding files: ${error.message}`);
          }
        }
      };
      
      input.click();
    } catch (error) {
      console.error('Error selecting files:', error);
    }
  }
}
