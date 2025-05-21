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
    this.serverURI = "ws://0.0.0.0:9000";
  }

  static properties = {
    commands: { type: Array },
    loading: { type: Boolean },
    error: { type: String },
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
    // Here you could implement functionality to:
    // 1. Execute the command
    // 2. Add the command to the prompt input
    // 3. Show more info about the command
    
    // For now, just log the action
    try {
      // Show command description in an alert for demo purposes
      alert(`Command: ${command.name}\n\nDescription: ${command.description || 'No description available'}`);
    } catch (error) {
      console.error('Error handling command click:', error);
    }
  }

  render() {
    return html`
      <div class="commands-container">
        <div class="commands-header">
          <span>Available Commands</span>
          <md-filled-button dense @click=${() => this.loadCommands()}>
            Refresh
          </md-filled-button>
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
      </div>
    `;
  }
}

customElements.define('aider-commands', Commands);
