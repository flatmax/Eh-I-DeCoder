/**
 * AssistantCard component for displaying assistant messages in a card format
 */
import { CardMarkdown } from './CardMarkdown.js';

export class AssistantCard extends CardMarkdown {
  constructor() {
    super();
    this.role = 'assistant';
  }
}
