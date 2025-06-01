/**
 * CommandsCard component for displaying command output in a card format
 */
import { CardMarkdown } from './CardMarkdown.js';

export class CommandsCard extends CardMarkdown {
  constructor() {
    super();
    this.role = 'command';
  }
}

customElements.define('commands-card', CommandsCard);
