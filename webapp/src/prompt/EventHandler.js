/**
 * EventHandler class for managing PromptView events
 */
export class EventHandler {
  constructor(promptView) {
    this.promptView = promptView;
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
