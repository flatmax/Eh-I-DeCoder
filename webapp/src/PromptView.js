/**
 * PromptView component that provides the UI for interacting with the AI assistant
 */
import '@material/web/button/filled-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/icon/icon.js';
import './prompt/AssistantCard.js';
import './prompt/UserCard.js';
import '../speech-to-text.js';
import './prompt/CommandsCard.js';
import { MessageHandler } from './MessageHandler.js';
import { DragHandler } from './prompt/DragHandler.js';
import { DialogStateManager } from './prompt/DialogStateManager.js';
import { ScrollManager } from './prompt/ScrollManager.js';
import { EventHandler } from './prompt/EventHandler.js';
import { promptViewStyles } from './prompt/PromptViewStyles.js';
import { renderPromptView } from './prompt/PromptViewTemplate.js';
import { EventHelper } from './utils/EventHelper.js';

export class PromptView extends MessageHandler {
  static properties = {
    ...MessageHandler.properties,
    inputValue: { type: String, state: true },
    showVoiceInput: { type: Boolean, state: true },
    isMinimized: { type: Boolean, state: false },
    coderType: { type: String, state: true },
    showScrollToBottom: { type: Boolean, state: true },
    gitHistoryMode: { type: Boolean },
    // Tab properties
    activeTab: { type: String, state: true },
    // Drag properties
    isDragging: { type: Boolean, state: true },
    position: { type: Object, state: true },
    hasBeenDragged: { type: Boolean, state: true },
    // Resize properties
    dialogWidth: { type: Number, state: true },
    hasBeenResized: { type: Boolean, state: true }
  };
  
  constructor() {
    super();
    this.inputValue = '';
    this.showVoiceInput = true;
    this.isMinimized = true; // Start minimized
    this.coderType = 'Send';
    this.showScrollToBottom = false;
    this.gitHistoryMode = false;
    this.activeTab = 'assistant'; // Default to AI Assistant tab
    
    // Initialize managers
    this.dragHandler = new DragHandler(this);
    this.dialogStateManager = new DialogStateManager(this);
    this.scrollManager = new ScrollManager(this);
    this.eventHandler = new EventHandler(this);
    
    // Initialize drag state
    this.isDragging = false;
    this.position = { 
      x: window.innerWidth / 6, 
      y: 20
    };
    this.hasBeenDragged = false; // Start as not dragged
    
    // Initialize resize state
    this.dialogWidth = window.innerWidth / 3; // Default width
    this.hasBeenResized = false;
    
    // Initialize prompt history state
    this.promptHistory = []; // Array of past user prompts
    this.historyIndex = -1; // Current position in history (-1 means not browsing history)
    this.retainedContent = null; // Content retained when starting to browse history
    
    // Bind methods
    this.handleModeToggle = this.handleModeToggle.bind(this);
    this.handleTabClick = this.handleTabClick.bind(this);
    this.handleWordClicked = this.handleWordClicked.bind(this);
    this.handleCopyToPrompt = this.handleCopyToPrompt.bind(this);
    this.handleTextareaKeydown = this.handleTextareaKeydown.bind(this);
    
    // Batch update mechanism
    this._pendingUpdates = new Map();
    this._updateScheduled = false;
  }

  static styles = promptViewStyles;

  connectedCallback() {
    super.connectedCallback();
    
    // Initialize managers
    this.dragHandler.initialize();
    this.dialogStateManager.initialize();
    this.scrollManager.initialize();
    
    // Listen for word-clicked events from file trees on window object
    window.addEventListener('word-clicked', this.handleWordClicked);
    
    // Listen for copy-to-prompt events from cards
    this.addEventListener('copy-to-prompt', this.handleCopyToPrompt);
    
    // Force initial state update
    this.updateComplete.then(() => {
      this.dialogStateManager.updateDialogClass();
      this._setupTextareaKeyHandler();
    });
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    this.dragHandler.cleanup();
    this.dialogStateManager.cleanup();
    this.scrollManager.cleanup();
    
    // Remove event listeners
    window.removeEventListener('word-clicked', this.handleWordClicked);
    this.removeEventListener('copy-to-prompt', this.handleCopyToPrompt);
  }

  /**
   * Setup keydown handler on the textarea inside the text field
   */
  _setupTextareaKeyHandler() {
    const textField = this.shadowRoot.querySelector('md-filled-text-field');
    if (!textField) return;
    
    // Wait for the text field to be fully rendered
    const setupHandler = () => {
      const textarea = textField.shadowRoot?.querySelector('textarea');
      if (textarea) {
        textarea.addEventListener('keydown', this.handleTextareaKeydown);
      }
    };
    
    // Try immediately, then retry after a short delay if needed
    setupHandler();
    setTimeout(setupHandler, 100);
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
   * Navigate backward through prompt history (older prompts)
   */
  _navigateHistoryBack() {
    // If we're not currently browsing history, retain current content
    if (this.historyIndex === -1) {
      this.retainedContent = this.inputValue || '';
      this.historyIndex = this.promptHistory.length; // Start at the end
    }
    
    // Move to older prompt if possible
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.inputValue = this.promptHistory[this.historyIndex];
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
      this.inputValue = this.promptHistory[this.historyIndex];
      this._moveCursorToEnd();
    } else if (this.historyIndex === this.promptHistory.length - 1) {
      // At the end of history, restore retained content
      this.historyIndex = -1;
      this.inputValue = this.retainedContent || '';
      this.retainedContent = null;
      this._moveCursorToEnd();
    }
  }

  /**
   * Move cursor to the end of the textarea
   */
  _moveCursorToEnd() {
    this.updateComplete.then(() => {
      const textField = this.shadowRoot.querySelector('md-filled-text-field');
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
   * Handle copy-to-prompt events from cards
   * @param {CustomEvent} event - The copy-to-prompt event
   */
  handleCopyToPrompt(event) {
    const { content } = event.detail;
    if (!content) return;
    
    // Add the content to the current input value
    const currentValue = this.inputValue || '';
    const newValue = currentValue ? `${currentValue}\n\n${content}` : content;
    
    // Batch update input value and minimize state
    this._batchUpdate({
      inputValue: newValue,
      isMinimized: false
    });
    
    // Focus the input field and position cursor at the end
    this.updateComplete.then(() => {
      const textField = this.shadowRoot.querySelector('md-filled-text-field');
      if (textField) {
        textField.focus();
        // Set cursor to end of text
        setTimeout(() => {
          const input = textField.shadowRoot?.querySelector('textarea') || textField.shadowRoot?.querySelector('input');
          if (input) {
            input.setSelectionRange(newValue.length, newValue.length);
          }
        }, 10);
      }
    });
  }

  /**
   * Batch state updates to prevent multiple re-renders
   */
  _batchUpdate(updates) {
    // Store all pending updates
    Object.entries(updates).forEach(([key, value]) => {
      this._pendingUpdates.set(key, value);
    });
    
    // Schedule a single update
    if (!this._updateScheduled) {
      this._updateScheduled = true;
      
      // Use requestAnimationFrame for optimal timing
      requestAnimationFrame(() => {
        // Apply all pending updates at once
        this._pendingUpdates.forEach((value, key) => {
          this[key] = value;
        });
        
        // Clear pending updates
        this._pendingUpdates.clear();
        this._updateScheduled = false;
        
        // Request a single update
        this.requestUpdate();
      });
    }
  }

  /**
   * Handle word-clicked events from file trees
   * @param {CustomEvent} event - The word-clicked event
   */
  handleWordClicked(event) {
    const { word } = event.detail;
    if (!word) return;
    
    // Get the text field element
    const textField = this.shadowRoot.querySelector('md-filled-text-field');
    if (!textField) {
      // If text field not found, fall back to appending at end
      const currentValue = this.inputValue || '';
      const newValue = currentValue ? `${currentValue} ${word} ` : `${word} `;
      
      this._batchUpdate({
        inputValue: newValue,
        isMinimized: false
      });
      return;
    }
    
    // Get the actual input element inside the text field
    const input = textField.shadowRoot?.querySelector('input') || textField.shadowRoot?.querySelector('textarea');
    if (!input) {
      // If input not found, fall back to appending at end
      const currentValue = this.inputValue || '';
      const newValue = currentValue ? `${currentValue} ${word} ` : `${word} `;
      
      this._batchUpdate({
        inputValue: newValue,
        isMinimized: false
      });
      return;
    }
    
    // Get current cursor position
    const cursorPos = input.selectionStart || 0;
    const currentValue = this.inputValue || '';
    
    // Insert word at cursor position with spaces
    const beforeCursor = currentValue.substring(0, cursorPos);
    const afterCursor = currentValue.substring(cursorPos);
    
    // Add space before word if needed (if there's text before and it doesn't end with space)
    const spaceBefore = beforeCursor && !beforeCursor.endsWith(' ') ? ' ' : '';
    
    // Add space after word
    const spaceAfter = ' ';
    
    // Construct new value
    const newValue = beforeCursor + spaceBefore + word + spaceAfter + afterCursor;
    const newCursorPos = cursorPos + spaceBefore.length + word.length + spaceAfter.length;
    
    // Batch update input value and minimize state
    this._batchUpdate({
      inputValue: newValue,
      isMinimized: false
    });
    
    // Focus the input field and position cursor after the inserted word
    this.updateComplete.then(() => {
      textField.focus();
      // Set cursor position after the inserted word
      setTimeout(() => {
        if (input) {
          input.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 10);
    });
  }
  
  // Delegate methods to managers
  handleHeaderClick(event) {
    this.dialogStateManager.handleHeaderClick(event);
  }
  
  handleDragStart(event) {
    this.dragHandler.handleDragStart(event);
  }
  
  handleResizeStart(event, resizeType) {
    this.dragHandler.handleResizeStart(event, resizeType);
  }
  
  handleDocumentClick(event) {
    this.dialogStateManager.handleDocumentClick(event);
  }
  
  handleDialogClick(event) {
    this.dialogStateManager.handleDialogClick(event);
  }
  
  maximize() {
    this.dialogStateManager.maximize();
  }
  
  minimize() {
    this.dialogStateManager.minimize();
  }
  
  updateDialogClass() {
    this.dialogStateManager.updateDialogClass();
  }

  handleModeToggle(event) {
    event.stopPropagation(); // Prevent header click from triggering
    EventHelper.dispatchModeToggle(this);
  }

  handleTabClick(event, tabName) {
    event.stopPropagation(); // Prevent header click from triggering
    const previousTab = this.activeTab;
    this.activeTab = tabName;
    
    // If switching to history tab for the first time, ensure it scrolls to bottom
    if (tabName === 'history' && previousTab !== 'history') {
      // Wait for the tab to be rendered and visible
      this.updateComplete.then(() => {
        setTimeout(() => {
          const chatHistoryPanel = this.shadowRoot.querySelector('#chatHistoryPanel');
          if (chatHistoryPanel) {
            chatHistoryPanel.scrollToBottomIfNeeded();
          }
        }, 100);
      });
    }
  }

  // Delegate to EventHandler
  sendPromptUI() {
    // Add the current input to history before sending
    if (this.inputValue && this.inputValue.trim()) {
      this.addToPromptHistory(this.inputValue);
    }
    return this.eventHandler.sendPromptUI();
  }
  
  /**
   * LitElement render method
   */
  render() {
    return renderPromptView(this);
  }
  
  /**
   * Called after the component's DOM has been updated the first time
   */
  firstUpdated(changedProperties) {
    super.firstUpdated && super.firstUpdated(changedProperties);
    this._setupTextareaKeyHandler();
  }
  
  /**
   * Called after every update
   */
  updated(changedProperties) {
    super.updated && super.updated(changedProperties);
    
    // Re-setup the key handler if the component was re-rendered
    if (changedProperties.has('isMinimized') && !this.isMinimized) {
      this._setupTextareaKeyHandler();
    }
  }
  
  /**
   * Hook called when a message is added (from MessageHandler)
   */
  onMessageAdded(role, content) {
    this.scrollManager.onMessageAdded(role, content);
  }
  
  /**
   * Hook called when a stream chunk is received (from MessageHandler)
   */
  async onStreamChunk(chunk, final, role) {
    await this.scrollManager.onStreamChunk(chunk, final, role);
  }
  
  /**
   * Hook called when streaming is complete (from MessageHandler)
   */
  async onStreamComplete() {
    await this.scrollManager.onStreamComplete();
  }
  
  /**
   * Hook called when a stream error occurs (from MessageHandler)
   */
  async onStreamError(errorMessage) {
    await this.scrollManager.onStreamError(errorMessage);
  }

  /**
   * Override the MessageHandler.onCoderTypeChanged to update button label
   */
  onCoderTypeChanged(coderType) {
    super.onCoderTypeChanged(coderType);
    this.coderType = coderType || 'Send';
    this.requestUpdate();
    return true;
  }
}

customElements.define('prompt-view', PromptView);
