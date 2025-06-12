/**
 * CardMarkdown component for displaying markdown content in a card format
 */
import { LitElement, html, css } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { marked } from 'marked';

// Import Prism.js core first
import 'prismjs';

// Import language components - diff should be imported early
import 'prismjs/components/prism-diff.js';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-markdown.js';
import 'prismjs/components/prism-yaml.js';
import 'prismjs/components/prism-sql.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-c.js';
import 'prismjs/components/prism-cpp.js';
import 'prismjs/components/prism-matlab.js';
import 'prismjs/components/prism-makefile.js';

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

  static styles = css`
    :host {
      display: block;
      margin-bottom: 8px;
      width: 100%;
    }

    .card {
      background: white;
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      width: auto;
      max-width: 85%;
      box-sizing: border-box;
      display: inline-block;
    }

    .card.user {
      background: #e3f2fd;
      margin-left: auto;
      margin-right: 0;
      float: right;
      clear: both;
    }

    .card.assistant {
      background: #f5f5f5;
      margin-left: 0;
      margin-right: auto;
      float: left;
      clear: both;
    }

    .card.command {
      background: #fff3e0;
      font-family: monospace;
      white-space: pre-wrap;
      margin-left: 0;
      margin-right: auto;
      float: left;
      clear: both;
    }

    /* Clear floats after each card */
    :host::after {
      content: "";
      display: table;
      clear: both;
    }

    .card-header {
      font-size: 11px;
      color: #666;
      margin-bottom: 4px;
      text-transform: uppercase;
      font-weight: 500;
    }

    .card-content {
      line-height: 1.5;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    /* Compact markdown styles for small messages */
    .card-content > *:first-child {
      margin-top: 0;
    }

    .card-content > *:last-child {
      margin-bottom: 0;
    }

    .card-content h1,
    .card-content h2,
    .card-content h3,
    .card-content h4,
    .card-content h5,
    .card-content h6 {
      margin-top: 12px;
      margin-bottom: 6px;
    }

    .card-content p {
      margin: 6px 0;
    }

    .card-content ul,
    .card-content ol {
      margin: 6px 0;
      padding-left: 20px;
    }

    .card-content li {
      margin: 2px 0;
    }

    .card-content code {
      background: rgba(0, 0, 0, 0.05);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }

    .card-content pre {
      background: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      margin: 6px 0;
    }

    .card-content pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      font-size: 0.875em;
      line-height: 1.45;
    }

    .card-content blockquote {
      border-left: 3px solid #dfe2e5;
      margin: 6px 0;
      padding-left: 12px;
      color: #6a737d;
    }

    .card-content table {
      border-collapse: collapse;
      margin: 6px 0;
      width: 100%;
    }

    .card-content th,
    .card-content td {
      border: 1px solid #dfe2e5;
      padding: 4px 8px;
    }

    .card-content th {
      background: #f6f8fa;
      font-weight: 600;
    }

    .card-content img {
      max-width: 100%;
      height: auto;
    }

    .card-content a {
      color: #0366d6;
      text-decoration: none;
    }

    .card-content a:hover {
      text-decoration: underline;
    }

    /* Prism.js theme - Tomorrow Night */
    code[class*="language-"],
    pre[class*="language-"] {
      color: #ccc;
      background: none;
      font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
      font-size: 0.875em;
      text-align: left;
      white-space: pre;
      word-spacing: normal;
      word-break: normal;
      word-wrap: normal;
      line-height: 1.5;
      -moz-tab-size: 4;
      -o-tab-size: 4;
      tab-size: 4;
      -webkit-hyphens: none;
      -moz-hyphens: none;
      -ms-hyphens: none;
      hyphens: none;
    }

    /* Code blocks */
    pre[class*="language-"] {
      padding: 1em;
      margin: 0.5em 0;
      overflow: auto;
    }

    :not(pre) > code[class*="language-"],
    pre[class*="language-"] {
      background: #2d2d2d;
    }

    /* Inline code */
    :not(pre) > code[class*="language-"] {
      padding: 0.1em;
      border-radius: 0.3em;
      white-space: normal;
    }

    .token.comment,
    .token.block-comment,
    .token.prolog,
    .token.doctype,
    .token.cdata {
      color: #999;
    }

    .token.punctuation {
      color: #ccc;
    }

    .token.tag,
    .token.attr-name,
    .token.namespace,
    .token.deleted {
      color: #e2777a;
    }

    .token.function-name {
      color: #6196cc;
    }

    .token.boolean,
    .token.number,
    .token.function {
      color: #f08d49;
    }

    .token.property,
    .token.class-name,
    .token.constant,
    .token.symbol {
      color: #f8c555;
    }

    .token.selector,
    .token.important,
    .token.atrule,
    .token.keyword,
    .token.builtin {
      color: #cc99cd;
    }

    .token.string,
    .token.char,
    .token.attr-value,
    .token.regex,
    .token.variable {
      color: #7ec699;
    }

    .token.operator,
    .token.entity,
    .token.url {
      color: #67cdcc;
    }

    .token.important,
    .token.bold {
      font-weight: bold;
    }
    
    .token.italic {
      font-style: italic;
    }

    .token.entity {
      cursor: help;
    }

    .token.inserted {
      color: #7ec699;
    }

    .token.deleted {
      color: #e2777a;
    }

    /* Language-specific styles */
    .language-css .token.string,
    .style .token.string {
      color: #7ec699;
    }

    .language-javascript .token.keyword,
    .language-typescript .token.keyword,
    .language-jsx .token.keyword,
    .language-tsx .token.keyword {
      color: #cc99cd;
    }

    .language-python .token.keyword {
      color: #cc99cd;
    }

    .language-python .token.builtin {
      color: #f08d49;
    }

    /* Diff highlighting */
    .token.coord {
      color: #f8c555;
    }

    .token.diff.deleted {
      color: #e2777a;
      background-color: rgba(255, 0, 0, 0.1);
    }

    .token.diff.inserted {
      color: #7ec699;
      background-color: rgba(0, 255, 0, 0.1);
    }

    /* Line numbers */
    .line-numbers .line-numbers-rows {
      position: absolute;
      pointer-events: none;
      top: 0;
      font-size: 100%;
      left: -3.8em;
      width: 3em;
      letter-spacing: -1px;
      border-right: 1px solid #999;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }

    .line-numbers-rows > span {
      display: block;
      counter-increment: linenumber;
    }

    .line-numbers-rows > span:before {
      content: counter(linenumber);
      color: #999;
      display: block;
      padding-right: 0.8em;
      text-align: right;
    }
  `;

  processContent() {
    if (!this.content) return '';
    
    // For command role, don't process as markdown
    if (this.role === 'command') {
      return this.content;
    }
    
    // Process as markdown
    try {
      return marked(this.content);
    } catch (e) {
      console.error('Markdown parsing error:', e);
      return this.content;
    }
  }

  updated() {
    // After the component updates, manually highlight any code blocks that might not have been highlighted
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
            : unsafeHTML(processedContent)
          }
        </div>
      </div>
    `;
  }
}

customElements.define('card-markdown', CardMarkdown);
