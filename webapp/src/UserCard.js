/**
 * UserCard component for displaying user messages in a card format
 */
import { CardMarkdown } from './CardMarkdown.js';

export class UserCard extends CardMarkdown {
  constructor() {
    super();
    this.role = 'user';
  }
}
