/**
 * Commands component for displaying command output only
 * Command buttons have been moved to CommandsButtons component
 */
import {JRPCClient} from '@flatmax/jrpc-oo';
import {html, css} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import '@material/web/button/filled-button.js';

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
    this.serverURI = "ws://0.0.0.0:8999";
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

    .output-container {
      padding: 10px;
      background-color: #000;
      border-radius: 4px;
      font-family: monospace;
      color: #f8f8f8;
      max-height: 300px;
      overflow-y: hidden;
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

    .no-output-message {
      text-align: center;
      color: #666;
      font-style: italic;
      padding: 20px;
    }
  `;
  
  connectedCallback() {
    super.connectedCallback();
    this.addClass?.(this);
  }
  
  /**
   * Called when remote server is up
   */
  remoteIsUp() {
    console.log('Commands::remoteIsUp');
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
    const clearOutput = () => this.commandOutput = [];

    return html`
      <div class="commands-container">
        ${this.showOutput ? html`
          <div class="output-container">
            <div class="output-header">
              <span>Command Output</span>
              <md-filled-button dense @click=${clearOutput}>
                Clear
              </md-filled-button>
            </div>
            ${this.commandOutput.length === 0 ? 
              html`<div class="output-message">No output yet. Use commands from the Commands Tab tab to see results here.</div>` : 
              html`${repeat(
                this.commandOutput,
                (item, i) => i, // using index as key since items may not be unique
                item => html`<div class="output-message output-type-${item.type}">${item.message}</div>`
              )}`
            }
          </div>
        ` : html`
          <div class="no-output-message">
            Command output will appear here when you run commands from the Commands Tab tab.
          </div>
        `}
      </div>
    `;
  }
}

customElements.define('aider-commands', Commands);
