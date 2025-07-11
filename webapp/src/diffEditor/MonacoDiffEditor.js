import { LitElement, html } from 'lit';
import { MonacoDiffEditorStyles } from './MonacoDiffEditorStyles.js';
import { MonacoLoader } from './MonacoLoader.js';
import { MonacoKeyBindings } from './MonacoKeyBindings.js';
import { EditorConfig } from './EditorConfig.js';
import { EditorEventHandlers } from './EditorEventHandlers.js';
import { MonacoModelManager } from './MonacoModelManager.js';
import { EventHelper } from '../utils/EventHelper.js';

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
    this.modelManager = new MonacoModelManager();
    this._targetPosition = null;
    this._contentVersion = 1;
    this._isInitialized = false;
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
   * Update editor models using the dedicated model manager
   */
  _updateEditorModels() {
    if (!this.diffEditor || !this._isInitialized) return;

    // Use model manager to handle model lifecycle
    // This will update existing models if possible, or create new ones if needed
    const models = this.modelManager.updateModels(
      this.originalContent,
      this.modifiedContent,
      this.filePath,
      this.language
    );

    if (models) {
      // Only set models in diff editor if they're new (not incremental updates)
      const currentModel = this.diffEditor.getModel();
      const needsModelSet = !currentModel || 
                           currentModel.original !== models.original ||
                           currentModel.modified !== models.modified;

      if (needsModelSet) {
        // Set the models in the diff editor
        this.diffEditor.setModel({
          original: models.original,
          modified: models.modified
        });
      }
      
      // Apply target position if set
      this.applyTargetPositionIfSet();
    }
  }

  _setupContentChangeListener() {
    if (!this.diffEditor) return;
    
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    
    // Listen for content changes
    modifiedEditor.onDidChangeModelContent((event) => {
      const content = modifiedEditor.getValue();
      this._contentVersion++;
      
      // Dispatch content change event for LSP using EventHelper
      EventHelper.dispatchContentChanged(this, content, this._contentVersion, event.changes);
    });
  }

  _updateReadOnly() {
    if (!this.diffEditor) return;
    
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    modifiedEditor.updateOptions({ readOnly: this.readOnly });
  }

  /**
   * Update only the modified content without recreating models
   */
  updateModifiedContentOnly(newContent) {
    if (this.modelManager && this.modelManager.updateModifiedContent(newContent)) {
      // Content updated successfully without recreating models
      // Update the property to keep it in sync
      this.modifiedContent = newContent;
      return true;
    }
    // Fall back to full update if needed
    this.modifiedContent = newContent;
    return false;
  }

  /**
   * Update only the original content without recreating models
   */
  updateOriginalContentOnly(newContent) {
    if (this.modelManager && this.modelManager.updateOriginalContent(newContent)) {
      // Content updated successfully without recreating models
      // Update the property to keep it in sync
      this.originalContent = newContent;
      return true;
    }
    // Fall back to full update if needed
    this.originalContent = newContent;
    return false;
  }

  /**
   * Update both contents without recreating models if possible
   */
  updateContentWithoutRecreatingModels(originalContent, modifiedContent) {
    // Check if we can update without recreating models
    if (this.modelManager && 
        this.modelManager.canUpdateExistingModels(this.filePath, this.language)) {
      
      const updated = this.modelManager.updateExistingModelsContent(originalContent, modifiedContent);
      if (updated) {
        // Update properties to keep them in sync
        this.originalContent = originalContent;
        this.modifiedContent = modifiedContent;
        
        // Update the model manager's cache
        this.modelManager.lastContent.original = originalContent || '';
        this.modelManager.lastContent.modified = modifiedContent || '';
        
        return true;
      }
    }
    
    // Fall back to normal update which may recreate models
    this.updateContent(originalContent, modifiedContent, this.language, this.filePath);
    return false;
  }

  // Public API
  updateContent(originalContent, modifiedContent, language = 'javascript', filePath = null) {
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
    
    // Clean up models using model manager
    this.modelManager.cleanup();
    
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
