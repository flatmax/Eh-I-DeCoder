import { LitElement, html } from 'lit';
import { MonacoDiffEditorStyles } from './MonacoDiffEditorStyles.js';
import { MonacoLoader } from './MonacoLoader.js';
import { MonacoKeyBindings } from './MonacoKeyBindings.js';
import { EditorConfig } from './EditorConfig.js';
import { EditorEventHandlers } from './EditorEventHandlers.js';
import { lspUriUtils } from '../lsp/LSPUriUtils.js';

class MonacoDiffEditor extends LitElement {
  static properties = {
    originalContent: { type: String },
    modifiedContent: { type: String },
    filePath: { type: String },
    language: { type: String },
    theme: { type: String },
    readOnly: { type: Boolean }
  };

  static styles = MonacoDiffEditorStyles.styles;

  constructor() {
    super();
    this.originalContent = '';
    this.modifiedContent = '';
    this.filePath = null;
    this.language = 'javascript';
    this.theme = 'vs-dark';
    this.readOnly = false;
    this.diffEditor = null;
    this.monacoLoader = new MonacoLoader();
    this.keyBindings = new MonacoKeyBindings();
    this.eventHandlers = new EditorEventHandlers(this);
    this._targetPosition = null;
    this._contentVersion = 1;
    this._isInitialized = false;

    // Cache content to avoid unnecessary model recreation
    this._lastOriginalContent = null;
    this._lastModifiedContent = null;
    this._lastFilePath = null;
    this._lastLanguage = null;
    
    // Keep track of created models to avoid duplicates
    this._currentModels = {
      original: null,
      modified: null
    };
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
    if (!this.diffEditor || !this._isInitialized) return;
    
    if (changedProperties.has('originalContent') || 
        changedProperties.has('modifiedContent') ||
        changedProperties.has('filePath') ||
        changedProperties.has('language')) {
      this._updateEditorModels();
    }
    
    if (changedProperties.has('theme')) {
      monaco.editor.setTheme(this.theme);
    }
    
    if (changedProperties.has('readOnly')) {
      this._updateReadOnly();
    }
  }

  _initializeEditor() {
    if (this._isInitialized) {
      console.log('Monaco: Editor already initialized, skipping');
      return;
    }

    const container = this.shadowRoot.querySelector('#diff-editor-container');
    
    // Create a style element for Monaco's dynamic styles with absolute path
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @import url('/node_modules/monaco-editor/min/vs/editor/editor.main.css');
    `;
    this.shadowRoot.appendChild(styleElement);
    
    this.diffEditor = monaco.editor.createDiffEditor(container, EditorConfig.getEditorOptions(this.theme));
    this._isInitialized = true;

    this._updateEditorModels();
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

  /**
   * Update editor models using centralized URI utilities
   * This ensures consistent URI handling across the application
   */
  _updateEditorModels() {
    if (!this.diffEditor || !this._isInitialized) return;

    const contentChanged = this.originalContent !== this._lastOriginalContent || 
                           this.modifiedContent !== this._lastModifiedContent ||
                           this.filePath !== this._lastFilePath ||
                           this.language !== this._lastLanguage;
    
    if (!contentChanged) {
      return;
    }

    const original = this.originalContent || '';
    const modified = this.modifiedContent || '';
    const language = this.language || 'plaintext';
    
    console.log(`Monaco: Processing file path: ${this.filePath}`);
    
    // Use centralized URI utility to create proper URIs
    const modifiedUri = lspUriUtils.createMonacoUri(this.filePath, false);
    const originalUri = lspUriUtils.createMonacoUri(this.filePath, true);
    
    console.log(`Monaco: Created URIs - Modified: ${modifiedUri.toString()}, Original: ${originalUri.toString()}`);

    // Dispose of old models before setting new ones to prevent memory leaks and conflicts
    this._disposeCurrentModels();

    // Check if models with these URIs already exist and dispose them
    this._disposeExistingModels(originalUri, modifiedUri);

    // Create new models with the correct URI and language
    console.log(`Monaco: Creating new models with language: ${language}`);
    
    try {
      const originalModel = monaco.editor.createModel(original, language, originalUri);
      const modifiedModel = monaco.editor.createModel(modified, language, modifiedUri);

      console.log(`Monaco: Created models - Original URI: ${originalModel.uri.toString()}, Modified URI: ${modifiedModel.uri.toString()}`);

      // Store references to the new models
      this._currentModels.original = originalModel;
      this._currentModels.modified = modifiedModel;

      this.diffEditor.setModel({
          original: originalModel,
          modified: modifiedModel
      });

      // Update our content cache
      this._lastOriginalContent = this.originalContent;
      this._lastModifiedContent = this.modifiedContent;
      this._lastFilePath = this.filePath;
      this._lastLanguage = this.language;

      console.log(`Monaco: Updated models for ${this.filePath || 'unknown'} (${language})`);
      
      // Apply target position if set
      this.applyTargetPositionIfSet();
      
    } catch (error) {
      console.error('Monaco: Error creating models:', error);
      // If model creation fails, try to recover by using unique URIs
      this._createModelsWithUniqueUris(original, modified, language);
    }
  }

  _disposeCurrentModels() {
    if (this._currentModels.original) {
      console.log(`Monaco: Disposing current original model: ${this._currentModels.original.uri.toString()}`);
      try {
        this._currentModels.original.dispose();
      } catch (error) {
        console.warn('Monaco: Error disposing original model:', error);
      }
      this._currentModels.original = null;
    }
    
    if (this._currentModels.modified) {
      console.log(`Monaco: Disposing current modified model: ${this._currentModels.modified.uri.toString()}`);
      try {
        this._currentModels.modified.dispose();
      } catch (error) {
        console.warn('Monaco: Error disposing modified model:', error);
      }
      this._currentModels.modified = null;
    }
  }

  _disposeExistingModels(originalUri, modifiedUri) {
    // Check if models with these URIs already exist in Monaco's model service
    try {
      const existingOriginal = monaco.editor.getModel(originalUri);
      if (existingOriginal) {
        console.log(`Monaco: Disposing existing original model with URI: ${originalUri.toString()}`);
        existingOriginal.dispose();
      }
      
      const existingModified = monaco.editor.getModel(modifiedUri);
      if (existingModified) {
        console.log(`Monaco: Disposing existing modified model with URI: ${modifiedUri.toString()}`);
        existingModified.dispose();
      }
    } catch (error) {
      console.warn('Monaco: Error checking/disposing existing models:', error);
    }
  }

  _createModelsWithUniqueUris(original, modified, language) {
    // Fallback: create models with unique URIs to avoid conflicts
    console.log(`Monaco: Creating models with unique URIs as fallback`);
    
    try {
      const uniqueModifiedUri = lspUriUtils.createUniqueUri('inmemory://model/', '-modified');
      const uniqueOriginalUri = lspUriUtils.createUniqueUri('inmemory://model/', '-original');
      
      const originalModel = monaco.editor.createModel(original, language, uniqueOriginalUri);
      const modifiedModel = monaco.editor.createModel(modified, language, uniqueModifiedUri);

      this._currentModels.original = originalModel;
      this._currentModels.modified = modifiedModel;

      this.diffEditor.setModel({
          original: originalModel,
          modified: modifiedModel
      });

      console.log(`Monaco: Successfully created models with unique URIs`);
    } catch (error) {
      console.error('Monaco: Failed to create models even with unique URIs:', error);
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
  updateContent(originalContent, modifiedContent, language = 'javascript', filePath = null) {
    console.log(`Monaco: updateContent called with filePath: ${filePath}, language: ${language}`);
    this.originalContent = originalContent;
    this.modifiedContent = modifiedContent;
    this.language = language;
    this.filePath = filePath;
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

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Clean up models when component is removed
    this._disposeCurrentModels();
    
    // Dispose the diff editor
    if (this.diffEditor) {
      try {
        this.diffEditor.dispose();
      } catch (error) {
        console.warn('Monaco: Error disposing diff editor:', error);
      }
      this.diffEditor = null;
    }
    
    this._isInitialized = false;
  }
}

customElements.define('monaco-diff-editor', MonacoDiffEditor);
