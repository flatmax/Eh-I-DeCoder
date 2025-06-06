/**
 * PromptView component that provides the UI for interacting with the AI assistant
 */
import {LitElement, html, css} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import '@material/web/button/filled-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/icon/icon.js';
import '../assistant-card.js';
import '../user-card.js';
import '../speech-to-text.js';
import '../commands-card.js';
import { MessageHandler } from './MessageHandler.js';

export class PromptView extends MessageHandler {
  static properties = {
    ...MessageHandler.properties,
    inputValue: { type: String, state: true },
    showVoiceInput: { type: Boolean, state: true },
    isMinimized: { type: Boolean, state: false },
    coderType: { type: String, state: true },
    // Drag properties
    isDragging: { type: Boolean, state: true },
    position: { type: Object, state: true }, // Single position state
    hasBeenDragged: { type: Boolean, state: true }
  };
  
  constructor() {
    super();
    this.inputValue = '';
    this.showVoiceInput = true;
    this.isMinimized = false;
    this.coderType = 'Send';
    
    // Drag state
    this.isDragging = false;
    // Position it at 1/6 from the left of the screen and at the top
    this.position = { 
      x: window.innerWidth / 6, 
      y: 20 // Position near the top with a small margin
    };
    this.hasBeenDragged = true;
    this.dragOffset = { x: 0, y: 0 };
    
    // Bind event handlers to maintain context
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDrag = this.handleDrag.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
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
    
    /* When moved by user */
    :host(.dragged) {
      position: fixed !important;
      bottom: auto !important;
      right: auto !important;
      top: auto !important;
      left: 0 !important;
      /* Position is handled by translate3d transform for better performance */
    }
    
    :host(.maximized) {
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: calc(100vw / 3);
      height: 100vh;
      max-height: calc(100vh - 40px);
    }
    
    :host(.dragging) {
      transition: none;
      position: absolute;
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
      user-select: none; /* Prevent text selection during drag */
      cursor: grab; /* Indicate draggable */
    }
    
    .dialog-header:active {
      cursor: grabbing; /* Change cursor when actively dragging */
    }
    
    .dialog-title {
      font-weight: 600;
      font-size: 14px;
      color: #333;
      margin: 0;
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
    
    .button-row {
      display: flex;
      align-items: center;
      gap: 5px;
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
    
    // Apply initial position
    if (this.hasBeenDragged) {
      this.style.transform = `translate3d(${this.position.x}px, ${this.position.y}px, 0)`;
    }
    
    // Add document click listener
    document.addEventListener('click', this.handleDocumentClick, true);
    
    // Add global mouse event listeners for dragging with proper binding
    this._boundDragHandler = this.handleDrag.bind(this);
    this._boundDragEndHandler = this.handleDragEnd.bind(this);
    
    document.addEventListener('mousemove', this._boundDragHandler);
    document.addEventListener('mouseup', this._boundDragEndHandler);
    
    console.log('PromptView connected, drag handlers attached');
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Remove all event listeners using the properly stored bound handlers
    document.removeEventListener('click', this.handleDocumentClick, true);
    document.removeEventListener('mousemove', this._boundDragHandler);
    document.removeEventListener('mouseup', this._boundDragEndHandler);
    
    console.log('PromptView disconnected, drag handlers removed');
  }
  
  
  handleHeaderClick(event) {
    // Only toggle if we weren't dragging
    if (!this.isDragging && !this._wasDragging) {
      // Toggle between minimized and maximized when header is clicked
      if (this.isMinimized) {
        this.maximize();
      } else {
        this.minimize();
      }
      // Prevent other click handlers from firing
      event.stopPropagation();
    }
    
    // Reset drag flag after click is processed
    this._wasDragging = false;
  }
  
  // Drag event handlers
  handleDragStart(event) {
    // Ignore non-left button clicks or if already dragging
    if (event.button !== 0 || this.isDragging) return;
    
    // Get current position
    const rect = this.getBoundingClientRect();
    
    // Calculate the offset between mouse position and dialog top-left
    this.dragOffset = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    
    // Store initial position
    this.position = { 
      x: rect.left, 
      y: rect.top 
    };
    
    // Add dragging class to disable transitions during drag
    this.classList.add('dragging');
    this.style.cursor = 'grabbing';
    
    // Mark as dragging
    this.isDragging = true;
    
    // Update position with translate3d for hardware acceleration
    this.style.transform = `translate3d(${this.position.x}px, ${this.position.y}px, 0)`;
    
    // Prevent default to avoid text selection
    event.preventDefault();
    
    console.log('Drag start:', this.position);
  }
  
  handleDrag(event) {
    if (!this.isDragging) return;
    
    // Calculate new position
    const x = event.clientX - this.dragOffset.x;
    const y = event.clientY - this.dragOffset.y;
    
    // Update position state
    this.position = { x, y };
    
    // Apply position using translate3d for hardware acceleration
    this.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    
    // Mark as dragged
    this.hasBeenDragged = true;
    
    // Set flag to prevent click handler from firing
    this._wasDragging = true;
    
    // Prevent default behavior
    event.preventDefault();
    
    // Debug
    if (event.clientX % 100 < 1) {
      console.log('Dragging to:', x, y);
    }
  }
  
  handleDragEnd(event) {
    if (!this.isDragging) return;
    
    // Update dragging state
    this.isDragging = false;
    
    // Reset cursor
    this.style.cursor = '';
    
    // Keep dragged state and final position
    this.classList.remove('dragging');
    this.classList.add('dragged');
    
    console.log('Drag ended at:', this.position.x, this.position.y);
    console.log('Final transform:', this.style.transform);
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
      // Update minimized/maximized classes
      this.classList.add('minimized');
      this.classList.remove('maximized');
    } else {
      // Update maximized/minimized classes
      this.classList.add('maximized');
      this.classList.remove('minimized');
    }
    
    // Apply dragged state if needed
    if (this.hasBeenDragged) {
      this.classList.add('dragged');
      // Ensure transform is applied (might get cleared by CSS)
      requestAnimationFrame(() => {
        if (this.position && this.position.x !== undefined && this.position.y !== undefined) {
          this.style.transform = `translate3d(${this.position.x}px, ${this.position.y}px, 0)`;
          console.log('Updating position in rAF:', this.position);
        }
      });
    } else {
      this.classList.remove('dragged');
      this.style.transform = '';
    }
    
    // Remove dragging class if we're not actively dragging
    if (!this.isDragging) {
      this.classList.remove('dragging');
    }
  }
  
  maximize() {
    if (this.isMinimized) {
      this.isMinimized = false;
      
      // Reset position when switching to maximized view
      // if we haven't dragged it yet
      if (!this.hasBeenDragged) {
        this.style.transform = '';
      }
      
      this.updateDialogClass();
      this.requestUpdate();
    }
  }
  
  minimize() {
    if (!this.isMinimized) {
      this.isMinimized = true;
      
      // Reset position when switching to minimized view
      // if we haven't dragged it yet
      if (!this.hasBeenDragged) {
        this.style.transform = '';
      }
      
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
        <div class="dialog-header" 
          @mousedown=${this.handleDragStart}
          @click=${this.handleHeaderClick}>
          <h3 class="dialog-title">AI Assistant</h3>
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
              <div class="button-row">
                <md-filled-button 
                  id="sendButton" 
                  @click=${this.sendPromptUI}
                  ?disabled=${this.isProcessing}
                >
                  ${this.isProcessing ? 'Processing...' : this.coderType}
                </md-filled-button>
                
                ${this.isProcessing ? html`
                  <md-icon-button 
                    id="stopButton" 
                    @click=${this.stopRunning}
                    style="background-color: #d32f2f; color: white;"
                  >
                    <md-icon>stop</md-icon>
                  </md-icon-button>
                ` : ''}
              </div>
              
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
