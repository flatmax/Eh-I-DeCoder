/**
 * PromptView component that interfaces with Aider's prompt system via JSON-RPC
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import '@material/web/button/filled-button.js';
import '@material/web/textfield/filled-text-field.js';
import '../card-markdown.js';
import './SpeechToText.js';

export class PromptView extends JRPCClient {
  static properties = {
    messageHistory: { type: Array, state: true },
    inputValue: { type: String, state: true },
    serverURI: { type: String },
    isProcessing: { type: Boolean, state: true },
    showVoiceInput: { type: Boolean, state: true },
    showConfirmationDialog: { type: Boolean, state: true },
    confirmationData: { type: Object, state: true }
  };
  
  constructor() {
    super();
    this.remoteTimeout = 300;
    this.debug = false;
    this.messageHistory = [];
    this.inputValue = '';
    this.serverURI = "ws://0.0.0.0:9000";
    this.isProcessing = false;
    this.showVoiceInput = true;
    this.showConfirmationDialog = false;
    this.confirmationData = null;
    this.confirmationResolve = null;
    this.messageHistory = [
      { role: 'user', content: '' },
      { role: 'assistant', content: '' }
    ];
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      font-family: sans-serif;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .prompt-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .voice-input-container {
      margin-top: 8px;
    }
    .message-history {
      flex: 1;
      overflow-y: auto;
      border: 1px solid #ccc;
      padding: 10px;
      margin-bottom: 10px;
      background-color: #f9f9f9;
      border-radius: 4px;
      white-space: pre-wrap;
      min-height: 200px;
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
      display: grid;
      grid-template-columns: 1fr auto;
      grid-gap: 10px;
      width: 100%;
      min-height: 120px;
      flex-shrink: 0;
    }
    .controls-column {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 10px;
      height: 100%;
      min-width: 120px;
    }
    .voice-input-container {
      display: flex;
      flex-direction: column;
      align-items: stretch;
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
    .confirmation-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(2px);
    }
    .confirmation-dialog {
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      min-width: 300px;
      margin: 20px;
    }
    .confirmation-subject {
      font-weight: bold;
      font-size: 18px;
      color: #333;
      margin-bottom: 12px;
      border-bottom: 1px solid #eee;
      padding-bottom: 8px;
    }
    .confirmation-question {
      font-size: 16px;
      line-height: 1.5;
      color: #555;
      margin-bottom: 24px;
      white-space: pre-wrap;
    }
    .confirmation-buttons {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .confirmation-buttons md-filled-button {
      min-width: 80px;
    }
    .confirmation-buttons md-filled-button:first-child {
      --md-filled-button-container-color: #666;
    }
    .confirmation-buttons md-filled-button:nth-child(2) {
      --md-filled-button-container-color: #ff6b35;
    }
    .confirmation-buttons md-filled-button:last-child {
      --md-filled-button-container-color: #1976d2;
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
    this.requestUpdate();
  }

  /**
   * Called when remote server is up
   */
  remoteIsUp() {
    console.log('PromptView::remoteIsUp');
  }

  /**
   * Handle confirmation request from IOWrapper
   * This method is called via JRPC and returns the user's response
   */
  async confirmation_request(data) {
    console.log('Confirmation request received:', data);
    
    // Show the confirmation dialog
    this.confirmationData = data;
    this.showConfirmationDialog = true;
    this.requestUpdate();
    
    // Return a promise that resolves when user responds
    return new Promise((resolve) => {
      this.confirmationResolve = resolve;
    });
  }

  /**
   * Handle confirmation response
   */
  handleConfirmationResponse(response) {
    console.log('Confirmation response:', response);
    this.showConfirmationDialog = false;
    this.confirmationData = null;
    
    // Resolve the promise with the user's response
    if (this.confirmationResolve) {
      this.confirmationResolve(response);
      this.confirmationResolve = null;
    }
    
    this.requestUpdate();
  }

  /**
   * Handle escape key to close confirmation dialog
   */
  handleConfirmationKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      // Use default value or false if no default
      const defaultResponse = this.confirmationData?.default !== null ? this.confirmationData.default : false;
      this.handleConfirmationResponse(defaultResponse);
    }
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
          <div class="controls-column">
            <md-filled-button 
              id="sendButton" 
              @click=${this.sendPrompt}
              ?disabled=${this.isProcessing}
            >
              ${this.isProcessing ? 'Processing...' : 'Send'}
            </md-filled-button>
            
            <div class="voice-input-container">
              ${this.showVoiceInput ? html`
                <speech-to-text
                  @transcript=${this._handleTranscript}
                  @recording-started=${this._handleRecordingStarted}
                  @recognition-error=${this._handleRecognitionError}
                ></speech-to-text>
              ` : ''}
            </div>
            
            <md-filled-button id="clearButton" @click=${this.clearHistory}>Clear</md-filled-button>
          </div>
        </div>
      </div>

      ${this.showConfirmationDialog ? html`
        <div class="confirmation-overlay" 
             @click=${(e) => e.target === e.currentTarget && this.handleConfirmationResponse(this.confirmationData?.default !== null ? this.confirmationData.default : false)}
             @keydown=${this.handleConfirmationKeydown}
             tabindex="0">
          <div class="confirmation-dialog">
            ${this.confirmationData?.subject ? html`
              <div class="confirmation-subject">${this.confirmationData.subject}</div>
            ` : ''}
            <div class="confirmation-question">${this.confirmationData?.question || 'Confirm action?'}</div>
            <div class="confirmation-buttons">
              <md-filled-button @click=${() => this.handleConfirmationResponse(false)}>
                ${this.confirmationData?.explicit_yes_required ? 'No' : (this.confirmationData?.default === false ? 'No (default)' : 'No')}
              </md-filled-button>
              ${this.confirmationData?.allow_never ? html`
                <md-filled-button @click=${() => this.handleConfirmationResponse('never')}>
                  Never
                </md-filled-button>
              ` : ''}
              <md-filled-button @click=${() => this.handleConfirmationResponse(true)}>
                ${this.confirmationData?.default === true ? 'Yes (default)' : 'Yes'}
              </md-filled-button>
            </div>
          </div>
        </div>
      ` : ''}
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
      
      // Call EditBlockCoder.run with named argument dictionary
      console.log('Calling EditBlockCoder.run...');
      this.call['EditBlockCoder.run'](message)
        .then(() => {
          console.log('Run completed');
          
          // Add a fallback timeout to reset isProcessing if streamComplete is never called
          setTimeout(() => {
            if (this.isProcessing) {
              console.log('Fallback timeout: resetting isProcessing flag');
              this.isProcessing = false;
              this.requestUpdate();
            }
          }, 500); // 0.5 second timeout
        })
        .catch(error => {
          console.error('Error from EditBlockCoder.run promise:', error);
          this.isProcessing = false;
        });
      
      // Note: The IOWrapper will handle streaming the response via streamWrite
    } catch (error) {
      console.error('Error sending prompt to Aider:', error);
      this.addMessageToHistory('assistant', `Error: ${error.message || 'Failed to communicate with Aider'}`);
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
   * Handle streaming chunks from Aider - OPTIMIZED VERSION
   * Called by IOWrapper.send_stream_update and send_to_webapp via RPC
   * Returns immediately to avoid blocking Python, processes asynchronously
   */
  streamWrite(chunk, final = false) {
    // Return immediately to Python - don't block
    setTimeout(() => this._processStreamChunk(chunk, final), 0);
    // No return value needed - Python doesn't wait
  }
  
  /**
   * Process stream chunk asynchronously
   */
  async _processStreamChunk(chunk, final = false) {
    const timestamp = new Date();
    console.log(`Chunk received at ${timestamp.toISOString()} (${timestamp.getTime()})`, 
      typeof chunk === 'string' ? `length: ${chunk.length}` : 'non-string chunk', 
      'final:', final);
    
    // If chunk is null or undefined, handle gracefully
    if (!chunk) {
      console.warn('Received empty chunk');
      return;
    }
    
    // If there's no assistant message yet, create one
    if (this.messageHistory.length === 0 || this.messageHistory[this.messageHistory.length - 1].role !== 'assistant') {
      this.addMessageToHistory('assistant', '');
    }
    
    // Append the chunk to the last message
    const lastIndex = this.messageHistory.length - 1;
    this.messageHistory[lastIndex].content = chunk;
    
    // Force a re-render by creating a new array
    this.messageHistory = [...this.messageHistory];
    
    // If final is true, prepare for the next message
    if (final) {
      console.log('Final chunk received, preparing for next message');
      // The streamComplete method will be called separately to finish this message
    }
    
    // Request an immediate update
    this.requestUpdate();
    
    // Scroll to bottom after update
    await this.updateComplete;
    const historyContainer = this.shadowRoot.getElementById('messageHistory');
    if (historyContainer) {
      historyContainer.scrollTop = historyContainer.scrollHeight;
    }
  }
  
  /**
   * Handle completion of streaming - OPTIMIZED VERSION
   * Called by PromptStreamer when streaming is complete
   * Returns immediately to avoid blocking Python
   */
  streamComplete() {
    // Return immediately to Python - don't block
    setTimeout(() => this._processStreamComplete(), 0);
    // No return value needed - Python doesn't wait
  }
  
  /**
   * Process stream completion asynchronously
   */
  async _processStreamComplete() {
    console.log('Streaming complete - resetting isProcessing flag');
    // Mark processing as complete
    this.isProcessing = false;
    this.requestUpdate();
    
    // Force the update to be processed immediately
    await this.updateComplete;
    console.log('Update completed after streaming complete');
  }
  
  /**
   * Handle errors during streaming - OPTIMIZED VERSION
   * Called by IOWrapper when streaming encounters an error
   * Returns immediately to avoid blocking Python
   */
  streamError(errorMessage) {
    // Return immediately to Python - don't block
    setTimeout(() => this._processStreamError(errorMessage), 0);
    // No return value needed - Python doesn't wait
  }
  
  /**
   * Process stream error asynchronously
   */
  async _processStreamError(errorMessage) {
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
    await this.updateComplete;
    const historyContainer = this.shadowRoot.getElementById('messageHistory');
    if (historyContainer) {
      historyContainer.scrollTop = historyContainer.scrollHeight;
    }
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
    // Reset to initial example messages instead of empty array
    this.messageHistory = [
      { role: 'user', content: '' },
      { role: 'assistant', content: '' }
    ];
    
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
   * Handle transcript from speech recognition
   */
  _handleTranscript(event) {
    const text = event.detail.text;
    if (!text) return;
    
    // If input already has text, add a space before appending
    if (this.inputValue && this.inputValue.trim() !== '') {
      this.inputValue += ' ' + text;
    } else {
      this.inputValue = text;
    }
  }
  
  /**
   * Handle recording started event
   */
  _handleRecordingStarted() {
    // Could add any additional UI changes when recording starts
    console.log('Voice recording started');
  }
  
  /**
   * Handle recognition errors
   */
  _handleRecognitionError(event) {
    console.error('Speech recognition error:', event.detail.error);
    // Could show an error toast or message to the user
  }
  
  /* Controls reduced as requested */
}

