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
    return originalContent !== this.lastContent.original || 
           modifiedContent !== this.lastContent.modified ||
           filePath !== this.lastContent.filePath ||
           language !== this.lastContent.language;
  }

  /**
   * Update models with new content
   */
  updateModels(originalContent, modifiedContent, filePath, language) {
    if (!this.hasContentChanged(originalContent, modifiedContent, filePath, language)) {
      return this.currentModels;
    }

    console.log(`MonacoModelManager: Updating models for file: ${filePath}`);

    // Clean up existing models
    this.disposeCurrentModels();

    // Create new models
    const models = this.createModels(originalContent, modifiedContent, filePath, language);

    // Update cache
    this.lastContent = {
      original: originalContent,
      modified: modifiedContent,
      filePath: filePath,
      language: language
    };

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

      console.log(`MonacoModelManager: Creating models with URIs - Modified: ${modifiedUri.toString()}, Original: ${originalUri.toString()}`);

      // Dispose any existing models with these URIs
      this.disposeExistingModels(originalUri, modifiedUri);

      // Create new models
      const originalModel = monaco.editor.createModel(original, lang, originalUri);
      const modifiedModel = monaco.editor.createModel(modified, lang, modifiedUri);

      // Store references
      this.currentModels = {
        original: originalModel,
        modified: modifiedModel
      };

      console.log(`MonacoModelManager: Successfully created models for ${filePath} (${lang})`);
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
    console.log('MonacoModelManager: Creating models with unique URIs as fallback');

    try {
      const uniqueModifiedUri = lspUriUtils.createUniqueUri('inmemory://model/', '-modified');
      const uniqueOriginalUri = lspUriUtils.createUniqueUri('inmemory://model/', '-original');

      const originalModel = monaco.editor.createModel(original, language, uniqueOriginalUri);
      const modifiedModel = monaco.editor.createModel(modified, language, uniqueModifiedUri);

      this.currentModels = {
        original: originalModel,
        modified: modifiedModel
      };

      console.log('MonacoModelManager: Successfully created models with unique URIs');
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
      console.log(`MonacoModelManager: Disposing current original model: ${this.currentModels.original.uri.toString()}`);
      try {
        this.currentModels.original.dispose();
      } catch (error) {
        console.warn('MonacoModelManager: Error disposing original model:', error);
      }
      this.currentModels.original = null;
    }

    if (this.currentModels.modified) {
      console.log(`MonacoModelManager: Disposing current modified model: ${this.currentModels.modified.uri.toString()}`);
      try {
        this.currentModels.modified.dispose();
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
      if (existingOriginal) {
        console.log(`MonacoModelManager: Disposing existing original model with URI: ${originalUri.toString()}`);
        existingOriginal.dispose();
      }

      const existingModified = monaco.editor.getModel(modifiedUri);
      if (existingModified) {
        console.log(`MonacoModelManager: Disposing existing modified model with URI: ${modifiedUri.toString()}`);
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
