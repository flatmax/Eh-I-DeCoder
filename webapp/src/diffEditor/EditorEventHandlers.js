export class EditorEventHandlers {
  constructor(editorComponent) {
    this.editorComponent = editorComponent;
  }

  setupEventHandlers() {
    const diffEditor = this.editorComponent.diffEditor;
    
    // Emit event on content change
    diffEditor.getModifiedEditor().onDidChangeModelContent(() => {
      this.editorComponent.dispatchEvent(new CustomEvent('content-changed', {
        detail: this.editorComponent.getContent(),
        bubbles: true,
        composed: true
      }));
    });

    // Track cursor position changes
    diffEditor.getModifiedEditor().onDidChangeCursorPosition((e) => {
      this.editorComponent.dispatchEvent(new CustomEvent('cursor-position-changed', {
        detail: {
          line: e.position.lineNumber,
          character: e.position.column
        },
        bubbles: true,
        composed: true
      }));
    });
  }

  setupNavigationKeyBindings() {
    const modifiedEditor = this.editorComponent.diffEditor.getModifiedEditor();
    
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
        this.editorComponent.dispatchEvent(new CustomEvent('navigation-back', {
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
        this.editorComponent.dispatchEvent(new CustomEvent('navigation-forward', {
          bubbles: true,
          composed: true
        }));
      }
    });
  }
}
