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
    
    // Bind methods
    this.handleModeToggle = this.handleModeToggle.bind(this);
    this.handleTabClick = this.handleTabClick.bind(this);
    this.handleWordClicked = this.handleWordClicked.bind(this);
    this.handleCopyToPrompt = this.handleCopyToPrompt.bind(this);
    
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
    return this.eventHandler.sendPromptUI();
  }
  
  /**
   * LitElement render method
   */
  render() {
    return renderPromptView(this);
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
