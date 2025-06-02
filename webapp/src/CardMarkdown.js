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
    role: { type: String, reflect: true }, // 'user', 'assistant', or 'command'
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

    .command-card {
      background-color: #2d2d2d;
      margin-right: auto;
    }
    
    .card-content {
      padding: 12px 16px;
      font-family: sans-serif;
      overflow-x: auto;
    }

    .command-card .card-content {
      font-family: monospace;
      color: #f8f8f8;
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

    /* Command output styling */
    .output-message {
      margin: 4px 0;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.4;
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
  `;

  render() {
    const classes = {
      card: true,
      'user-card': this.role === 'user',
      'assistant-card': this.role === 'assistant',
      'command-card': this.role === 'command'
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
