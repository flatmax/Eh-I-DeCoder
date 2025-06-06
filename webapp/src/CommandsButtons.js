/**
 * CommandsButtons component for displaying available Aider commands as chips
 * This is separated from Commands.js to allow the buttons to be placed in a different tab
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import '@material/web/chips/chip-set.js';
import '@material/web/chips/assist-chip.js';
import '@material/web/icon/icon.js';
import {extractResponseData} from './Utils.js';

export class CommandsButtons extends JRPCClient {
  static properties = {
    commands: { type: Array, state: true },
    loading: { type: Boolean, state: true },
    error: { type: String, state: true },
    serverURI: { type: String }
  };
  
  constructor() {
    super();
    this.commands = [];
    this.loading = false;
    this.error = null;
    this.serverURI = "";  // Will be set from parent component
  }

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
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  /**
   * Called when remote server is up
   */
  setupDone() {
    console.log('CommandsButtons::setupDone');
    // Add a timeout before loading commands to ensure connection is fully established
    this.loadCommands();
  }

  async loadCommands() {
    try {
      this.loading = true;
      this.error = null;
      this.requestUpdate();
      
      // Fetch commands from the server
      const commandsData = await this.call['Commands.get_commands']();
      
      // Process and sort commands
      const commandsArray = extractResponseData(commandsData, [], true);
      
      if (Array.isArray(commandsArray)) {
        // Convert array of strings to array of objects with name property
        // and filter out /add, /drop, and /ls commands
        this.commands = commandsArray
          .filter(cmdName => !('/add' === cmdName || '/drop' === cmdName || '/ls' === cmdName))
          .map(cmdName => {
            return { name: cmdName, description: `Aider command: ${cmdName}` };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
      } else {
        this.error = "Expected an array of commands";
      }
    } catch (error) {
      console.error('Error loading commands:', error);
      this.error = `Failed to load commands: ${error.message}`;
    } finally {
      this.loading = false;
      this.requestUpdate();
    }
  }

  /**
   * Find the PromptView component through various lookup strategies
   * @returns {Element|null} The prompt-view element or null if not found
   */
  findPromptView() {
    // Try to find the prompt view in the main window
    let mainWindow = document.querySelector('main-window');
    if (mainWindow?.shadowRoot) {
      let promptView = mainWindow.shadowRoot.querySelector('prompt-view');
      if (promptView) return promptView;
    }
    
    // Try traversing up from current component to find host elements
    let element = this;
    let maxDepth = 10; // Prevent infinite loops
    
    while (element && maxDepth-- > 0) {
      // If we're in a shadow root, get its host
      if (element.getRootNode && element.getRootNode().host) {
        element = element.getRootNode().host;
        
        // Check if this host element is main-window
        if (element.tagName === 'MAIN-WINDOW') {
          const promptView = element.shadowRoot?.querySelector('prompt-view');
          if (promptView) return promptView;
          break;
        }
      } else {
        break;
      }
    }
    
    return null;
  }

  async handleCommandClick(command) {
    console.log(`Command clicked: ${command.name}`);
    
    try {
      // Find the Commands component to show output
      const mainWindow = document.querySelector('main-window');
      if (mainWindow && mainWindow.shadowRoot) {
        const commandsComponent = mainWindow.shadowRoot.querySelector('aider-commands');
        if (commandsComponent) {
          commandsComponent.showOutput = true;
          commandsComponent.commandOutput = [];
          commandsComponent.requestUpdate();
        }
      }
      
      console.log(`Executing command: ${command.name}`);
      
      // Find the prompt-view component
      const promptView = this.findPromptView();
      if (!promptView) {
        throw new Error("PromptView component not found");
      }
      
      // Set the input value to the command
      promptView.inputValue = command.name;
      
      // Call the sendPrompt method
      await promptView.sendPrompt();
      
    } catch (error) {
      console.error('Error executing command:', error);
      
      // Try to display error in Commands component
      const mainWindow = document.querySelector('main-window');
      if (mainWindow && mainWindow.shadowRoot) {
        const commandsComponent = mainWindow.shadowRoot.querySelector('aider-commands');
        if (commandsComponent && commandsComponent.displayCommandOutput) {
          commandsComponent.displayCommandOutput('error', `Error executing command: ${error.message}`);
        }
      }
      
      // Fall back to direct API call using the correct method name
      try {
        await this.call['EditBlockCoder.run'](command.name);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  }

  render() {
    return html`
      <div class="commands-container">
        <div class="commands-header">
          <span>Available Commands</span>
        </div>
        
        ${this.loading ? html`
          <div class="loading">Loading commands...</div>
        ` : this.error ? html`
          <div class="error">${this.error}</div>
        ` : html`
          <md-chip-set>
            ${repeat(
              this.commands, 
              command => command.name, // key function for efficient updates
              command => html`
                <md-assist-chip 
                  label="${command.name}"
                  @click=${() => this.handleCommandClick(command)}
                ></md-assist-chip>
              `
            )}
          </md-chip-set>
        `}
      </div>
    `;
  }
}

customElements.define('commands-buttons', CommandsButtons);
