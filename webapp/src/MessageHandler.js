/**
 * MessageHandler class that manages message history, streaming, and backend communication
 */
import {JRPCClient} from '@flatmax/jrpc-oo';

export class MessageHandler extends JRPCClient {
  static properties = {
    messageHistory: { type: Array, state: true },
    isProcessing: { type: Boolean, state: true },
    serverURI: { type: String }
  };
  
  constructor() {
    super();
    this.remoteTimeout = 300;
    this.debug = false;
    this.messageHistory = [];
    this.isProcessing = false;
    this.serverURI = "";  // Will be set from parent component
    this.messageHistory = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  /**
   * Called when server is ready to use
   */
  setupDone() {
    console.log('MessageHandler setupDone: Ready to interact with Aider');
    this.requestUpdate();
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
    
    if (data.allow_never && (response === 'd' || response === "don't")) {
      console.log('returning never');
      return 'd';
    }
    
    // Check for yes/true responses
    if (response === 'yes' || response === 'y' || response === 'true' || response === '1') {
      console.log('returning true');
      return true;
    }
    
    // Check for no/false responses
    if (response === 'n' || response === 'no' || response === 'false' || response === '0') {
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
   * Send prompt to Aider via JSON-RPC
   */
  async sendPrompt(message, onMaximize) {
    if (!message || this.isProcessing) return;
    
    // Maximize dialog when sending a prompt
    if (onMaximize) {
      onMaximize();
    }
    
    // Add user message to history
    this.addMessageToHistory('user', message);
    
    // Mark as processing
    this.isProcessing = true;
    
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
    // If chunk is null or undefined, handle gracefully
    if (!chunk) {
      console.warn('Received empty chunk');
      return;
    }

    this._handleChunk(chunk, final, role);

    // Request an immediate update
    this.requestUpdate();
    
    // Call hook for subclasses
    this.onStreamChunk?.(chunk, final, role);
  }
  
  /**
   * Handle message chunks
   */
  _handleChunk(chunk, final, role) {
    // If there's no role message yet, create one
    if (this.messageHistory.length === 0 || this.messageHistory[this.messageHistory.length - 1].role !== role) {
      this.addMessageToHistory(role, '');
    }
    
    // Append the chunk to the last message
    const lastIndex = this.messageHistory.length - 1;
    if (role === 'command') {
      // For command role, append to content (with newline if not empty)
      if (this.messageHistory[lastIndex].content) {
        this.messageHistory[lastIndex].content += '\n' + chunk;
      } else {
        this.messageHistory[lastIndex].content = chunk;
      }
    } else {
      // For other roles, just update the content
      this.messageHistory[lastIndex].content = chunk;
    }
    
    // Force a re-render by creating a new array
    this.messageHistory = [...this.messageHistory];
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
    // Mark processing as complete
    this.isProcessing = false;
    this.requestUpdate();
    
    // Force the update to be processed immediately
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
    try {
      console.log('Sending stop signal to CoderWrapper...');
      await this.call['CoderWrapper.stop']();
      console.log('Stop signal sent successfully');
    } catch (error) {
      console.error('Error sending stop signal:', error);
    }
  }
}
