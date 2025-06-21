import { LitElement, html, css } from 'lit';

class MonacoDiffEditor extends LitElement {
  static properties = {
    originalContent: { type: String },
    modifiedContent: { type: String },
    language: { type: String },
    theme: { type: String }
  };

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    #diff-editor-container {
      width: 100%;
      height: 100%;
    }

    /* Monaco diff editor styling */
    .monaco-diff-editor .line-insert {
      background-color: rgba(155, 185, 85, 0.2);
    }

    .monaco-diff-editor .line-delete {
      background-color: rgba(255, 97, 136, 0.2);
    }

    .monaco-diff-editor .char-insert {
      background-color: rgba(155, 185, 85, 0.4);
    }

    .monaco-diff-editor .char-delete {
      background-color: rgba(255, 97, 136, 0.4);
    }

    /* Scrollbar styling */
    .monaco-scrollable-element > .scrollbar > .slider {
      background: rgba(121, 121, 121, 0.4);
    }

    .monaco-scrollable-element > .scrollbar > .slider:hover {
      background: rgba(100, 100, 100, 0.7);
    }

    /* Line numbers */
    .monaco-editor .margin-view-overlays .line-numbers {
      color: #858585;
    }

    /* Active line highlighting */
    .monaco-editor .view-overlays .current-line {
      background-color: rgba(255, 255, 255, 0.04);
    }

    /* Selection highlighting */
    .monaco-editor .selected-text {
      background-color: #264f78;
    }

    /* Revert icon styling */
    .monaco-diff-editor .editor-revert-button {
      cursor: pointer;
      opacity: 0.7;
    }

    .monaco-diff-editor .editor-revert-button:hover {
      opacity: 1;
      background-color: rgba(255, 255, 255, 0.1);
    }

    /* Inline diff decorations */
    .monaco-diff-editor .inline-deleted-margin-view-zone,
    .monaco-diff-editor .inline-added-margin-view-zone {
      margin-left: 3px;
    }
  `;

  constructor() {
    super();
    this.originalContent = '';
    this.modifiedContent = '';
    this.language = 'javascript';
    this.theme = 'vs-dark';
    this.diffEditor = null;
    this._monacoLoaded = false;
    this._loadMonaco();
  }

  render() {
    return html`
      <div id="diff-editor-container"></div>
    `;
  }

  firstUpdated() {
    this._waitForMonaco();
  }

  _loadMonaco() {
    if (window.monaco) {
      this._monacoLoaded = true;
      return;
    }

    // Load Monaco loader script - use absolute path from root
    const loaderScript = document.createElement('script');
    loaderScript.src = '/node_modules/monaco-editor/min/vs/loader.js';
    loaderScript.onload = () => {
      // Configure Monaco with absolute paths
      window.require.config({ 
        paths: { 'vs': '/node_modules/monaco-editor/min/vs' }
      });

      // Load Monaco editor
      window.require(['vs/editor/editor.main'], () => {
        this._monacoLoaded = true;
      });
    };
    document.head.appendChild(loaderScript);
  }

  _waitForMonaco() {
    if (this._monacoLoaded && window.monaco) {
      this._initializeEditor();
    } else {
      setTimeout(() => this._waitForMonaco(), 100);
    }
  }

  updated(changedProperties) {
    if (!this.diffEditor) return;
    
    if (changedProperties.has('originalContent') || changedProperties.has('modifiedContent')) {
      this._updateContent();
    }
    if (changedProperties.has('theme')) {
      monaco.editor.setTheme(this.theme);
    }
  }

  _initializeEditor() {
    const container = this.shadowRoot.querySelector('#diff-editor-container');
    
    // Create a style element for Monaco's dynamic styles with absolute path
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @import url('/node_modules/monaco-editor/min/vs/editor/editor.main.css');
    `;
    this.shadowRoot.appendChild(styleElement);
    
    this.diffEditor = monaco.editor.createDiffEditor(container, {
      theme: this.theme,
      automaticLayout: true,
      renderSideBySide: true,
      renderWhitespace: 'selection',
      scrollBeyondLastLine: true,
      minimap: { enabled: true },
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      lineNumbers: 'on',
      folding: true,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10
      },
      // Enable inline diff decorations and revert icons
      enableSplitViewResizing: true,
      renderMarginRevertIcon: true,
      renderIndicators: true,
      renderOverviewRuler: true,
      diffCodeLens: true,
      ignoreTrimWhitespace: false,
      renderLineHighlight: 'all',
      renderValidationDecorations: 'on',
      showFoldingControls: 'always',
      glyphMargin: true,
      contextmenu: true,
      mouseWheelZoom: true,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: 'on',
      accessibilitySupport: 'auto',
      autoIndent: 'full',
      formatOnPaste: false,
      formatOnType: false,
      renderControlCharacters: false,
      renderIndentGuides: true,
      renderLineHighlightOnlyWhenFocus: false,
      revealHorizontalRightPadding: 30,
      roundedSelection: true,
      selectOnLineNumbers: true,
      selectionHighlight: true,
      showUnused: true,
      smoothScrolling: false,
      snippetSuggestions: 'inline',
      tabCompletion: 'on',
      useTabStops: true,
      wordWrap: 'off',
      wordWrapBreakAfterCharacters: '\t})]?|/&,;',
      wordWrapBreakBeforeCharacters: '([{',
      wrappingIndent: 'none',
      wrappingStrategy: 'simple'
    });

    this._updateContent();
    this._setupKeyBindings();

    // Emit event on content change
    this.diffEditor.getModifiedEditor().onDidChangeModelContent(() => {
      this.dispatchEvent(new CustomEvent('content-changed', {
        detail: this.getContent(),
        bubbles: true,
        composed: true
      }));
    });
  }

  _setupKeyBindings() {
    if (!this.diffEditor) return;

    const modifiedEditor = this.diffEditor.getModifiedEditor();

    // Add save action (Ctrl+S / Cmd+S)
    modifiedEditor.addAction({
      id: 'save-file',
      label: 'Save File',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: (editor) => {
        // Emit save event with the modified content
        this.dispatchEvent(new CustomEvent('save-file', {
          detail: {
            content: editor.getValue()
          },
          bubbles: true,
          composed: true
        }));
      }
    });
  }

  _updateContent() {
    if (this.diffEditor && this.originalContent && this.modifiedContent) {
      this.diffEditor.setModel({
        original: monaco.editor.createModel(this.originalContent, this.language),
        modified: monaco.editor.createModel(this.modifiedContent, this.language)
      });
    }
  }

  // Public API
  updateContent(originalContent, modifiedContent, language = 'javascript') {
    this.originalContent = originalContent;
    this.modifiedContent = modifiedContent;
    this.language = language;
  }

  getContent() {
    if (!this.diffEditor) return null;
    return {
      original: this.diffEditor.getOriginalEditor().getValue(),
      modified: this.diffEditor.getModifiedEditor().getValue()
    };
  }

  getModifiedContent() {
    return this.diffEditor?.getModifiedEditor().getValue() || null;
  }

  getOriginalContent() {
    return this.diffEditor?.getOriginalEditor().getValue() || null;
  }
}

customElements.define('monaco-diff-editor', MonacoDiffEditor);
