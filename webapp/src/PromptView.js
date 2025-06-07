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

export class PromptView extends MessageHandler {
  static properties = {
    ...MessageHandler.properties,
    inputValue: { type: String, state: true },
    showVoiceInput: { type: Boolean, state: true },
    isMinimized: { type: Boolean, state: false },
    coderType: { type: String, state: true },
    // Drag properties
    isDragging: { type: Boolean, state: true },
    position: { type: Object, state: true },
    hasBeenDragged: { type: Boolean, state: true }
  };
  
  constructor() {
    super();
    this.inputValue = '';
    this.showVoiceInput = true;
    this.isMinimized = false;
    this.coderType = 'Send';
    
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
    this.hasBeenDragged = true;
  }

  static styles = promptViewStyles;

  connectedCallback() {
    super.connectedCallback();
    this.dragHandler.initialize();
    this.dialogStateManager.initialize();
    this.scrollManager.initialize();
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    this.dragHandler.cleanup();
    this.dialogStateManager.cleanup();
    this.scrollManager.cleanup();
  }
  
  // Delegate methods to managers
  handleHeaderClick(event) {
    this.dialogStateManager.handleHeaderClick(event);
  }
  
  handleDragStart(event) {
    this.dragHandler.handleDragStart(event);
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
