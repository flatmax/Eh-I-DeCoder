/**
 * Commands component for displaying command output only
 * Command buttons have been moved to CommandsButtons component
 */
import {JRPCClient} from '@flatmax/jrpc-oo';

export class Commands extends JRPCClient {
  static properties = {
    commandOutput: { type: Array, state: true },
    showOutput: { type: Boolean, state: true },
    serverURI: { type: String }
  };
  
  constructor() {
    super();
    this.commandOutput = [];
    this.showOutput = true; // Show output by default
    this.serverURI = "";  // Will be set from parent component
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
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
