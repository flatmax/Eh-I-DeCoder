/**
 * CardMarkdown component for displaying markdown content in a card format
 */
import { LitElement, html, css } from 'lit';
import { classMap } from 'lit/directives/class-map.js';

export class CardMarkdown extends LitElement {
  static properties = {
    content: { type: String },
    role: { type: String, reflect: true }, // 'user' or 'assistant'
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
      width: 100%;
    }
    
    .card {
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      max-width: 90%;
    }
    
    .user-card {
      background-color: #e1f5fe;
      margin-left: auto;
    }
    
    .assistant-card {
      background-color: #f1f1f1;
      margin-right: auto;
    }
    
    .card-content {
      padding: 12px 16px;
      white-space: pre-wrap;
      font-family: monospace;
      overflow-x: auto;
    }
  `;

  render() {
    const classes = {
      card: true,
      'user-card': this.role === 'user',
      'assistant-card': this.role !== 'user'
    };

    return html`
      <div class=${classMap(classes)}>
        <div class="card-content">${this.content}</div>
      </div>
    `;
  }
}
