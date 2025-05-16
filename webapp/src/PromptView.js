/**
 * PromptView component that interfaces with Aider's prompt system via JSON-RPC
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import '@material/web/button/filled-button.js';
import '@material/web/textfield/filled-text-field.js';

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
    // this.requestUpdate();
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
          <md-filled-text-field
            id="promptInput"
            type="textarea" 
            label="Enter your prompt"
            rows="3"
            .value=${this.inputValue}
            @input=${e => this.inputValue = e.target.value}
            @keydown=${this.handleKeyDown}
          ></md-filled-text-field>
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
      // Initialize before sending message
      await this.call['EditBlockCoder.init_before_message']();
      
      // Preprocess the user input
      const processedInput = await this.call['EditBlockCoder.preproc_user_input'](message);
      console.log("Processed input:", processedInput);
      
      // Send the message
      const response = await this.call['EditBlockCoder.send_message'](message);
      
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
