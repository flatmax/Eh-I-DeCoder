import { LitElement, html } from 'lit';
import { MonacoDiffEditorStyles } from './MonacoDiffEditorStyles.js';
import { MonacoLoader } from './MonacoLoader.js';
import { MonacoKeyBindings } from './MonacoKeyBindings.js';
import { EditorConfig } from './EditorConfig.js';
import { EditorEventHandlers } from './EditorEventHandlers.js';
import { EditorContentManager } from './EditorContentManager.js';

class MonacoDiffEditor extends LitElement {
  static properties = {
    originalContent: { type: String },
    modifiedContent: { type: String },
    language: { type: String },
    theme: { type: String },
    readOnly: { type: Boolean }
  };

  static styles = MonacoDiffEditorStyles.styles;

  constructor() {
    super();
    this.originalContent = '';
    this.modifiedContent = '';
    this.language = 'javascript';
    this.theme = 'vs-dark';
    this.readOnly = false;
    this.diffEditor = null;
    this.monacoLoader = new MonacoLoader();
    this.keyBindings = new MonacoKeyBindings();
    this.eventHandlers = new EditorEventHandlers(this);
    this.contentManager = new EditorContentManager(this);
    this._targetPosition = null;
    this._contentVersion = 1;
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
      this.contentManager.updateContentIfChanged();
    }
    
    if (changedProperties.has('theme')) {
      monaco.editor.setTheme(this.theme);
    }
    
    if (changedProperties.has('readOnly')) {
      this._updateReadOnly();
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
    
    this.diffEditor = monaco.editor.createDiffEditor(container, EditorConfig.getEditorOptions(this.theme));

    this.contentManager.updateContent();
    this.eventHandlers.setupEventHandlers();
    this.keyBindings.setupKeyBindings(this.diffEditor, this);
    this.eventHandlers.setupNavigationKeyBindings();
    
    // Set up content change listener for LSP
    this._setupContentChangeListener();
    
    // Apply initial readOnly state to modified editor
    if (this.readOnly) {
      this._updateReadOnly();
    }
  }

  _setupContentChangeListener() {
    if (!this.diffEditor) return;
    
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    
    // Listen for content changes
    modifiedEditor.onDidChangeModelContent((event) => {
      const content = modifiedEditor.getValue();
      this._contentVersion++;
      
      // Dispatch content change event for LSP
      this.dispatchEvent(new CustomEvent('content-changed', {
        detail: {
          content: content,
          version: this._contentVersion,
          changes: event.changes
        },
        bubbles: true,
        composed: true
      }));
    });
  }

  _updateReadOnly() {
    if (!this.diffEditor) return;
    
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    modifiedEditor.updateOptions({ readOnly: this.readOnly });
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

  getCurrentPosition() {
    if (!this.diffEditor) return null;
    
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    const position = modifiedEditor.getPosition();
    
    if (position) {
      return {
        lineNumber: position.lineNumber,
        column: position.column
      };
    }
    
    return null;
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
    if (!this.diffEditor) {
      // Store position to apply when editor is ready
      this._targetPosition = { lineNumber: line, column: character };
      return;
    }
    
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    const model = modifiedEditor.getModel();
    
    if (!model) {
      // Store position to apply when model is ready
      this._targetPosition = { lineNumber: line, column: character };
      return;
    }
    
    // Validate position bounds
    const lineCount = model.getLineCount();
    const validLine = Math.min(Math.max(1, line), lineCount);
    const lineLength = model.getLineLength(validLine);
    const validColumn = Math.min(Math.max(1, character), lineLength + 1);
    
    const position = {
      lineNumber: validLine,
      column: validColumn
    };
    
    // Set cursor position using Monaco's built-in methods
    modifiedEditor.setPosition(position);
    modifiedEditor.revealPositionInCenter(position);
    modifiedEditor.focus();
    
    // Clear target position
    this._targetPosition = null;
  }

  applyTargetPositionIfSet() {
    if (this._targetPosition && this.diffEditor) {
      const { lineNumber, column } = this._targetPosition;
      this.scrollToPosition(lineNumber, column);
    }
  }
}

customElements.define('monaco-diff-editor', MonacoDiffEditor);
