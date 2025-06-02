/**
 * PromptView component that provides the UI for interacting with the AI assistant
 */
import {LitElement, html, css} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import '@material/web/button/filled-button.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/iconbutton/filled-icon-button.js';
import '../assistant-card.js';
import '../user-card.js';
import './SpeechToText.js';
import './CommandsCard.js';
import { MessageHandler } from './MessageHandler.js';

export class PromptView extends MessageHandler {
  static properties = {
    ...MessageHandler.properties,
    inputValue: { type: String, state: true },
    showVoiceInput: { type: Boolean, state: true },
    isMinimized: { type: Boolean, state: true },
    coderType: { type: String, state: true }
  };
  
  constructor() {
    super();
    this.inputValue = '';
    this.showVoiceInput = true;
    this.isMinimized = true;
    this.coderType = 'Send';
    
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
                } else if (message.role === 'assistant') {
                  return html`<assistant-card .content=${message.content}></assistant-card>`;
                } else if (message.role === 'command') {
                  return html`<commands-card .content=${message.content}></commands-card>`;
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
                @click=${this.sendPromptUI}
                ?disabled=${this.isProcessing}
              >
                ${this.isProcessing ? 'Processing...' : this.coderType}
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
      this.sendPromptUI();
    }
  }

  /**
   * Send prompt via UI (wrapper for sendPrompt with UI-specific logic)
   */
  async sendPromptUI() {
    const message = this.inputValue.trim();
    
    if (!message || this.isProcessing) return;
    
    // Clear input
    this.inputValue = '';
    
    // Send via inherited sendPrompt method with maximize callback
    await this.sendPrompt(message, () => this.maximize());
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
   * Hook called when a message is added (from MessageHandler)
   */
  onMessageAdded(role, content) {
    // Check if we're at bottom before adding content
    const shouldScrollToBottom = this._isScrolledToBottom();
    
    // Only scroll to bottom if we were already there
    this.updateComplete.then(() => {
      const historyContainer = this.shadowRoot.getElementById('messageHistory');
      if (historyContainer && shouldScrollToBottom) {
        historyContainer.scrollTop = historyContainer.scrollHeight;
      }
    });
  }
  
  /**
   * Hook called when a stream chunk is received (from MessageHandler)
   */
  async onStreamChunk(chunk, final, role) {
    // Check if we're at bottom before modifying content
    const shouldScrollToBottom = this._isScrolledToBottom();
    
    // Only scroll to bottom if we were already there
    await this.updateComplete;
    const historyContainer = this.shadowRoot.getElementById('messageHistory');
    if (historyContainer && shouldScrollToBottom) {
      historyContainer.scrollTop = historyContainer.scrollHeight;
    }
  }
  
  /**
   * Hook called when streaming is complete (from MessageHandler)
   */
  async onStreamComplete() {
    await this.updateComplete;
  }
  
  /**
   * Hook called when a stream error occurs (from MessageHandler)
   */
  async onStreamError(errorMessage) {
    // Check if we're at bottom before modifying content
    const shouldScrollToBottom = this._isScrolledToBottom();
    
    // Only scroll to bottom if we were already there
    await this.updateComplete;
    const historyContainer = this.shadowRoot.getElementById('messageHistory');
    if (historyContainer && shouldScrollToBottom) {
      historyContainer.scrollTop = historyContainer.scrollHeight;
    }
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

  /**
   * Override the MessageHandler.onCoderTypeChanged to update button label
   */
  onCoderTypeChanged(coderType) {
    // Call the parent method
    super.onCoderTypeChanged(coderType);
    
    // Update the coderType property to change the button label
    this.coderType = coderType || 'Send';
    
    // Request UI update
    this.requestUpdate();
    return true;
  }
}
