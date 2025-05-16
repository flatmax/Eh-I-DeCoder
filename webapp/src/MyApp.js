import { LitElement, html, css } from 'lit';

export class MyApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 25px;
      color: var(--my-app-text-color, #000);
    }
    h1 {
      font-size: 2em;
      color: #4285f4;
    }
  `;

  static properties = {
    title: { type: String },
  };

  constructor() {
    super();
    this.title = 'My LitElement App';
  }

  render() {
    return html`
      <h1>${this.title}</h1>
      <p>This is a basic LitElement web application.</p>
      <p>Edit <code>src/my-app.js</code> to get started!</p>
    `;
  }
}
