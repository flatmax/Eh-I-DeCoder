/**
 * CommandsCard component for displaying command output in a card format
 */
import { LitElement, html, css } from 'lit';
import { CardMarkdown } from './CardMarkdown.js';

export class CommandsCard extends LitElement {
  static properties = {
    commandOutput: { type: Array },
    title: { type: String }
  };

  constructor() {
    super();
    this.role = 'command';
    this.commandOutput = [];
    this.title = 'Command Output';
  }

  static styles = css`
    :host {
      display: block;
      margin-bottom: 16px;
      font-family: monospace;
    }

    .command-card {
      background-color: #f7f7f7;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background-color: #505050;
      color: white;
      font-weight: bold;
      font-size: 14px;
    }

    .card-body {
      padding: 12px;
      white-space: pre-wrap;
      overflow-x: auto;
      background-color: #1e1e1e;
      color: #f7f7f7;
      min-height: 20px;
    }

    .command-output {
      margin: 0;
      padding: 0;
      font-family: 'Courier New', Courier, monospace;
    }

    .card-actions {
      display: flex;
      justify-content: flex-end;
      padding: 4px;
    }

    button {
      background-color: transparent;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
    }

    button:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
  `;

  render() {
    console.log('CommandsCard render with output:', this.commandOutput);
    
    return html`
      <div class="command-card">
        <div class="card-header">
          <span>${this.title || 'Command Output'}</span>
          <div class="card-actions">
            <button @click=${this._clearOutput}>Clear</button>
          </div>
        </div>
        <div class="card-body">
          <pre class="command-output">${this._formatOutput()}</pre>
        </div>
      </div>
    `;
  }

  updated(changedProperties) {
    if (changedProperties.has('commandOutput')) {
      console.log('CommandsCard commandOutput updated:', this.commandOutput);
      this.requestUpdate();
    }
  }

  _formatOutput() {
    if (!this.commandOutput || !Array.isArray(this.commandOutput) || this.commandOutput.length === 0) {
      console.warn('CommandsCard: No output to display');
      return '';
    }

    const formattedOutput = this.commandOutput
      .map(item => {
        let text;
        
        if (typeof item === 'string') {
          text = item;
        } else if (item && item.message) {
          text = item.message;
        } else {
          text = JSON.stringify(item);
        }
        
        // Strip "output:" prefix if present
        if (text.startsWith('output:')) {
          text = text.substring(7);
        }
        
        return text;
      })
      .join('\n'); // Join with newlines instead of empty string
    
    console.log('Formatted output:', formattedOutput);
    return formattedOutput;
  }

  _clearOutput(e) {
    e.stopPropagation();
    this.dispatchEvent(new CustomEvent('clear-output', {
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define('commands-card', CommandsCard);
