import { LitElement, html, css } from 'lit';

export class ConfirmationDialog extends LitElement {
  static properties = {
    isOpen: { type: Boolean, state: true },
    subject: { type: String, state: true },
    question: { type: String, state: true },
    defaultValue: { type: String, state: true },
    allowNever: { type: Boolean, state: true },
    resolveCallback: { type: Function, state: true }
  };

  static styles = css`
    :host {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10000;
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .dialog {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow: hidden;
      animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .dialog-header {
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
    }

    .dialog-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .dialog-content {
      padding: 20px;
    }

    .question {
      margin-bottom: 16px;
      color: #555;
      line-height: 1.5;
      font-size: 16px;
    }

    .default-info {
      font-size: 14px;
      color: #666;
      margin-bottom: 16px;
      font-style: italic;
    }

    .dialog-footer {
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: #f5f5f5;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
      min-width: 80px;
    }

    button:focus {
      outline: none;
      box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
    }

    .btn-cancel {
      background: #f5f5f5;
      color: #666;
      border: 1px solid #ddd;
    }

    .btn-cancel:hover {
      background: #e0e0e0;
    }

    .btn-no {
      background: #ff5252;
      color: white;
    }

    .btn-no:hover {
      background: #f44336;
    }

    .btn-yes {
      background: #4CAF50;
      color: white;
    }

    .btn-yes:hover {
      background: #45a049;
    }

    .btn-yes.default {
      box-shadow: 0 0 0 2px #4CAF50;
    }

    .btn-no.default {
      box-shadow: 0 0 0 2px #ff5252;
    }

    .btn-never {
      background: #FF9800;
      color: white;
    }

    .btn-never:hover {
      background: #F57C00;
    }

    .keyboard-hint {
      font-size: 12px;
      color: #999;
      margin-top: 16px;
      text-align: center;
    }
  `;

  constructor() {
    super();
    this.isOpen = false;
    this.subject = '';
    this.question = '';
    this.defaultValue = null;
    this.allowNever = false;
    this.resolveCallback = null;
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.handleKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(e) {
    if (!this.isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.handleCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Enter key uses the default value
      if (this.defaultValue === true) {
        this.handleYes();
      } else if (this.defaultValue === false) {
        this.handleNo();
      } else {
        this.handleCancel();
      }
    } else if (e.key === 'y' || e.key === 'Y') {
      e.preventDefault();
      this.handleYes();
    } else if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      this.handleNo();
    } else if (this.allowNever && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault();
      this.handleNever();
    }
  }

  show(data) {
    this.subject = data.subject || '';
    this.question = data.question || 'Confirm action?';
    this.defaultValue = data.default;
    this.allowNever = data.allow_never || false;

    this.isOpen = true;
    this.setAttribute('open', '');

    // Return a promise that resolves with the user's response
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      
      // Focus the default button after render
      this.updateComplete.then(() => {
        let buttonToFocus;
        if (this.defaultValue === true) {
          buttonToFocus = this.shadowRoot.querySelector('.btn-yes');
        } else if (this.defaultValue === false) {
          buttonToFocus = this.shadowRoot.querySelector('.btn-no');
        } else {
          buttonToFocus = this.shadowRoot.querySelector('.btn-cancel');
        }
        if (buttonToFocus) {
          buttonToFocus.focus();
        }
      });
    });
  }

  hide() {
    this.isOpen = false;
    this.removeAttribute('open');
    this.resolveCallback = null;
  }

  handleCancel() {
    if (this.resolveCallback) {
      // User cancelled - use default or false
      this.resolveCallback(this.defaultValue !== null ? this.defaultValue : false);
    }
    this.hide();
  }

  handleYes() {
    if (this.resolveCallback) {
      this.resolveCallback(true);
    }
    this.hide();
  }

  handleNo() {
    if (this.resolveCallback) {
      this.resolveCallback(false);
    }
    this.hide();
  }

  handleNever() {
    if (this.resolveCallback) {
      this.resolveCallback('d');
    }
    this.hide();
  }

  render() {
    if (!this.isOpen) return html``;

    let defaultText = '';
    if (this.defaultValue !== null) {
      if (this.defaultValue === true) {
        defaultText = 'Default: Yes';
      } else if (this.defaultValue === false) {
        defaultText = 'Default: No';
      } else {
        defaultText = `Default: ${this.defaultValue}`;
      }
    }

    return html`
      <div class="overlay" @click=${this.handleCancel}>
        <div class="dialog" @click=${(e) => e.stopPropagation()}>
          ${this.subject ? html`
            <div class="dialog-header">
              <h3>${this.subject}</h3>
            </div>
          ` : ''}
          
          <div class="dialog-content">
            <div class="question">${this.question}</div>
            
            ${defaultText ? html`
              <div class="default-info">${defaultText}</div>
            ` : ''}
            
            <div class="keyboard-hint">
              Press Y for Yes, N for No${this.allowNever ? ', D for Don\'t Ask Again' : ''}, Enter for default, Escape to cancel
            </div>
          </div>
          
          <div class="dialog-footer">
            <button class="btn-cancel" @click=${this.handleCancel}>Cancel</button>
            ${this.allowNever ? html`
              <button class="btn-never" @click=${this.handleNever}>Don't Ask Again</button>
            ` : ''}
            <button 
              class="btn-no ${this.defaultValue === false ? 'default' : ''}" 
              @click=${this.handleNo}
            >
              No
            </button>
            <button 
              class="btn-yes ${this.defaultValue === true ? 'default' : ''}" 
              @click=${this.handleYes}
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('confirmation-dialog', ConfirmationDialog);
