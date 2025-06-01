/**
 * AssistantCard component for displaying assistant messages in a card format
 */
import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { marked } from 'marked';

export class AssistantCard extends LitElement {
  static properties = {
    content: { type: String }
  };

  constructor() {
    super();
    this.content = '';
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
    // Parse markdown content
    const parsedContent = marked(this.content || '');

    return html`
      <div class="card">
        <div class="card-content">${unsafeHTML(parsedContent)}</div>
      </div>
    `;
  }
}
