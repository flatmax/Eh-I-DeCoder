import { LitElement, html } from 'lit';
import { MonacoDiffEditorStyles } from './MonacoDiffEditorStyles.js';
import { MonacoLoader } from './MonacoLoader.js';
import { MonacoKeyBindings } from './MonacoKeyBindings.js';

class MonacoDiffEditor extends LitElement {
  static properties = {
    originalContent: { type: String },
    modifiedContent: { type: String },
    language: { type: String },
    theme: { type: String }
  };

  static styles = MonacoDiffEditorStyles.styles;

  constructor() {
    super();
    this.originalContent = '';
    this.modifiedContent = '';
    this.language = 'javascript';
    this.theme = 'vs-dark';
    this.diffEditor = null;
    this.monacoLoader = new MonacoLoader();
    this.keyBindings = new MonacoKeyBindings();
  }

  render() {
    return html`
      <div id="diff-editor-container"></div>
    `;
  }

  firstUpdated() {
    this._waitForMonaco();
  }

  _waitForMonaco() {
    if (this.monacoLoader.isLoaded() && window.monaco) {
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
    
    this.diffEditor = monaco.editor.createDiffEditor(container, this._getEditorOptions());

    this._updateContent();
    this._setupEventHandlers();
    this.keyBindings.setupKeyBindings(this.diffEditor, this);
  }

  _getEditorOptions() {
    return {
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
    };
  }

  _setupEventHandlers() {
    // Emit event on content change
    this.diffEditor.getModifiedEditor().onDidChangeModelContent(() => {
      this.dispatchEvent(new CustomEvent('content-changed', {
        detail: this.getContent(),
        bubbles: true,
        composed: true
      }));
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

  getSelectedText() {
    if (!this.diffEditor) return '';
    
    // Try to get selected text from the modified editor first
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    const modifiedSelection = modifiedEditor.getSelection();
    
    if (modifiedSelection && !modifiedSelection.isEmpty()) {
      return modifiedEditor.getModel().getValueInRange(modifiedSelection);
    }
    
    // If no selection in modified editor, try the original editor
    const originalEditor = this.diffEditor.getOriginalEditor();
    const originalSelection = originalEditor.getSelection();
    
    if (originalSelection && !originalSelection.isEmpty()) {
      return originalEditor.getModel().getValueInRange(originalSelection);
    }
    
    return '';
  }
}

customElements.define('monaco-diff-editor', MonacoDiffEditor);
