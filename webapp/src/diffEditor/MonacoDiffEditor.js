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
    this._setupNavigationKeyBindings();
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

    // Track cursor position changes
    this.diffEditor.getModifiedEditor().onDidChangeCursorPosition((e) => {
      this.dispatchEvent(new CustomEvent('cursor-position-changed', {
        detail: {
          line: e.position.lineNumber,
          character: e.position.column
        },
        bubbles: true,
        composed: true
      }));
    });
  }

  _setupNavigationKeyBindings() {
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    
    // Add navigation back action (Alt+Left)
    modifiedEditor.addAction({
      id: 'navigation-back',
      label: 'Navigate Back',
      keybindings: [
        monaco.KeyMod.Alt | monaco.KeyCode.LeftArrow
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.7,
      run: () => {
        this.dispatchEvent(new CustomEvent('navigation-back', {
          bubbles: true,
          composed: true
        }));
      }
    });

    // Add navigation forward action (Alt+Right)
    modifiedEditor.addAction({
      id: 'navigation-forward',
      label: 'Navigate Forward',
      keybindings: [
        monaco.KeyMod.Alt | monaco.KeyCode.RightArrow
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.8,
      run: () => {
        this.dispatchEvent(new CustomEvent('navigation-forward', {
          bubbles: true,
          composed: true
        }));
      }
    });
  }

  _updateContent() {
    if (!this.diffEditor) return;
    
    // Ensure we have content to display
    const original = this.originalContent || '';
    const modified = this.modifiedContent || '';
    
    // If both are empty, don't update
    if (!original && !modified) {
      return;
    }
    
    // Create models with the content
    const originalModel = monaco.editor.createModel(original, this.language);
    const modifiedModel = monaco.editor.createModel(modified, this.language);
    
    // Set the diff model
    this.diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel
    });
    
    // If original is empty but modified has content, ensure the editor is properly sized
    if (!original && modified) {
      // Force a layout update to ensure proper rendering
      setTimeout(() => {
        this.diffEditor.layout();
        
        // Also ensure the modified editor is focused and visible
        const modifiedEditor = this.diffEditor.getModifiedEditor();
        modifiedEditor.focus();
        modifiedEditor.revealLine(1);
      }, 100);
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

  scrollToPosition(line, character) {
    if (!this.diffEditor) return;
    
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    
    // Set cursor position
    modifiedEditor.setPosition({
      lineNumber: line,
      column: character
    });
    
    // Reveal the position in the center of the viewport
    modifiedEditor.revealPositionInCenter({
      lineNumber: line,
      column: character
    });
    
    // Focus the editor
    modifiedEditor.focus();
  }
}

customElements.define('monaco-diff-editor', MonacoDiffEditor);
