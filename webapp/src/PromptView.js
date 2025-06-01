/**
 * PromptView component that interfaces with Aider's prompt system via JSON-RPC
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import '@material/web/button/filled-button.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/iconbutton/filled-icon-button.js';
import { UserCard, AssistantCard } from './CardMarkdown.js';
import './SpeechToText.js';

// Register the custom elements
customElements.define('user-card', UserCard);
customElements.define('assistant-card', AssistantCard);

export class PromptView extends JRPCClient {
  static properties = {
    messageHistory: { type: Array, state: true },
    inputValue: { type: String, state: true },
    serverURI: { type: String },
    isProcessing: { type: Boolean, state: true },
    showVoiceInput: { type: Boolean, state: true },
    isMinimized: { type: Boolean, state: true }
  };
  
  constructor() {
    super();
    this.remoteTimeout = 300;
    this.debug = false;
    this.messageHistory = [];
    this.inputValue = '';
    this.serverURI = "ws://0.0.0.0:8999";
    this.isProcessing = false;
    this.showVoiceInput = true;
    this.isMinimized = true;
    this.messageHistory = [
      { role: 'user', content: '' },
      { role: 'assistant', content: '' }
    ];
    
    // Bind the click handler to maintain context
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
  }

  static styles = css`
    :host {
      position: fixed;
      z-index: 1000;
      transition: all 0.3s ease;
      font-family: sans-serif;
    }
    
    :host(.minimized) {
      bottom: 20px;
      right: 20px;
      width: calc(100vw / 6);
      height: 120px;
    }
    
    :host(.maximized) {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: calc(100vw / 3);
      height: 100vh;
      max-height: calc(100vh - 40px);
    }
    
    .dialog-container {
      width: 100%;
      height: 100%;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #e0e0e0;
    }
    
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
      min-height: 48px;
    }
    
    .dialog-title {
      font-weight: 600;
      font-size: 14px;
      color: #333;
      margin: 0;
    }
    
    .dialog-controls {
      display: flex;
      gap: 4px;
    }
    
    .prompt-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
      flex: 1;
    }
    
    .voice-input-container {
      margin-top: 8px;
    }
    
    .message-history {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      background-color: #f9f9f9;
      white-space: pre-wrap;
      min-height: 0;
    }
    
    :host(.minimized) .message-history {
      display: none;
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
    
    .input-area {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-gap: 10px;
      width: 100%;
      padding: 10px;
      flex-shrink: 0;
      background: white;
      border-top: 1px solid #e0e0e0;
    }
    
    :host(.minimized) .input-area {
      grid-template-columns: 1fr;
      grid-gap: 5px;
      padding: 8px;
    }
    
    .controls-column {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 10px;
      height: 100%;
      min-width: 120px;
    }
    
    :host(.minimized) .controls-column {
      flex-direction: row;
      min-width: auto;
      height: auto;
      gap: 5px;
    }
    
    .voice-input-container {
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }
    
    :host(.minimized) .voice-input-container {
      display: none;
    }
    
    textarea {
      flex-grow: 1;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #ccc;
      min-height: 60px;
      resize: vertical;
    }
    
    :host(.minimized) md-filled-text-field {
      --md-filled-text-field-container-shape: 4px;
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
    this.updateDialogClass();
    
    // Add document click listener
    document.addEventListener('click', this.handleDocumentClick, true);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Remove document click listener
    document.removeEventListener('click', this.handleDocumentClick, true);
  }
  
  handleDocumentClick(event) {
    // Check if the click is inside the dialog
    const dialogContainer = this.shadowRoot.querySelector('.dialog-container');
    if (!dialogContainer) return;
    
    // Get the click target
    const clickTarget = event.target;
    
    // Check if click is inside this component
    const isInsideDialog = event.composedPath().includes(this) || 
                          this.shadowRoot.contains(clickTarget) ||
                          clickTarget === this;
    
    if (isInsideDialog) {
      // Click is inside the dialog - maximize if minimized
      if (this.isMinimized) {
        this.maximize();
      }
    } else {
      // Click is outside the dialog - minimize if maximized
      if (!this.isMinimized) {
        this.minimize();
      }
    }
  }
  
  handleDialogClick(event) {
    // Maximize when dialog is clicked (if minimized)
    if (this.isMinimized) {
      this.maximize();
    }
    // Stop propagation to prevent document click handler from running
    event.stopPropagation();
  }
  
  updateDialogClass() {
    if (this.isMinimized) {
      this.classList.add('minimized');
      this.classList.remove('maximized');
    } else {
      this.classList.add('maximized');
      this.classList.remove('minimized');
    }
  }
  
  toggleMinimized() {
    this.isMinimized = !this.isMinimized;
    this.updateDialogClass();
    this.requestUpdate();
  }
  
  maximize() {
    if (this.isMinimized) {
      this.isMinimized = false;
      this.updateDialogClass();
      this.requestUpdate();
    }
  }
  
  minimize() {
    if (!this.isMinimized) {
      this.isMinimized = true;
      this.updateDialogClass();
      this.requestUpdate();
    }
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
  confirmation_request(data) {
    console.log('Confirmation request received:', data);
    
    // Build the prompt message
    let promptMessage = '';
    if (data.subject) {
      promptMessage += `${data.subject}\n\n`;
    }
    promptMessage += data.question || 'Confirm action?';
    
    // Add default information to the prompt
    let defaultText = '';
    let defaultValue = '';
    if (data.default !== null) {
      if (data.default === true) {
        defaultText = ' (default: Yes)';
        defaultValue = 'yes';
      } else if (data.default === false) {
        defaultText = ' (default: No)';
        defaultValue = 'no';
      } else {
        defaultText = ` (default: ${data.default})`;
        defaultValue = String(data.default);
      }
    }
    
    promptMessage += defaultText;
    
    // Show window.prompt with the message and default value
    const userInput = window.prompt(promptMessage, defaultValue);
    console.log('userInput', userInput);
    
    // Handle the response
    if (userInput === null) {
      // User cancelled - use default or false
      return data.default !== null ? data.default : false;
    }
    
    // Parse the user's response
    const response = userInput.toLowerCase().trim();
    
    if (data.allow_never && (response === 'never' || response === 'n')) {
      console.log('returning never');
      return 'never';
    }
    
    // Check for yes/true responses
    if (response === 'yes' || response === 'y' || response === 'true' || response === '1') {
      console.log('returning true');
      return true;
    }
    
    // Check for no/false responses
    if (response === 'no' || response === 'false' || response === '0') {
      console.log('returning false');
      return false;
    }
    
    // If empty response, use default
    if (response === '') {
      console.log('returning ""');
      return data.default !== null ? data.default : false;
    }
    console.log('returning final');
    
    // For any other response, treat as false unless default is true
    return data.default === true ? true : false;
  }
  
  /**
   * LitElement render method
   */
  render() {
    return html`
      <div class="dialog-container" @click=${this.handleDialogClick}>
        <div class="dialog-header">
          <h3 class="dialog-title">AI Assistant</h3>
          <div class="dialog-controls">
            <md-filled-icon-button 
              icon="${this.isMinimized ? 'fullscreen' : 'fullscreen_exit'}"
              @click=${this.toggleMinimized}
              title="${this.isMinimized ? 'Maximize' : 'Minimize'}"
            ></md-filled-icon-button>
          </div>
        </div>
        
        <div class="prompt-container">
          <div class="message-history" id="messageHistory">
            ${repeat(
              this.messageHistory,
              (message, i) => i, // Using index as key since messages may not have unique IDs
              message => {
                if (message.role === 'user') {
                  return html`<user-card .content=${message.content}></user-card>`;
                } else {
                  return html`<assistant-card .content=${message.content}></assistant-card>`;
                }
              }
            )}
          </div>
          <div class="input-area">
            <md-filled-text-field
              id="promptInput"
              type="textarea" 
              label="Enter your prompt"
              rows="${this.isMinimized ? '1' : '2'}"
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
            </div>
          </div>
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
    
    // Maximize dialog when sending a prompt
    if (this.isMinimized) {
      this.maximize();
    }
    
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
          
          // // Add a fallback timeout to reset isProcessing if streamComplete is never called
          // setTimeout(() => {
          //   if (this.isProcessing) {
          //     console.log('Fallback timeout: resetting isProcessing flag');
          //     this.isProcessing = false;
          //     this.requestUpdate();
          //   }
          // }, 500); // 0.5 second timeout
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
   * Check if user is scrolled to bottom of the history container
   */
  _isScrolledToBottom() {
    const historyContainer = this.shadowRoot.getElementById('messageHistory');
    if (historyContainer) {
      const { scrollTop, scrollHeight, clientHeight } = historyContainer;
      // Consider "at bottom" if within 10px of actual bottom
      return Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
    }
    return true;
  }
  
  /**
   * Add a message to the chat history
   */
  addMessageToHistory(role, content) {
    // Check if we're at bottom before adding content
    const shouldScrollToBottom = this._isScrolledToBottom();
    
    this.messageHistory.push({ role, content });
    this.requestUpdate();
    
    // Only scroll to bottom if we were already there
    this.updateComplete.then(() => {
      const historyContainer = this.shadowRoot.getElementById('messageHistory');
      if (historyContainer && shouldScrollToBottom) {
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
    
    // Check if we're at bottom before modifying content
    const shouldScrollToBottom = this._isScrolledToBottom();
    
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
    
    // If final is true, prepare for the next message and refresh file tree
    if (final) {
      console.log('Final chunk received, preparing for next message and refreshing file tree');
      // Refresh the file tree to update git status and context
      this._refreshFileTree();
    }
    
    // Request an immediate update
    this.requestUpdate();
    
    // Only scroll to bottom if we were already there
    await this.updateComplete;
    const historyContainer = this.shadowRoot.getElementById('messageHistory');
    if (historyContainer && shouldScrollToBottom) {
      historyContainer.scrollTop = historyContainer.scrollHeight;
    }
  }
  
  /**
   * Refresh the file tree to update git status and context
   */
  _refreshFileTree() {
    try {
      // Find the MainWindow component
      const mainWindow = document.querySelector('main-window');
      if (mainWindow && mainWindow.shadowRoot) {
        // Find the RepoTree component
        const repoTree = mainWindow.shadowRoot.querySelector('repo-tree');
        if (repoTree && typeof repoTree.loadFileTree === 'function') {
          console.log('Refreshing RepoTree file tree after final chunk');
          repoTree.loadFileTree();
        } else {
          console.warn('RepoTree component not found or loadFileTree method not available');
        }
      } else {
        console.warn('MainWindow component not found');
      }
    } catch (error) {
      console.error('Error refreshing file tree:', error);
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
    
    // Check if we're at bottom before modifying content
    const shouldScrollToBottom = this._isScrolledToBottom();
    
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
    
    // Only scroll to bottom if we were already there
    await this.updateComplete;
    const historyContainer = this.shadowRoot.getElementById('messageHistory');
    if (historyContainer && shouldScrollToBottom) {
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
