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
   * Check if content has changed and models need updating
   */
  hasContentChanged(originalContent, modifiedContent, filePath, language) {
    const normalizedOriginal = originalContent || '';
    const normalizedModified = modifiedContent || '';
    const normalizedLastOriginal = this.lastContent.original || '';
    const normalizedLastModified = this.lastContent.modified || '';
    
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
    if (!this.hasContentChanged(originalContent, modifiedContent, filePath, language)) {
      return this.currentModels;
    }

    // Check if we can update existing models (same file path and language)
    if (this.canUpdateExistingModels(filePath, language)) {
      // Update existing models' content
      const updated = this.updateExistingModelsContent(originalContent, modifiedContent);
      if (updated) {
        // Update cache
        this.lastContent = {
          original: originalContent || '',
          modified: modifiedContent || '',
          filePath: filePath,
          language: language
        };
        return this.currentModels;
      }
    }

    // Create new models if we can't update existing ones
    this.createNewModels(originalContent, modifiedContent, filePath, language);

    // Update cache
    this.lastContent = {
      original: originalContent || '',
      modified: modifiedContent || '',
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
      const normalizedOriginal = originalContent || '';
      const normalizedModified = modifiedContent || '';

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
      const currentValue = this.currentModels.modified.getValue();
      if (currentValue !== newContent) {
        this.currentModels.modified.setValue(newContent);
      }
      this.lastContent.modified = newContent;
      return true;
    }
    return false;
  }

  /**
   * Update only the original model's content without recreating models
   */
  updateOriginalContent(newContent) {
    if (this.currentModels.original && !this.currentModels.original.isDisposed()) {
      const currentValue = this.currentModels.original.getValue();
      if (currentValue !== newContent) {
        this.currentModels.original.setValue(newContent);
      }
      this.lastContent.original = newContent;
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

    // Create new models
    const models = this.createModels(originalContent, modifiedContent, filePath, language);
    
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
    const original = originalContent || '';
    const modified = modifiedContent || '';
    const lang = language || 'plaintext';

    try {
      // Use centralized URI utility to create proper URIs
      const modifiedUri = lspUriUtils.createMonacoUri(filePath, false);
      const originalUri = lspUriUtils.createMonacoUri(filePath, true);

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
      const uniqueModifiedUri = lspUriUtils.createUniqueUri('inmemory://model/', '-modified');
      const uniqueOriginalUri = lspUriUtils.createUniqueUri('inmemory://model/', '-original');

      const originalModel = monaco.editor.createModel(original, language, uniqueOriginalUri);
      const modifiedModel = monaco.editor.createModel(modified, language, uniqueModifiedUri);

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
