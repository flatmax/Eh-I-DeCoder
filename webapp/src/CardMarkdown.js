/**
 * CardMarkdown component for displaying markdown content in a card format
 */
import { LitElement, html, css } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { marked } from 'marked';

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
      font-family: sans-serif;
      overflow-x: auto;
    }

    /* Markdown styling */
    .card-content pre {
      background-color: #f5f5f5;
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
    }
    
    .card-content code {
      font-family: monospace;
      background-color: #f5f5f5;
      padding: 2px 4px;
      border-radius: 3px;
    }
  `;

  render() {
    const classes = {
      card: true,
      'user-card': this.role === 'user',
      'assistant-card': this.role !== 'user'
    };

    // Parse markdown content
    const parsedContent = marked(this.content || '');

    return html`
      <div class=${classMap(classes)}>
        <div class="card-content">${unsafeHTML(parsedContent)}</div>
      </div>
    `;
  }
}
