export class EditorContentManager {
  constructor(editorComponent) {
    this.editorComponent = editorComponent;
    this._lastOriginalContent = '';
    this._lastModifiedContent = '';
  }

  updateContentIfChanged() {
    const contentChanged = this.editorComponent.originalContent !== this._lastOriginalContent || 
                         this.editorComponent.modifiedContent !== this._lastModifiedContent;
    
    if (contentChanged) {
      this.updateContent();
      this._lastOriginalContent = this.editorComponent.originalContent;
      this._lastModifiedContent = this.editorComponent.modifiedContent;
    }
  }

  updateContent() {
    const diffEditor = this.editorComponent.diffEditor;
    if (!diffEditor) return;
    
    // Ensure we have content to display
    const original = this.editorComponent.originalContent || '';
    const modified = this.editorComponent.modifiedContent || '';
    
    // If both are empty, don't update
    if (!original && !modified) {
      return;
    }
    
    // Create models with the content
    const originalModel = monaco.editor.createModel(original, this.editorComponent.language);
    const modifiedModel = monaco.editor.createModel(modified, this.editorComponent.language);
    
    // Set the diff model
    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel
    });
    
    // Apply target position after model is set
    setTimeout(() => {
      this.editorComponent.applyTargetPositionIfSet();
      
      // If no target position and original is empty but modified has content, focus editor
      if (!this.editorComponent._targetPosition && !original && modified) {
        diffEditor.layout();
        const modifiedEditor = diffEditor.getModifiedEditor();
        modifiedEditor.focus();
        modifiedEditor.revealLine(1);
      }
    }, 50);
  }
}
