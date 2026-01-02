/**
 * Commands component for displaying command output only
 * Command buttons have been moved to CommandsButtons component
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {ReconnectMixin} from './mixins/ReconnectMixin.js';

export class Commands extends ReconnectMixin(JRPCClient) {
  static properties = {
    commandOutput: { type: Array, state: true },
    showOutput: { type: Boolean, state: true },
    serverURI: { type: String },
    isConnected: { type: Boolean, state: true }
  };
  
  constructor() {
    super();
    this.commandOutput = [];
    this.showOutput = true; // Show output by default
    this.serverURI = "";  // Will be set from parent component
    this.isConnected = false;
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  /**
   * Called when JRPC connection is established and ready
   */
  setupDone() {
    console.log('Commands::setupDone - Connection ready');
    this.isConnected = true;
    this._resetReconnectState();
  }
  
  /**
   * Called when remote is up but not yet ready
   */
  remoteIsUp() {
    console.log('Commands::remoteIsUp - Remote connected');
    // Don't perform operations yet - wait for setupDone
  }
  
  /**
   * Called when remote disconnects
   */
  remoteDisconnected() {
    console.log('Commands::remoteDisconnected');
    this.isConnected = false;
    
    // Schedule reconnect
    try {
      this._scheduleReconnect();
    } catch (e) {
      console.error('Commands: Error scheduling reconnect:', e);
    }
    
    this.requestUpdate();
  }

  /**
   * Method to display command output received from the CommandsWrapper
   * Called by CommandsWrapper via JRPC
   */
  displayCommandOutput(type, message) {
    console.log(`Command output: [${type}] ${message}`);
    
    // Add the message to our output array
    this.commandOutput.push({ type, message });
    
    // Show the output container if not already visible
    if (!this.showOutput) {
      this.showOutput = true;
    }
    
    // Update the view
    this.requestUpdate();
    
    return "output displayed"; // Return a response to confirm receipt
  }
}
