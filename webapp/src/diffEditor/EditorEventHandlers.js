import { EventHelper } from '../utils/EventHelper.js';

export class EditorEventHandlers {
  constructor(editorComponent) {
    this.editorComponent = editorComponent;
  }

  setupEventHandlers() {
    const diffEditor = this.editorComponent.diffEditor;
    
    // Emit event on content change
    diffEditor.getModifiedEditor().onDidChangeModelContent(() => {
      EventHelper.dispatch(this.editorComponent, 'content-changed', 
        this.editorComponent.getContent()
      );
    });

    // Track cursor position changes
    diffEditor.getModifiedEditor().onDidChangeCursorPosition((e) => {
      EventHelper.dispatchCursorPositionChanged(
        this.editorComponent,
        e.position.lineNumber,
        e.position.column
      );
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
        EventHelper.dispatchNavigation(this.editorComponent, 'back');
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
        EventHelper.dispatchNavigation(this.editorComponent, 'forward');
      }
    });

    // Add switch to previous track action (Alt+Up)
    modifiedEditor.addAction({
      id: 'navigation-track-previous',
      label: 'Switch to Previous Track',
      keybindings: [
        monaco.KeyMod.Alt | monaco.KeyCode.UpArrow
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.9,
      run: () => {
        EventHelper.dispatch(this.editorComponent, 'navigation-track-previous');
      }
    });

    // Add switch to next track action (Alt+Down)
    modifiedEditor.addAction({
      id: 'navigation-track-next',
      label: 'Switch to Next Track',
      keybindings: [
        monaco.KeyMod.Alt | monaco.KeyCode.DownArrow
      ],
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 2.0,
      run: () => {
        EventHelper.dispatch(this.editorComponent, 'navigation-track-next');
      }
    });
  }
}
