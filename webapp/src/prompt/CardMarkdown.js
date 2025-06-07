/**
 * CardMarkdown component for displaying markdown content in a card format
 */
import { LitElement, html, css } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { marked } from 'marked';

// Import Prism.js and language components
import 'prismjs';
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
    // Configure marked to use Prism for syntax highlighting
    marked.setOptions({
      highlight: (code, lang) => {
        // Map common language aliases
        const langMap = {
          'js': 'javascript',
          'ts': 'typescript',
          'py': 'python',
          'html': 'markup',
          'xml': 'markup',
          'sh': 'bash',
          'shell': 'bash',
          'c++': 'cpp',
          'cxx': 'cpp',
          'cc': 'cpp',
          'h': 'c',
          'hpp': 'cpp',
          'hxx': 'cpp',
          'm': 'matlab',
          'makefile': 'makefile',
          'make': 'makefile',
          'autotools': 'makefile',
          'automake': 'makefile',
          'autoconf': 'bash'
        };
        
        const actualLang = langMap[lang] || lang;
        
        if (actualLang && window.Prism && window.Prism.languages[actualLang]) {
          try {
            return window.Prism.highlight(code, window.Prism.languages[actualLang], actualLang);
          } catch (err) {
            console.warn('Prism highlighting failed for language:', actualLang, err);
          }
        }
        return code;
      },
      langPrefix: 'language-',
      breaks: true,
      gfm: true
    });
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    
    // Re-run Prism highlighting after content updates
    if (changedProperties.has('content')) {
      this.highlightCode();
    }
  }

  highlightCode() {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      if (window.Prism) {
        // Find all code blocks in this component's shadow DOM
        const codeBlocks = this.shadowRoot.querySelectorAll('pre code[class*="language-"]');
        codeBlocks.forEach(block => {
          window.Prism.highlightElement(block);
        });
      }
    });
  }

  static styles = css`
    :host {
      display: block;
      margin-bottom: 12px;
      width: 100%;
    }
    
    .card {
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      max-width: 90%;
    }
    
    .user-card {
      background-color: #e1f5fe;
      margin-left: auto;
    }
    
    .assistant-card {
      background-color: #f1f1f1;
      margin-right: auto;
    }

    .command-card {
      background-color: #2d2d2d;
      margin-right: auto;
    }
    
    .card-content {
      padding: 12px 16px;
      font-family: sans-serif;
      overflow-x: auto;
    }

    .command-card .card-content {
      font-family: monospace;
      color: #f8f8f8;
    }

    /* Markdown styling */
    .card-content h1,
    .card-content h2,
    .card-content h3,
    .card-content h4,
    .card-content h5,
    .card-content h6 {
      margin-top: 16px;
      margin-bottom: 8px;
      font-weight: 600;
    }

    .card-content p {
      margin: 8px 0;
      line-height: 1.5;
    }

    .card-content ul,
    .card-content ol {
      margin: 8px 0;
      padding-left: 20px;
    }

    .card-content li {
      margin: 4px 0;
    }

    .card-content pre {
      background-color: #f8f8f8;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 16px;
      overflow-x: auto;
      margin: 16px 0;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 85%;
      line-height: 1.45;
    }
    
    .card-content code {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 85%;
      background-color: rgba(175, 184, 193, 0.2);
      padding: 0.2em 0.4em;
      border-radius: 3px;
    }

    /* Remove background from code inside pre blocks */
    .card-content pre code {
      background: none;
      padding: 0;
      border-radius: 0;
      color: inherit;
    }

    /* Prism.js syntax highlighting theme - Light theme */
    .token.comment,
    .token.prolog,
    .token.doctype,
    .token.cdata {
      color: #708090;
      font-style: italic;
    }

    .token.punctuation {
      color: #999999;
    }

    .token.namespace {
      opacity: 0.7;
    }

    .token.property,
    .token.tag,
    .token.boolean,
    .token.number,
    .token.constant,
    .token.symbol,
    .token.deleted {
      color: #905;
    }

    .token.selector,
    .token.attr-name,
    .token.string,
    .token.char,
    .token.builtin,
    .token.inserted {
      color: #690;
    }

    .token.operator,
    .token.entity,
    .token.url,
    .language-css .token.string,
    .style .token.string {
      color: #9a6e3a;
      background: none;
    }

    .token.atrule,
    .token.attr-value,
    .token.keyword {
      color: #07a;
    }

    .token.function,
    .token.class-name {
      color: #DD4A68;
    }

    .token.regex,
    .token.important,
    .token.variable {
      color: #e90;
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

    /* Additional token types for better highlighting */
    .token.method,
    .token.function-name {
      color: #6f42c1;
    }

    .token.parameter {
      color: #e36209;
    }

    .token.interpolation {
      color: #032f62;
    }

    .token.interpolation-punctuation {
      color: #d73a49;
    }

    /* C/C++ specific tokens */
    .token.directive,
    .token.directive-hash {
      color: #9a6e3a;
      font-weight: bold;
    }

    .token.macro {
      color: #e90;
    }

    /* MATLAB specific tokens */
    .token.matrix {
      color: #905;
    }

    .token.transpose {
      color: #07a;
    }

    /* Makefile specific tokens */
    .token.target {
      color: #DD4A68;
      font-weight: bold;
    }

    .token.recipe {
      color: #690;
    }

    /* Command output styling */
    .output-message {
      margin: 4px 0;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.4;
    }

    .output-type-output {
      color: #f8f8f8;
    }

    .output-type-error {
      color: #ff5555;
    }

    .output-type-warning {
      color: #ffb86c;
    }

    .output-type-print {
      color: #8be9fd;
    }

    /* Plain text styling for user content */
    .plain-text {
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.4;
    }

    /* Dark theme for command cards */
    .command-card pre {
      background-color: #1e1e1e;
      border-color: #444;
      color: #f8f8f8;
    }

    .command-card .token.comment,
    .command-card .token.prolog,
    .command-card .token.doctype,
    .command-card .token.cdata {
      color: #6a9955;
    }

    .command-card .token.string {
      color: #ce9178;
    }

    .command-card .token.keyword {
      color: #569cd6;
    }

    .command-card .token.function {
      color: #dcdcaa;
    }

    .command-card .token.number {
      color: #b5cea8;
    }

    .command-card .token.property,
    .command-card .token.tag,
    .command-card .token.boolean,
    .command-card .token.constant,
    .command-card .token.symbol {
      color: #4ec9b0;
    }

    .command-card .token.operator {
      color: #d4d4d4;
    }

    .command-card .token.punctuation {
      color: #d4d4d4;
    }

    /* Dark theme for C/C++ */
    .command-card .token.directive,
    .command-card .token.directive-hash {
      color: #c586c0;
    }

    .command-card .token.macro {
      color: #4fc1ff;
    }

    /* Dark theme for MATLAB */
    .command-card .token.matrix {
      color: #4ec9b0;
    }

    .command-card .token.transpose {
      color: #569cd6;
    }

    /* Dark theme for Makefile */
    .command-card .token.target {
      color: #dcdcaa;
    }

    .command-card .token.recipe {
      color: #ce9178;
    }
  `;

  render() {
    const classes = {
      card: true,
      'user-card': this.role === 'user',
      'assistant-card': this.role === 'assistant',
      'command-card': this.role === 'command'
    };

    // For user inputs, display as plain text without markdown parsing
    if (this.role === 'user') {
      return html`
        <div class=${classMap(classes)}>
          <div class="card-content plain-text">${this.content || ''}</div>
        </div>
      `;
    }

    // Parse markdown content for assistant and command roles
    const parsedContent = marked(this.content || '');

    return html`
      <div class=${classMap(classes)}>
        <div class="card-content">${unsafeHTML(parsedContent)}</div>
      </div>
    `;
  }
}
