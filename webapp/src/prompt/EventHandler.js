/**
 * EventHandler class for managing PromptView events
 */
export class EventHandler {
  constructor(promptView) {
    this.promptView = promptView;
    
    // Initialize prompt history state
    this.promptHistory = [];
    this.historyIndex = -1;
    this.retainedContent = null;
    
    // Chat history navigation state
    this.chatHistoryPrompts = [];
    this.chatHistoryIndex = -1;
    this.isInChatHistoryMode = false;
    
    // Bind methods
    this.handleTextareaKeydown = this.handleTextareaKeydown.bind(this);
  }

  /**
   * Setup keydown handler on the textarea inside the text field
   */
  setupTextareaKeyHandler() {
    const textField = this.promptView.shadowRoot?.querySelector('md-filled-text-field');
    if (!textField) return;
    
    // Wait for the text field to be fully rendered
    const setupHandler = () => {
      const textarea = textField.shadowRoot?.querySelector('textarea');
      if (textarea) {
        // Remove existing listener to avoid duplicates
        textarea.removeEventListener('keydown', this.handleTextareaKeydown);
        textarea.addEventListener('keydown', this.handleTextareaKeydown);
      }
    };
    
    // Try immediately, then retry after a short delay if needed
    setupHandler();
    setTimeout(setupHandler, 100);
  }

  /**
   * Handle keydown events in the textarea for history navigation
   * @param {KeyboardEvent} event - The keydown event
   */
  handleTextareaKeydown(event) {
    const { key } = event;
    if (key !== 'ArrowUp' && key !== 'ArrowDown') return;
    
    const textarea = event.target;
    const cursorLine = this._getCursorVisualLine(textarea);
    const totalLines = this._getTotalVisualLines(textarea);
    
    if (key === 'ArrowUp' && cursorLine === 1) {
      // Check if we have any history to navigate
      if (this.promptHistory.length > 0 || this._hasChatHistoryPrompts()) {
        event.preventDefault();
        this._navigateHistoryBack();
      }
    } else if (key === 'ArrowDown' && cursorLine === totalLines) {
      // Check if we're currently navigating history
      if (this.historyIndex >= 0 || this.isInChatHistoryMode) {
        event.preventDefault();
        this._navigateHistoryForward();
      }
    }
  }

  /**
   * Check if there are user prompts available in chat history
   * @returns {boolean}
   */
  _hasChatHistoryPrompts() {
    this._refreshChatHistoryPrompts();
    return this.chatHistoryPrompts.length > 0;
  }

  /**
   * Refresh the chat history prompts from the chat history panel
   */
  _refreshChatHistoryPrompts() {
    const chatHistoryPanel = this.promptView.shadowRoot?.querySelector('chat-history-panel');
    if (chatHistoryPanel) {
      const userPrompts = chatHistoryPanel.getUserPrompts?.() || [];
      // Filter out prompts that are already in local history to avoid duplicates
      this.chatHistoryPrompts = userPrompts.filter(
        prompt => !this.promptHistory.includes(prompt)
      );
    } else {
      this.chatHistoryPrompts = [];
    }
  }

  /**
   * Get the visual line number where the cursor is located (1-based)
   * Uses marker span approach for accurate measurement
   * @param {HTMLTextAreaElement} textarea - The textarea element
   * @returns {number} - The visual line number (1-based)
   */
  _getCursorVisualLine(textarea) {
    const cursorPosition = textarea.selectionStart;
    if (cursorPosition === 0) return 1;
    
    const text = textarea.value;
    const style = window.getComputedStyle(textarea);
    
    // Create mirror div
    const mirror = document.createElement('div');
    
    // Copy text-affecting styles
    mirror.style.fontFamily = style.fontFamily;
    mirror.style.fontSize = style.fontSize;
    mirror.style.fontWeight = style.fontWeight;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.paddingLeft = style.paddingLeft;
    mirror.style.paddingRight = style.paddingRight;
    mirror.style.paddingTop = style.paddingTop;
    mirror.style.paddingBottom = style.paddingBottom;
    mirror.style.wordWrap = style.wordWrap;
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.overflowWrap = 'break-word';
    
    // Structural fixes - critical for exact matching
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.top = '0';
    mirror.style.left = '-9999px';
    
    // CRITICAL: Force width and box-sizing to match clientWidth exactly
    mirror.style.width = textarea.clientWidth + 'px';
    mirror.style.boxSizing = 'border-box';
    mirror.style.overflow = 'hidden';
    
    // Insert text before cursor
    const textBefore = text.substring(0, cursorPosition);
    mirror.textContent = textBefore;
    
    // Create marker span at cursor position
    const marker = document.createElement('span');
    marker.textContent = '|';
    mirror.appendChild(marker);
    
    // Append to DOM to render
    document.body.appendChild(mirror);
    
    // Calculate line number based on marker position
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const markerTop = marker.offsetTop;
    
    // Calculate line: (marker position - padding) / lineHeight + 1
    // Add small buffer (lineHeight / 10) to handle sub-pixel rendering
    const calculatedLine = Math.floor((markerTop - paddingTop + (lineHeight / 10)) / lineHeight) + 1;
    
    // Clean up
    document.body.removeChild(mirror);
    
    return Math.max(1, calculatedLine);
  }

  /**
   * Get the total number of visual lines in the textarea
   * @param {HTMLTextAreaElement} textarea - The textarea element
   * @returns {number} - The total number of visual lines
   */
  _getTotalVisualLines(textarea) {
    const text = textarea.value;
    if (!text) return 1;
    
    const style = window.getComputedStyle(textarea);
    
    // Create mirror div
    const mirror = document.createElement('div');
    
    // Copy text-affecting styles
    mirror.style.fontFamily = style.fontFamily;
    mirror.style.fontSize = style.fontSize;
    mirror.style.fontWeight = style.fontWeight;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.paddingLeft = style.paddingLeft;
    mirror.style.paddingRight = style.paddingRight;
    mirror.style.paddingTop = style.paddingTop;
    mirror.style.paddingBottom = style.paddingBottom;
    mirror.style.wordWrap = style.wordWrap;
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.overflowWrap = 'break-word';
    
    // Structural fixes
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.top = '0';
    mirror.style.left = '-9999px';
    
    // CRITICAL: Force width and box-sizing to match clientWidth exactly
    mirror.style.width = textarea.clientWidth + 'px';
    mirror.style.boxSizing = 'border-box';
    mirror.style.overflow = 'hidden';
    
    // Insert full text
    mirror.textContent = text;
    
    // Create marker span at end
    const marker = document.createElement('span');
    marker.textContent = '|';
    mirror.appendChild(marker);
    
    // Append to DOM to render
    document.body.appendChild(mirror);
    
    // Calculate total lines based on marker position
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const markerTop = marker.offsetTop;
    
    const totalLines = Math.floor((markerTop - paddingTop + (lineHeight / 10)) / lineHeight) + 1;
    
    // Clean up
    document.body.removeChild(mirror);
    
    return Math.max(1, totalLines);
  }

  /**
   * Navigate backward through prompt history (older prompts)
   * First goes through local history, then continues with chat history
   */
  _navigateHistoryBack() {
    // If we haven't started navigating yet, save current content
    if (this.historyIndex === -1 && !this.isInChatHistoryMode) {
      this.retainedContent = this.promptView.inputValue || '';
      this.historyIndex = this.promptHistory.length;
      // Refresh chat history prompts when starting navigation
      this._refreshChatHistoryPrompts();
    }
    
    // Try to navigate in local history first
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.promptView.inputValue = this.promptHistory[this.historyIndex];
      this._moveCursorToEnd();
      return;
    }
    
    // Local history exhausted, switch to chat history mode
    if (this.historyIndex === 0 && !this.isInChatHistoryMode && this.chatHistoryPrompts.length > 0) {
      this.isInChatHistoryMode = true;
      this.chatHistoryIndex = this.chatHistoryPrompts.length;
    }
    
    // Navigate in chat history (from newest to oldest)
    if (this.isInChatHistoryMode && this.chatHistoryIndex > 0) {
      this.chatHistoryIndex--;
      this.promptView.inputValue = this.chatHistoryPrompts[this.chatHistoryIndex];
      this._moveCursorToEnd();
    }
  }

  /**
   * Navigate forward through prompt history (newer prompts)
   * Goes through chat history first, then local history, then back to retained content
   */
  _navigateHistoryForward() {
    // If in chat history mode, navigate forward through it first
    if (this.isInChatHistoryMode) {
      if (this.chatHistoryIndex < this.chatHistoryPrompts.length - 1) {
        this.chatHistoryIndex++;
        this.promptView.inputValue = this.chatHistoryPrompts[this.chatHistoryIndex];
        this._moveCursorToEnd();
        return;
      }
      
      // Reached end of chat history, switch back to local history
      this.isInChatHistoryMode = false;
      this.chatHistoryIndex = -1;
      this.historyIndex = 0;
      
      // If there's local history, show the first (oldest) item
      if (this.promptHistory.length > 0) {
        this.promptView.inputValue = this.promptHistory[this.historyIndex];
        this._moveCursorToEnd();
        return;
      }
    }
    
    // Navigate forward in local history
    if (this.historyIndex < this.promptHistory.length - 1) {
      this.historyIndex++;
      this.promptView.inputValue = this.promptHistory[this.historyIndex];
      this._moveCursorToEnd();
    } else if (this.historyIndex === this.promptHistory.length - 1 || 
               (this.historyIndex === -1 && !this.isInChatHistoryMode)) {
      // Reached end of local history or no history, restore retained content
      this.historyIndex = -1;
      this.isInChatHistoryMode = false;
      this.chatHistoryIndex = -1;
      this.promptView.inputValue = this.retainedContent || '';
      this.retainedContent = null;
      this._moveCursorToEnd();
    }
  }

  /**
   * Move cursor to the end of the textarea
   */
  _moveCursorToEnd() {
    this.promptView.updateComplete.then(() => {
      const textField = this.promptView.shadowRoot?.querySelector('md-filled-text-field');
      const textarea = textField?.shadowRoot?.querySelector('textarea');
      if (textarea) {
        const length = textarea.value.length;
        textarea.setSelectionRange(length, length);
      }
    });
  }

  /**
   * Focus the textarea input
   */
  focusTextarea() {
    this.promptView.updateComplete.then(() => {
      const textField = this.promptView.shadowRoot?.querySelector('md-filled-text-field');
      if (textField) {
        textField.focus();
        // Also focus the inner textarea for good measure
        const textarea = textField.shadowRoot?.querySelector('textarea');
        if (textarea) {
          textarea.focus();
        }
      }
    });
  }

  /**
   * Add a prompt to the history
   * @param {string} prompt - The prompt to add
   */
  addToPromptHistory(prompt) {
    if (!prompt?.trim()) return;
    
    // Don't add duplicates of the most recent prompt
    if (this.promptHistory[this.promptHistory.length - 1] === prompt) return;
    
    this.promptHistory.push(prompt);
    this.historyIndex = -1;
    this.retainedContent = null;
    this.isInChatHistoryMode = false;
    this.chatHistoryIndex = -1;
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.promptView.sendPromptUI();
    }
  }

  /**
   * Send prompt via UI (wrapper for sendPrompt with UI-specific logic)
   */
  async sendPromptUI() {
    const message = this.promptView.inputValue.trim();
    
    if (!message || this.promptView.isProcessing) return;
    
    // Add to history before sending
    this.addToPromptHistory(message);
    
    // Clear input
    this.promptView.inputValue = '';
    
    // Send via inherited sendPrompt method with maximize callback
    await this.promptView.sendPrompt(message, () => this.promptView.maximize());
    
    // Focus the textarea after sending so user can continue typing
    this.focusTextarea();
  }

  /**
   * Handle transcript from speech recognition
   */
  handleTranscript(event) {
    const text = event.detail.text;
    if (!text) return;
    
    // If input already has text, add a space before appending
    if (this.promptView.inputValue?.trim()) {
      this.promptView.inputValue += ' ' + text;
    } else {
      this.promptView.inputValue = text;
    }
  }
  
  /**
   * Handle recording started event
   */
  handleRecordingStarted() {
    console.log('Voice recording started');
  }
  
  /**
   * Handle recognition errors
   */
  handleRecognitionError(event) {
    console.error('Speech recognition error:', event.detail.error);
  }
}
