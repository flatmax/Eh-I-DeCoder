/**
 * CommandsCard component for displaying command output in a card format
 */
import { LitElement, html, css } from 'lit';
import { CardMarkdown } from './CardMarkdown.js';

export class CommandsCard extends CardMarkdown {
  constructor() {
    super();
    this.role = 'command';
  }

  static styles = [
    CardMarkdown.styles,
    css`
      .command-card .card-content {
        overflow-x: auto;
        white-space: pre;
        font-family: 'Courier New', Courier, monospace;
      }
      
      /* Ensure code blocks inside command output have horizontal scrolling */
      .command-card pre, .command-card code {
        white-space: pre;
        overflow-x: auto;
        max-width: 100%;
      }
    `
  ];
}

customElements.define('commands-card', CommandsCard);
