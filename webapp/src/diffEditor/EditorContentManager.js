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
    
    // Store current scroll position and cursor position before updating
    const modifiedEditor = diffEditor.getModifiedEditor();
    const scrollTop = modifiedEditor.getScrollTop();
    const scrollLeft = modifiedEditor.getScrollLeft();
    const position = modifiedEditor.getPosition();
    
    // Create models with the content
    const originalModel = monaco.editor.createModel(original, this.editorComponent.language);
    const modifiedModel = monaco.editor.createModel(modified, this.editorComponent.language);
    
    // Set the diff model
    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel
    });
    
    // Restore scroll position and cursor position after a short delay
    setTimeout(() => {
      if (position) {
        modifiedEditor.setPosition(position);
      }
      modifiedEditor.setScrollTop(scrollTop);
      modifiedEditor.setScrollLeft(scrollLeft);
      
      // If original is empty but modified has content, ensure the editor is properly sized
      if (!original && modified && scrollTop === 0) {
        // Force a layout update to ensure proper rendering
        diffEditor.layout();
        modifiedEditor.focus();
        modifiedEditor.revealLine(1);
      }
    }, 0);
  }
}
