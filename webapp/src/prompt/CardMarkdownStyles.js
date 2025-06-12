/**
 * Styles for CardMarkdown component
 */
import { css } from 'lit';

export class CardMarkdownStyles {
  static get styles() {
    return css`
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
  }
}
