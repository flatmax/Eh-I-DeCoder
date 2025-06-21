/**
 * CardMarkdown component for displaying markdown content in a card format
 */
import { LitElement, html } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { marked } from 'marked';
import { CardMarkdownStyles } from './CardMarkdownStyles.js';
import { setupPrism } from './PrismSetup.js';

export class CardMarkdown extends LitElement {
  static properties = {
    content: { type: String },
    role: { type: String, reflect: true }, // 'user', 'assistant', or 'command'
  };

  constructor() {
    super();
    this.content = '';
    this.role = 'assistant'; // default
    this.setupMarked();
  }

  setupMarked() {
    // Configure marked to use Prism.js for syntax highlighting
    marked.setOptions({
      highlight: function(code, lang) {
        if (lang && Prism.languages[lang]) {
          try {
            return Prism.highlight(code, Prism.languages[lang], lang);
          } catch (e) {
            console.error('Prism highlighting error:', e);
          }
        }
        return code;
      },
      breaks: true,
      gfm: true
    });
  }

  static styles = CardMarkdownStyles.styles;

  processContent() {
    if (!this.content) return '';
    
    // For command role and user role, don't process as markdown
    if (this.role === 'command' || this.role === 'user') {
      return this.content;
    }
    
    // Process as markdown only for assistant role
    try {
      return marked(this.content);
    } catch (e) {
      console.error('Markdown parsing error:', e);
      return this.content;
    }
  }

  updated() {
    // After the component updates, manually highlight any code blocks that might not have been highlighted
    // Only do this for assistant messages that use markdown
    if (this.role === 'assistant') {
      this.shadowRoot.querySelectorAll('pre code').forEach((block) => {
        // Check if it's already highlighted
        if (!block.classList.contains('language-')) {
          // Try to detect language from class or use plaintext
          const pre = block.parentElement;
          const langClass = Array.from(pre.classList).find(c => c.startsWith('language-'));
          if (langClass) {
            block.classList.add(langClass);
          }
        }
        
        // Re-highlight the block
        if (window.Prism) {
          Prism.highlightElement(block);
        }
      });
    }
  }

  render() {
    const classes = {
      card: true,
      [this.role]: true
    };

    const processedContent = this.processContent();

    return html`
      <div class=${classMap(classes)}>
        <div class="card-header">${this.role}</div>
        <div class="card-content">
          ${this.role === 'command' 
            ? html`<pre>${this.content}</pre>`
            : this.role === 'user'
            ? html`<div>${this.content}</div>`
            : unsafeHTML(processedContent)
          }
        </div>
      </div>
    `;
  }
}

// Ensure Prism is set up
setupPrism();

customElements.define('card-markdown', CardMarkdown);
