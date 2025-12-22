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
    showCopySuccess: { type: Boolean, state: true },
    showCopyToPromptSuccess: { type: Boolean, state: true },
  };

  constructor() {
    super();
    this.content = '';
    this.role = 'assistant'; // default
    this.showCopySuccess = false;
    this.showCopyToPromptSuccess = false;
    this.setupMarked();
    this.setupContentProcessors();
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

  setupContentProcessors() {
    // Strategy pattern for content processing based on role
    this.contentProcessors = {
      command: (content) => content,
      user: (content) => this.escapeHtml(content).replace(/\n/g, '<br>'),
      assistant: (content) => this.processMarkdown(content)
    };
  }

  escapeHtml(content) {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  processMarkdown(content) {
    try {
      const rawHtml = marked(content);
      // Wrap code blocks with a container that includes a copy button
      return this.wrapCodeBlocksWithCopyButton(rawHtml);
    } catch (e) {
      console.error('Markdown parsing error:', e);
      return content;
    }
  }

  wrapCodeBlocksWithCopyButton(html) {
    // Use a regex to find <pre><code> blocks and wrap them
    // This regex matches <pre> tags that contain <code> tags
    const preCodeRegex = /(<pre[^>]*>)(\s*<code[^>]*>)([\s\S]*?)(<\/code>\s*<\/pre>)/gi;
    
    let blockIndex = 0;
    return html.replace(preCodeRegex, (match, preOpen, codeOpen, codeContent, codeClosePreClose) => {
      const wrappedBlock = `<div class="code-block-wrapper" data-block-index="${blockIndex}">
        <button class="code-block-copy-button" data-block-index="${blockIndex}" title="Copy code">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        </button>
        ${preOpen}${codeOpen}${codeContent}${codeClosePreClose}
      </div>`;
      blockIndex++;
      return wrappedBlock;
    });
  }

  static styles = CardMarkdownStyles.styles;

  processContent() {
    if (!this.content) return '';
    
    const processor = this.contentProcessors[this.role] || this.contentProcessors.assistant;
    return processor(this.content);
  }

  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.content);
      this.showCopySuccess = true;
      
      // Hide success indicator after 2 seconds
      setTimeout(() => {
        this.showCopySuccess = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = this.content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        
        this.showCopySuccess = true;
        setTimeout(() => {
          this.showCopySuccess = false;
        }, 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
    }
  }

  async copyCodeBlock(button, codeContent) {
    try {
      await navigator.clipboard.writeText(codeContent);
      button.classList.add('success');
      
      // Change icon to checkmark
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      `;
      
      // Reset after 2 seconds
      setTimeout(() => {
        button.classList.remove('success');
        button.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        `;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy code block:', err);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = codeContent;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        
        button.classList.add('success');
        button.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        `;
        
        setTimeout(() => {
          button.classList.remove('success');
          button.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          `;
        }, 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
    }
  }

  handleCodeBlockCopyClick(event) {
    const button = event.target.closest('.code-block-copy-button');
    if (!button) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    // Find the associated code block
    const wrapper = button.closest('.code-block-wrapper');
    if (!wrapper) return;
    
    const codeElement = wrapper.querySelector('pre code');
    if (!codeElement) return;
    
    // Get the text content (without HTML tags from syntax highlighting)
    const codeContent = codeElement.textContent;
    this.copyCodeBlock(button, codeContent);
  }

  copyToPrompt() {
    // Dispatch a custom event that the PromptView can listen to
    this.dispatchEvent(new CustomEvent('copy-to-prompt', {
      detail: { content: this.content },
      bubbles: true,
      composed: true
    }));

    // Show success indicator
    this.showCopyToPromptSuccess = true;
    setTimeout(() => {
      this.showCopyToPromptSuccess = false;
    }, 2000);
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
        <div class="card-header">
          <span class="role-label">${this.role}</span>
          <div class="card-actions">
            <button 
              class="copy-to-prompt-button ${this.showCopyToPromptSuccess ? 'success' : ''}"
              @click=${this.copyToPrompt}
              title="Copy to prompt input"
              aria-label="Copy message content to prompt input"
            >
              ${this.showCopyToPromptSuccess ? html`
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              ` : html`
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              `}
            </button>
            <button 
              class="copy-button ${this.showCopySuccess ? 'success' : ''}"
              @click=${this.copyToClipboard}
              title="Copy to clipboard"
              aria-label="Copy message content to clipboard"
            >
              ${this.showCopySuccess ? html`
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              ` : html`
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
              `}
            </button>
          </div>
        </div>
        <div class="card-content" @click=${this.handleCodeBlockCopyClick}>
          ${this.role === 'command' 
            ? html`<pre>${this.content}</pre>`
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
