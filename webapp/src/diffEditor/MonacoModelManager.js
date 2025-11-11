import { lspUriUtils } from '../lsp/LSPUriUtils.js';

export class MonacoModelManager {
  constructor() {
    this.currentModels = {
      original: null,
      modified: null
    };
    this.lastContent = {
      original: null,
      modified: null,
      filePath: null,
      language: null
    };
  }

  /**
   * Ensure content is a valid string
   */
  _ensureValidContent(content) {
    if (content === null || content === undefined) {
      return '';
    }
    if (typeof content !== 'string') {
      console.warn('MonacoModelManager: Content is not a string, converting:', typeof content);
      return String(content);
    }
    return content;
  }

  /**
   * Check if content has changed and models need updating
   */
  hasContentChanged(originalContent, modifiedContent, filePath, language) {
    const normalizedOriginal = this._ensureValidContent(originalContent);
    const normalizedModified = this._ensureValidContent(modifiedContent);
    const normalizedLastOriginal = this._ensureValidContent(this.lastContent.original);
    const normalizedLastModified = this._ensureValidContent(this.lastContent.modified);
    
    const hasChanged = normalizedOriginal !== normalizedLastOriginal || 
                      normalizedModified !== normalizedLastModified ||
                      filePath !== this.lastContent.filePath ||
                      language !== this.lastContent.language;
    
    return hasChanged;
  }

  /**
   * Update models with new content - tries to update existing models first
   */
  updateModels(originalContent, modifiedContent, filePath, language) {
    // Ensure content is valid before proceeding
    const validOriginal = this._ensureValidContent(originalContent);
    const validModified = this._ensureValidContent(modifiedContent);

    if (!this.hasContentChanged(validOriginal, validModified, filePath, language)) {
      return this.currentModels;
    }

    // Check if we can update existing models (same file path and language)
    if (this.canUpdateExistingModels(filePath, language)) {
      // Update existing models' content
      const updated = this.updateExistingModelsContent(validOriginal, validModified);
      if (updated) {
        // Update cache
        this.lastContent = {
          original: validOriginal,
          modified: validModified,
          filePath: filePath,
          language: language
        };
        return this.currentModels;
      }
    }

    // Create new models if we can't update existing ones
    this.createNewModels(validOriginal, validModified, filePath, language);

    // Update cache
    this.lastContent = {
      original: validOriginal,
      modified: validModified,
      filePath: filePath,
      language: language
    };

    return this.currentModels;
  }

  /**
   * Check if we can update existing models instead of creating new ones
   */
  canUpdateExistingModels(filePath, language) {
    // Can only update if models exist and file path/language haven't changed
    return this.hasModels() &&
           this.lastContent.filePath === filePath &&
           this.lastContent.language === language &&
           !this.currentModels.original.isDisposed() &&
           !this.currentModels.modified.isDisposed();
  }

  /**
   * Update existing models' content without recreating them
   */
  updateExistingModelsContent(originalContent, modifiedContent) {
    try {
      const normalizedOriginal = this._ensureValidContent(originalContent);
      const normalizedModified = this._ensureValidContent(modifiedContent);

      // Update original model
      if (this.currentModels.original.getValue() !== normalizedOriginal) {
        this.currentModels.original.setValue(normalizedOriginal);
      }

      // Update modified model
      if (this.currentModels.modified.getValue() !== normalizedModified) {
        this.currentModels.modified.setValue(normalizedModified);
      }

      return true;
    } catch (error) {
      console.error('MonacoModelManager: Error updating existing models:', error);
      return false;
    }
  }

  /**
   * Update only the modified model's content without recreating models
   */
  updateModifiedContent(newContent) {
    if (this.currentModels.modified && !this.currentModels.modified.isDisposed()) {
      const validContent = this._ensureValidContent(newContent);
      const currentValue = this.currentModels.modified.getValue();
      if (currentValue !== validContent) {
        this.currentModels.modified.setValue(validContent);
      }
      this.lastContent.modified = validContent;
      return true;
    }
    return false;
  }

  /**
   * Update only the original model's content without recreating models
   */
  updateOriginalContent(newContent) {
    if (this.currentModels.original && !this.currentModels.original.isDisposed()) {
      const validContent = this._ensureValidContent(newContent);
      const currentValue = this.currentModels.original.getValue();
      if (currentValue !== validContent) {
        this.currentModels.original.setValue(validContent);
      }
      this.lastContent.original = validContent;
      return true;
    }
    return false;
  }

  /**
   * Create new models
   */
  createNewModels(originalContent, modifiedContent, filePath, language) {
    // Clean up existing models first
    this.disposeCurrentModels();

    // Ensure content is valid
    const validOriginal = this._ensureValidContent(originalContent);
    const validModified = this._ensureValidContent(modifiedContent);

    // Create new models
    const models = this.createModels(validOriginal, validModified, filePath, language);
    
    if (!models) {
      console.error('MonacoModelManager: Failed to create new models');
      return null;
    }

    return models;
  }

  /**
   * Create new Monaco models
   */
  createModels(originalContent, modifiedContent, filePath, language) {
    const original = this._ensureValidContent(originalContent);
    const modified = this._ensureValidContent(modifiedContent);
    const lang = language || 'plaintext';

    try {
      // Use centralized URI utility to create proper URIs
      const modifiedUri = lspUriUtils.createMonacoUri(filePath, false);
      const originalUri = lspUriUtils.createMonacoUri(filePath, true);

      // Validate URIs
      if (!modifiedUri || !originalUri) {
        throw new Error('Failed to create valid URIs for models');
      }

      // Dispose any existing models with these URIs
      this.disposeExistingModels(originalUri, modifiedUri);

      // Create new models
      const originalModel = monaco.editor.createModel(original, lang, originalUri);
      const modifiedModel = monaco.editor.createModel(modified, lang, modifiedUri);

      // Validate models were created successfully
      if (!originalModel || !modifiedModel) {
        throw new Error('Failed to create Monaco models');
      }

      // Store references
      this.currentModels = {
        original: originalModel,
        modified: modifiedModel
      };

      return this.currentModels;

    } catch (error) {
      console.error('MonacoModelManager: Error creating models:', error);
      // Fallback to unique URIs
      return this.createModelsWithUniqueUris(original, modified, lang);
    }
  }

  /**
   * Create models with unique URIs as fallback
   */
  createModelsWithUniqueUris(original, modified, language) {
    try {
      // Ensure content is valid
      const validOriginal = this._ensureValidContent(original);
      const validModified = this._ensureValidContent(modified);

      const uniqueModifiedUri = lspUriUtils.createUniqueUri('inmemory://model/', '-modified');
      const uniqueOriginalUri = lspUriUtils.createUniqueUri('inmemory://model/', '-original');

      // Validate URIs
      if (!uniqueModifiedUri || !uniqueOriginalUri) {
        throw new Error('Failed to create unique URIs');
      }

      const originalModel = monaco.editor.createModel(validOriginal, language, uniqueOriginalUri);
      const modifiedModel = monaco.editor.createModel(validModified, language, uniqueModifiedUri);

      // Validate models were created successfully
      if (!originalModel || !modifiedModel) {
        throw new Error('Failed to create Monaco models with unique URIs');
      }

      this.currentModels = {
        original: originalModel,
        modified: modifiedModel
      };

      return this.currentModels;

    } catch (error) {
      console.error('MonacoModelManager: Failed to create models even with unique URIs:', error);
      return null;
    }
  }

  /**
   * Dispose current models
   */
  disposeCurrentModels() {
    if (this.currentModels.original) {
      try {
        if (!this.currentModels.original.isDisposed()) {
          this.currentModels.original.dispose();
        }
      } catch (error) {
        console.warn('MonacoModelManager: Error disposing original model:', error);
      }
      this.currentModels.original = null;
    }

    if (this.currentModels.modified) {
      try {
        if (!this.currentModels.modified.isDisposed()) {
          this.currentModels.modified.dispose();
        }
      } catch (error) {
        console.warn('MonacoModelManager: Error disposing modified model:', error);
      }
      this.currentModels.modified = null;
    }
  }

  /**
   * Dispose existing models with specific URIs
   */
  disposeExistingModels(originalUri, modifiedUri) {
    try {
      const existingOriginal = monaco.editor.getModel(originalUri);
      if (existingOriginal && !existingOriginal.isDisposed()) {
        existingOriginal.dispose();
      }

      const existingModified = monaco.editor.getModel(modifiedUri);
      if (existingModified && !existingModified.isDisposed()) {
        existingModified.dispose();
      }
    } catch (error) {
      console.warn('MonacoModelManager: Error checking/disposing existing models:', error);
    }
  }

  /**
   * Get current models
   */
  getCurrentModels() {
    return this.currentModels;
  }

  /**
   * Check if models are currently available
   */
  hasModels() {
    return this.currentModels.original !== null && this.currentModels.modified !== null;
  }

  /**
   * Clean up all models
   */
  cleanup() {
    this.disposeCurrentModels();
    this.lastContent = {
      original: null,
      modified: null,
      filePath: null,
      language: null
    };
  }
}
