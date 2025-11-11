/**
 * MessageHandler class that manages message history, streaming, and backend communication
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import './prompt/ConfirmationDialog.js';

export class MessageHandler extends JRPCClient {
  static properties = {
    messageHistory: { type: Array, state: true },
    isProcessing: { type: Boolean, state: true },
    serverURI: { type: String },
    isConnected: { type: Boolean, state: true }
  };
  
  constructor() {
    super();
    this.remoteTimeout = 300;
    this.debug = false;
    this.messageHistory = [];
    this.isProcessing = false;
    this.serverURI = "";  // Will be set from parent component
    this.messageHistory = [];
    this._pendingUpdate = false;
    this._updateTimer = null;
    this.isConnected = false;
    this._confirmationDialog = null;
    this._streamingContent = '';  // Accumulator for streaming content
  }

  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
    
    // Create confirmation dialog if it doesn't exist
    this._ensureConfirmationDialog();
  }
  
  /**
   * Ensure confirmation dialog exists
   */
  _ensureConfirmationDialog() {
    if (!this._confirmationDialog) {
      this._confirmationDialog = document.createElement('confirmation-dialog');
      document.body.appendChild(this._confirmationDialog);
    }
  }
  
  /**
   * Called when server is ready to use
   */
  setupDone() {
    console.log('MessageHandler::setupDone - Ready to interact with Aider');
    this.isConnected = true;
    this.requestUpdate();
  }
  
  /**
   * Called when remote is up but not yet ready
   */
  remoteIsUp() {
    console.log('MessageHandler::remoteIsUp - Remote connected');
    // Don't perform operations yet - wait for setupDone
  }
  
  /**
   * Called when remote disconnects
   */
  remoteDisconnected() {
    console.log('MessageHandler::remoteDisconnected');
    this.isConnected = false;
    // If we were processing, mark as not processing
    if (this.isProcessing) {
      this.isProcessing = false;
      this.requestUpdate();
    }
  }

  /**
   * Handle confirmation request from IOWrapper
   * This method is called via JRPC and returns the user's response
   */
  async confirmation_request(data) {
    console.log('Confirmation request received:', data);
    
    // Ensure dialog exists
    this._ensureConfirmationDialog();
    
    try {
      // Show the confirmation dialog and wait for user response
      const response = await this._confirmationDialog.show(data);
      console.log('User response:', response);
      return response;
    } catch (error) {
      console.error('Error showing confirmation dialog:', error);
      // Fallback to default or false if dialog fails
      return data.default !== null ? data.default : false;
    }
  }

  /**
   * Send prompt to Aider via JSON-RPC
   */
  async sendPrompt(message, onMaximize) {
    if (!message || this.isProcessing) return;
    
    // Check if connected
    if (!this.isConnected || !this.call) {
      console.warn('Cannot send prompt - not connected');
      this.addMessageToHistory('assistant', 'Error: Not connected to server. Please wait for connection to be established.');
      return;
    }
    
    // Maximize dialog when sending a prompt
    if (onMaximize) {
      onMaximize();
    }
    
    // Add user message to history
    this.addMessageToHistory('user', message);
    
    // Mark as processing and reset streaming accumulator
    this.isProcessing = true;
    this._streamingContent = '';
    
    try {
      // Call EditBlockCoder.run with named argument dictionary
      console.log('Calling EditBlockCoder.run...');
      this.call['EditBlockCoder.run'](message)
        .then(() => {
          console.log('Run completed');
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
    
    // Call hook for subclasses
    this.onMessageAdded?.(role, content);
  }
  
  /**
   * Batch update mechanism to prevent excessive re-renders
   */
  _scheduleBatchUpdate() {
    if (this._pendingUpdate) return;
    
    this._pendingUpdate = true;
    
    // Clear any existing timer
    if (this._updateTimer) {
      clearTimeout(this._updateTimer);
    }
    
    // Schedule update for next frame
    this._updateTimer = requestAnimationFrame(() => {
      this._pendingUpdate = false;
      this._updateTimer = null;
      this.requestUpdate();
    });
  }
  
  /**
   * Handle streaming chunks from Aider - OPTIMIZED VERSION with role parameter
   * Called by IOWrapper.send_stream_update and send_to_webapp via RPC
   * Returns immediately to avoid blocking Python, processes asynchronously
   */
  streamWrite(chunk, final = false, role = 'assistant') {
    // Return immediately to Python - don't block
    setTimeout(() => this._processStreamChunk(chunk, final, role), 0);
    // No return value needed - Python doesn't wait
  }
  
  /**
   * Process stream chunk asynchronously
   */
  async _processStreamChunk(chunk, final = false, role = 'assistant') {
    // If chunk is null or undefined, skip but don't warn if it's a final marker
    if (!chunk && chunk !== '') {
      if (!final) {
        console.warn('Received null/undefined chunk');
      }
      return;
    }

    this._handleChunk(chunk, final, role);

    // Use batch update mechanism instead of immediate update
    this._scheduleBatchUpdate();
    
    // Call hook for subclasses
    this.onStreamChunk?.(chunk, final, role);
  }
  
  /**
   * Handle message chunks - OPTIMIZED to avoid array recreation
   */
  _handleChunk(chunk, final, role) {
    if (role === 'assistant') {
      // For assistant role, accumulate the streaming content
      this._streamingContent += chunk;
      
      // If there's no assistant message yet, create one
      if (this.messageHistory.length === 0 || this.messageHistory[this.messageHistory.length - 1].role !== 'assistant') {
        this.messageHistory.push({ role: 'assistant', content: '' });
      }
      
      // Get reference to the last message object
      const lastMessage = this.messageHistory[this.messageHistory.length - 1];
      
      // Update with accumulated content
      lastMessage.content = this._streamingContent;
      
      // If this is the final chunk, reset the accumulator
      if (final) {
        this._streamingContent = '';
      }
    } else if (role === 'command') {
      // For command role, append to content (with newline if not empty)
      if (this.messageHistory.length === 0 || this.messageHistory[this.messageHistory.length - 1].role !== 'command') {
        this.messageHistory.push({ role: 'command', content: '' });
      }
      
      const lastMessage = this.messageHistory[this.messageHistory.length - 1];
      
      if (lastMessage.content) {
        lastMessage.content += '\n' + chunk;
      } else {
        lastMessage.content = chunk;
      }
    } else {
      // For other roles, just update the content
      if (this.messageHistory.length === 0 || this.messageHistory[this.messageHistory.length - 1].role !== role) {
        this.messageHistory.push({ role, content: '' });
      }
      
      const lastMessage = this.messageHistory[this.messageHistory.length - 1];
      lastMessage.content = chunk;
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
    // Reset streaming accumulator
    this._streamingContent = '';
    
    // Mark processing as complete
    this.isProcessing = false;
    
    // Force final update
    this._scheduleBatchUpdate();
    
    // Wait for the update to be processed
    await this.updateComplete;
    
    // Call hook for subclasses
    this.onStreamComplete?.();
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
    
    // Reset streaming accumulator
    this._streamingContent = '';
    
    // Add error to message history or update last assistant message
    if (this.messageHistory.length > 0 && this.messageHistory[this.messageHistory.length - 1].role === 'assistant') {
      // Update the existing assistant message
      const lastMessage = this.messageHistory[this.messageHistory.length - 1];
      lastMessage.content += `\n\nError: ${errorMessage}`;
    } else {
      // Add a new error message
      this.addMessageToHistory('assistant', `Error: ${errorMessage}`);
    }
    
    this._scheduleBatchUpdate();
    
    // Call hook for subclasses
    this.onStreamError?.(errorMessage);
  }
  
  /**
   * Handle coder type changes
   * Called when the coder type is switched (e.g., to AskCoder)
   */
  onCoderTypeChanged(coderType) {
    console.log(`Coder type changed to: ${coderType}`);
    
    // Request UI update
    this.requestUpdate();
    return true;
  }

  /**
   * Stop the current running process by sending a KeyboardInterrupt
   */
  async stopRunning() {
    if (!this.isConnected || !this.call) {
      console.warn('Cannot stop running - not connected');
      return;
    }
    
    try {
      console.log('Sending stop signal to CoderWrapper...');
      await this.call['CoderWrapper.stop']();
      console.log('Stop signal sent successfully');
    } catch (error) {
      console.error('Error sending stop signal:', error);
    }
  }
  
  /**
   * Clean up timers on disconnect
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Clear any pending update timers
    if (this._updateTimer) {
      if (typeof this._updateTimer === 'number') {
        clearTimeout(this._updateTimer);
      } else {
        cancelAnimationFrame(this._updateTimer);
      }
      this._updateTimer = null;
    }
    
    // Remove confirmation dialog if it exists
    if (this._confirmationDialog && this._confirmationDialog.parentNode) {
      this._confirmationDialog.parentNode.removeChild(this._confirmationDialog);
      this._confirmationDialog = null;
    }
  }
}
