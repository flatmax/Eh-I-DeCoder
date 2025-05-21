/**
 * CardMarkdown component for displaying markdown content in a card format
 */
import { LitElement, html, css } from 'lit';

export class CardMarkdown extends LitElement {
  static properties = {
    content: { type: String },
    role: { type: String }, // 'user' or 'assistant'
  };

  constructor() {
    super();
    this.content = '';
    this.role = 'assistant'; // default
  }

  static styles = css`
    :host {
      display: block;
      margin-bottom: 12px;
      width: 90%;
    }
    
    .card {
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .user-card {
      background-color: #e1f5fe;
      margin-left: 10%;
      align-self: flex-end;
    }
    
    .assistant-card {
      background-color: #f1f1f1;
      margin-right: 10%;
      align-self: flex-start;
    }
    
    .card-content {
      padding: 12px 16px;
      white-space: pre-wrap;
      font-family: monospace;
    }
  `;

  render() {
    return html`
      <div class="card ${this.role === 'user' ? 'user-card' : 'assistant-card'}">
        <div class="card-content">
          ${this.content}
        </div>
      </div>
    `;
  }
}

customElements.define('card-markdown', CardMarkdown);
