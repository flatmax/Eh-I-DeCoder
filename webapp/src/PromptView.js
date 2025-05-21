/**
 * PromptView component that interfaces with Aider's prompt system via JSON-RPC
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import '@material/web/button/filled-button.js';
import '@material/web/textfield/filled-text-field.js';
import './card-markdown.js';

export class PromptView extends JRPCClient {
  static properties = {
    messageHistory: { type: Array, state: true },
    inputValue: { type: String, state: true },
    serverURI: { type: String },
    isProcessing: { type: Boolean, state: true }
  };
  
  constructor() {
    super();
    this.remoteTimeout = 300;
    this.debug = false;
    this.messageHistory = [];
    this.inputValue = '';
    this.serverURI = "ws://0.0.0.0:9000";
    this.isProcessing = false;
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
      max-height: 600px;
      white-space: pre-wrap;
    }
    .assistant-message {
      background-color: #f1f1f1;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      align-self: flex-start;
      white-space: pre-wrap;
      font-family: monospace;
    }
    /* Message styling now handled by card-markdown component */
    .input-area {
      display: flex;
      flex-direction: column;
      width: 100%;
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

  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  /**
   * Called when server is ready to use
   */
  setupDone() {
    console.log('PromptView setupDone: Ready to interact with Aider');
  }

  /**
   * Called when remote server is up
   */
  remoteIsUp() {
    console.log('PromptView::remoteIsUp');
  }
  
  /**
   * LitElement render method
   */
  render() {
    return html`
      <div class="prompt-container">
        <div class="message-history" id="messageHistory">
          ${repeat(
            this.messageHistory,
            (message, i) => i, // Using index as key since messages may not have unique IDs
            message => html`
              <card-markdown 
                .role=${message.role} 
                .content=${message.content}
              ></card-markdown>
            `
          )}
        </div>
        <div class="input-area">
          <md-filled-text-field
            id="promptInput"
            type="textarea" 
            label="Enter your prompt"
            rows="3"
            .value=${this.inputValue}
            @input=${e => this.inputValue = e.target.value}
            @keydown=${this.handleKeyDown}
            ?disabled=${this.isProcessing}
            style="width: 100%;"
          ></md-filled-text-field>
          <div style="display: flex; justify-content: flex-end;">
            <md-filled-button 
              id="sendButton" 
              @click=${this.sendPrompt}
              ?disabled=${this.isProcessing}
            >
              ${this.isProcessing ? 'Processing...' : 'Send'}
            </md-filled-button>
          </div>
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
    
    if (!message || this.isProcessing) return;
    
    // Add user message to history
    this.addMessageToHistory('user', message);
    
    // Clear input and mark as processing
    this.inputValue = '';
    this.isProcessing = true;
    
    try {
      // Add placeholder for assistant response
      this.addMessageToHistory('assistant', '');
      
      // Call CoderWrapper.run instead of PromptStreamer.stream_prompt
      console.log('Calling CoderWrapper.run...');
      await this.call['CoderWrapper.run'](message, true);
      console.log('Run completed');
      
      // Note: The IOWrapper will handle streaming the response via streamWrite
    } catch (error) {
      console.error('Error sending prompt to Aider:', error);
      this.addMessageToHistory('assistant', `Error: ${error.message || 'Failed to communicate with Aider'}`);
    } finally {
      this.isProcessing = false;
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
   * Handle streaming chunks from Aider
   * Called by IOWrapper.send_stream_update and send_to_webapp via RPC
   */
  streamWrite(chunk, final = false) {
    console.log('Chunk received:', typeof chunk === 'string' ? `length: ${chunk.length}` : 'non-string chunk', 'final:', final);
    
    // If chunk is null or undefined, handle gracefully
    if (!chunk) {
      console.warn('Received empty chunk');
      return "empty chunk ignored";
    }
    
    // If there's no assistant message yet, create one
    if (this.messageHistory.length === 0 || this.messageHistory[this.messageHistory.length - 1].role !== 'assistant') {
      this.addMessageToHistory('assistant', '');
    }
    
    // Append the chunk to the last message
    const lastIndex = this.messageHistory.length - 1;
    this.messageHistory[lastIndex].content += chunk;
    
    // If final is true, prepare for the next message
    if (final) {
      console.log('Final chunk received, preparing for next message');
      // The streamComplete method will be called separately to finish this message
    }
    
    this.requestUpdate();
    
    // Scroll to bottom after update
    this.updateComplete.then(() => {
      const historyContainer = this.shadowRoot.getElementById('messageHistory');
      if (historyContainer) {
        historyContainer.scrollTop = historyContainer.scrollHeight;
      }
    });
    
    return "chunk received"; // Return a response to confirm receipt
  }
  
  /**
   * Handle completion of streaming
   * Called by PromptStreamer when streaming is complete
   */
  streamComplete() {
    console.log('Streaming complete');
    // Additional completion logic can be added here
  }
  
  /**
   * Handle errors during streaming
   * Called by IOWrapper when streaming encounters an error
   */
  streamError(errorMessage) {
    console.error('Streaming error:', errorMessage);
    
    // Add error to message history or update last assistant message
    if (this.messageHistory.length > 0 && this.messageHistory[this.messageHistory.length - 1].role === 'assistant') {
      // Update the existing assistant message
      const lastIndex = this.messageHistory.length - 1;
      this.messageHistory[lastIndex].content += `\n\nError: ${errorMessage}`;
    } else {
      // Add a new error message
      this.addMessageToHistory('assistant', `Error: ${errorMessage}`);
    }
    
    this.requestUpdate();
    
    // Scroll to bottom after update
    this.updateComplete.then(() => {
      const historyContainer = this.shadowRoot.getElementById('messageHistory');
      if (historyContainer) {
        historyContainer.scrollTop = historyContainer.scrollHeight;
      }
    });
    
    return "error handled"; // Return a response to confirm receipt
  }
  
  /**
   * Simple method to test RPC callbacks
   */
  sayHello() {
    console.log('Hello from PromptView!');
    return 'Hello received';
  }

  /**
   * Clear chat history
   */
  clearHistory() {
    this.messageHistory = [];
    
    // Also reset the Aider chat context
    try {
      this.call['EditBlockCoder.move_back_cur_messages']();
      this.call['EditBlockCoder.init_before_message']();
    } catch (error) {
      console.error('Error resetting Aider context:', error);
    }
    
    this.requestUpdate();
  }

  /**
   * Method to select files to be added to Aider's context
   */
  async selectFiles() {
    try {
      // Get all addable files from the repository
      const availableFiles = await this.call['EditBlockCoder.get_addable_relative_files']();
      
      // For now, we'll use a simple prompt
      const fileList = availableFiles.join('\n');
      
      // Show list of available files and ask for selection
      const selectedFile = prompt(
        `Available files (enter file path to add):\n${fileList}`, 
        availableFiles.length > 0 ? availableFiles[0] : ''
      );
      
      if (selectedFile && selectedFile.trim()) {
        try {
          // Call Aider method to add file
          await this.call['EditBlockCoder.add_rel_fname'](selectedFile);
          
          // Get chat files to confirm
          const chatFiles = await this.call['EditBlockCoder.get_inchat_relative_files']();
          
          // Get file content to display
          const fileContent = await this.call['EditBlockCoder.get_files_content']();
          const filePreview = fileContent[selectedFile] ? 
            `\nPreview: ${fileContent[selectedFile].substring(0, 100)}...` : '';
          
          this.addMessageToHistory('assistant', `Added file: ${selectedFile}\nFiles in chat: ${chatFiles.join(', ')}${filePreview}`);
        } catch (error) {
          console.error('Error adding file:', error);
          this.addMessageToHistory('assistant', `Error adding file: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Error selecting files:', error);
      this.addMessageToHistory('assistant', `Error getting file list: ${error.message}`);
    }
  }
}
