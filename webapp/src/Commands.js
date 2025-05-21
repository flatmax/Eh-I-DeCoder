/**
 * Commands component for displaying available Aider commands as chips
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import '@material/web/chips/chip-set.js';
import '@material/web/chips/assist-chip.js';
import '@material/web/icon/icon.js';

export class Commands extends JRPCClient {
  constructor() {
    super();
    this.commands = [];
    this.loading = false;
    this.error = null;
    this.commandOutput = [];
    this.showOutput = false;
    this.serverURI = "ws://0.0.0.0:9000";
  }

  static properties = {
    commands: { type: Array },
    loading: { type: Boolean },
    error: { type: String },
    commandOutput: { type: Array },
    showOutput: { type: Boolean },
  };

  static styles = css`
    :host {
      display: block;
      margin: 10px 0;
    }

    .commands-container {
      padding: 10px;
      border-radius: 8px;
      background-color: #f5f5f5;
    }

    .commands-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-weight: bold;
    }

    .commands-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .output-container {
      margin-top: 15px;
      padding: 10px;
      background-color: #000;
      border-radius: 4px;
      font-family: monospace;
      color: #f8f8f8;
      max-height: 300px;
      overflow-y: auto;
    }

    .output-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      color: #fff;
    }

    .output-message {
      margin: 5px 0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .output-type-output {
      color: #f8f8f8;
    }

    .output-type-error {
      color: #ff5555;
    }

    .output-type-warning {
      color: #ffb86c;
    }

    .output-type-print {
      color: #8be9fd;
    }

    .loading {
      font-style: italic;
      color: #666;
    }

    .error {
      color: #d32f2f;
      font-size: 14px;
    }
    
    md-assist-chip {
      --md-assist-chip-container-shape: 8px;
    }
  `;
  
  /**
   * Called when remote server is up
   */
  remoteIsUp() {
    console.log('Commands::remoteIsUp');
    this.addClass(this);
    // Add a timeout before loading commands to ensure connection is fully established
    setTimeout(() => {
      this.loadCommands();
    }, 500); // 500ms delay
  }

  async loadCommands() {
    try {
      this.loading = true;
      this.error = null;
      this.requestUpdate();
      
      // Fetch commands from the server
      const commandsData = await this.call['Commands.get_commands']();
      
      // Process and sort commands
      if (typeof commandsData === 'object' && !Array.isArray(commandsData)) {
        // Get the keys (should be a single remote UUID)
        const keys = Object.keys(commandsData);
        
        if (keys.length > 0) {
          // Get the first key (remote UUID)
          const remoteId = keys[0];
          
          // Get the commands array from this key
          const commandsArray = commandsData[remoteId];
          
          if (Array.isArray(commandsArray)) {
            // Convert array of strings to array of objects with name property
            this.commands = commandsArray.map(cmdName => {
              return { name: cmdName, description: `Aider command: ${cmdName}` };
            }).sort((a, b) => a.name.localeCompare(b.name));
          } else {
            this.error = "Expected an array of commands";
          }
        } else {
          this.error = "No commands found";
        }
      } else {
        this.error = "Unexpected command data format";
      }
    } catch (error) {
      console.error('Error loading commands:', error);
      this.error = `Failed to load commands: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  async handleCommandClick(command) {
    console.log(`Command clicked: ${command.name}`);
    
    try {
      // Show the output view when running a command
      this.showOutput = true;
      
      // Clear previous output
      this.commandOutput = [];
      this.requestUpdate();
      
      console.log(`Executing command: ${command.name}`);
      
      // Find the prompt-view component through DOM traversal
      // First get the host element (MainWindow) by going up through the shadow roots
      const parentRoot = this.getRootNode().host?.shadowRoot;
      if (!parentRoot) {
        throw new Error("Could not find parent shadow root");
      }
      
      // Now find the prompt-view element in the parent's shadow DOM
      const promptView = parentRoot.querySelector('prompt-view');
      if (!promptView) {
        throw new Error("PromptView component not found in parent shadow DOM");
      }
      
      // Log that we found the component
      this.displayCommandOutput('output', `Running command: ${command.name} via PromptView`);
      
      // Set the input value to the command
      promptView.inputValue = command.name;
      
      // Call the sendPrompt method
      await promptView.sendPrompt();
      
      this.displayCommandOutput('output', `Sent command through PromptView`);
      
    } catch (error) {
      console.error('Error executing command:', error);
      this.displayCommandOutput('error', `Error executing command: ${error.message}`);
      
      // Fall back to direct API call if we couldn't find the PromptView
      try {
        this.displayCommandOutput('output', `Falling back to direct API call...`);
        await this.call['CoderWrapper.run'](command.name, true);
        this.displayCommandOutput('output', `Command executed via direct API call`);
      } catch (fallbackError) {
        this.displayCommandOutput('error', `Fallback also failed: ${fallbackError.message}`);
      }
    }
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
    
    // Scroll to the bottom of the output after update
    this.updateComplete.then(() => {
      const outputContainer = this.shadowRoot.querySelector('.output-container');
      if (outputContainer) {
        outputContainer.scrollTop = outputContainer.scrollHeight;
      }
    });
    
    return "output displayed"; // Return a response to confirm receipt
  }

  render() {
    return html`
      <div class="commands-container">
        <div class="commands-header">
          <span>Available Commands</span>
          <div>
            <md-filled-button dense @click=${() => { this.showOutput = !this.showOutput; this.requestUpdate(); }}>
              ${this.showOutput ? 'Hide Output' : 'Show Output'}
            </md-filled-button>
            <md-filled-button dense @click=${() => this.loadCommands()}>
              Refresh
            </md-filled-button>
          </div>
        </div>
        
        ${this.loading ? html`
          <div class="loading">Loading commands...</div>
        ` : this.error ? html`
          <div class="error">${this.error}</div>
        ` : html`
          <md-chip-set>
            ${this.commands.map(command => html`
              <md-assist-chip 
                label="${command.name}"
                @click=${() => this.handleCommandClick(command)}
              ></md-assist-chip>
            `)}
          </md-chip-set>
        `}
        
        ${this.showOutput ? html`
          <div class="output-container">
            <div class="output-header">
              <span>Command Output</span>
              <md-filled-button dense @click=${() => { this.commandOutput = []; this.requestUpdate(); }}>
                Clear
              </md-filled-button>
            </div>
            ${this.commandOutput.length === 0 ? html`
              <div class="output-message">No output yet. Run a command to see results here.</div>
            ` : html`
              ${this.commandOutput.map(item => html`
                <div class="output-message output-type-${item.type}">${item.message}</div>
              `)}
            `}
          </div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('aider-commands', Commands);
