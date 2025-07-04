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
    
    // Remove event listener
    window.removeEventListener('word-clicked', this.handleWordClicked);
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
    
    // Add the word to the current input value with a space at the end
    const currentValue = this.inputValue || '';
    const newValue = currentValue ? `${currentValue} ${word} ` : `${word} `;
    
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
          const input = textField.shadowRoot?.querySelector('input');
          if (input) {
            input.setSelectionRange(newValue.length, newValue.length);
          }
        }, 10);
      }
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
    this.activeTab = tabName;
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
