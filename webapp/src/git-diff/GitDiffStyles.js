import { css } from 'lit';
import { headerStyles } from './styles/HeaderStyles.js';
import { buttonStyles } from './styles/ButtonStyles.js';
import { gitStatusStyles } from './styles/GitStatusStyles.js';
import { fileTabStyles } from './styles/FileTabStyles.js';
import { conflictStyles } from './styles/ConflictStyles.js';
import { rebaseStyles } from './styles/RebaseStyles.js';
import { contentStyles } from './styles/ContentStyles.js';

export class GitDiffStyles {
  static get styles() {
    return [
      css`
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
      `,
      headerStyles,
      buttonStyles,
      gitStatusStyles,
      fileTabStyles,
      conflictStyles,
      rebaseStyles,
      contentStyles
    ];
  }
}
