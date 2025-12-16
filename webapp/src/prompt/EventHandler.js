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
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }
    
    const textarea = event.target;
    
    if (event.key === 'ArrowUp') {
      // Check if cursor is on the first visual line
      const isOnFirstLine = this._isCursorOnFirstVisualLine(textarea);
      
      if (isOnFirstLine && this.promptHistory.length > 0) {
        event.preventDefault();
        this._navigateHistoryBack();
      }
    } else if (event.key === 'ArrowDown') {
      // Check if cursor is on the last visual line
      const isOnLastLine = this._isCursorOnLastVisualLine(textarea);
      
      if (isOnLastLine && this.historyIndex >= 0) {
        event.preventDefault();
        this._navigateHistoryForward();
      }
    }
  }

  /**
   * Check if cursor is on the first visual line of the textarea
   * @param {HTMLTextAreaElement} textarea - The textarea element
   * @returns {boolean} - True if cursor is on the first visual line
   */
  _isCursorOnFirstVisualLine(textarea) {
    const cursorPosition = textarea.selectionStart;
    
    // If cursor is at position 0, it's definitely on the first line
    if (cursorPosition === 0) return true;
    
    // Create a temporary div to measure text dimensions
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    
    // Copy relevant styles to the mirror
    mirror.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      width: ${textarea.clientWidth}px;
      font-family: ${style.fontFamily};
      font-size: ${style.fontSize};
      font-weight: ${style.fontWeight};
      line-height: ${style.lineHeight};
      padding: ${style.padding};
      border: ${style.border};
      box-sizing: ${style.boxSizing};
    `;
    
    // Get text before cursor and add a marker character to account for cursor position
    // This ensures that if cursor is at position 0 of line 2 (right after a newline),
    // the marker will be on line 2 and we measure the correct height
    const textBeforeCursor = textarea.value.substring(0, cursorPosition);
    mirror.textContent = textBeforeCursor + '|'; // Add marker to measure where cursor actually is
    
    document.body.appendChild(mirror);
    
    // Get the line height
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    
    // Check if the text before cursor (plus marker) fits within one line height
    const isOnFirstLine = mirror.offsetHeight <= lineHeight * 1.5; // Allow some tolerance
    
    document.body.removeChild(mirror);
    
    return isOnFirstLine;
  }

  /**
   * Check if cursor is on the last visual line of the textarea
   * @param {HTMLTextAreaElement} textarea - The textarea element
   * @returns {boolean} - True if cursor is on the last visual line
   */
  _isCursorOnLastVisualLine(textarea) {
    const cursorPosition = textarea.selectionStart;
    const value = textarea.value;
    
    // If cursor is at the end, it's definitely on the last line
    if (cursorPosition === value.length) return true;
    
    // Create a temporary div to measure text dimensions
    const mirror = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    
    // Copy relevant styles to the mirror
    mirror.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      width: ${textarea.clientWidth}px;
      font-family: ${style.fontFamily};
      font-size: ${style.fontSize};
      font-weight: ${style.fontWeight};
      line-height: ${style.lineHeight};
      padding: ${style.padding};
      border: ${style.border};
      box-sizing: ${style.boxSizing};
    `;
    
    // Get the line height
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    
    // Measure height of text up to cursor, adding marker to get accurate cursor line position
    mirror.textContent = value.substring(0, cursorPosition) + '|';
    document.body.appendChild(mirror);
    const heightToCursor = mirror.offsetHeight;
    
    // Measure height of full text, adding marker to account for trailing newlines
    mirror.textContent = value + '|';
    const totalHeight = mirror.offsetHeight;
    
    document.body.removeChild(mirror);
    
    // Check if cursor is on the last line (within one line height of the total)
    const isOnLastLine = (totalHeight - heightToCursor) < lineHeight * 1.5;
    
    return isOnLastLine;
  }

  /**
   * Navigate backward through prompt history (older prompts)
   */
  _navigateHistoryBack() {
    // If we're not currently browsing history, retain current content
    if (this.historyIndex === -1) {
      this.retainedContent = this.promptView.inputValue || '';
      this.historyIndex = this.promptHistory.length; // Start at the end
    }
    
    // Move to older prompt if possible
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.promptView.inputValue = this.promptHistory[this.historyIndex];
      this._moveCursorToEnd();
    }
  }

  /**
   * Navigate forward through prompt history (newer prompts)
   */
  _navigateHistoryForward() {
    if (this.historyIndex < this.promptHistory.length - 1) {
      // Move to newer prompt
      this.historyIndex++;
      this.promptView.inputValue = this.promptHistory[this.historyIndex];
      this._moveCursorToEnd();
    } else if (this.historyIndex === this.promptHistory.length - 1) {
      // At the end of history, restore retained content
      this.historyIndex = -1;
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
      if (textField) {
        const textarea = textField.shadowRoot?.querySelector('textarea');
        if (textarea) {
          const length = textarea.value.length;
          textarea.setSelectionRange(length, length);
        }
      }
    });
  }

  /**
   * Add a prompt to the history
   * @param {string} prompt - The prompt to add
   */
  addToPromptHistory(prompt) {
    if (!prompt || !prompt.trim()) return;
    
    // Don't add duplicates of the most recent prompt
    if (this.promptHistory.length > 0 && 
        this.promptHistory[this.promptHistory.length - 1] === prompt) {
      return;
    }
    
    this.promptHistory.push(prompt);
    
    // Reset history navigation state
    this.historyIndex = -1;
    this.retainedContent = null;
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
  }

  /**
   * Handle transcript from speech recognition
   */
  handleTranscript(event) {
    const text = event.detail.text;
    if (!text) return;
    
    // If input already has text, add a space before appending
    if (this.promptView.inputValue && this.promptView.inputValue.trim() !== '') {
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
