import { ViewPlugin } from '@codemirror/view';

export function createScrollbarChangeIndicator() {
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.decorations = null;
      this.scrollbarOverlay = null;
      this.createScrollbarOverlay();
      this.updateChangeMarkers();
    }

    createScrollbarOverlay() {
      // Create overlay container for change markers
      this.scrollbarOverlay = document.createElement('div');
      this.scrollbarOverlay.className = 'scrollbar-changes';
      
      // Find the scroller element and append overlay
      const scroller = this.view.dom.closest('.cm-editor')?.querySelector('.cm-scroller');
      if (scroller) {
        scroller.style.position = 'relative';
        scroller.appendChild(this.scrollbarOverlay);
      }
    }

    updateChangeMarkers() {
      if (!this.scrollbarOverlay) return;
      
      // Clear existing markers
      this.scrollbarOverlay.innerHTML = '';
      
      const state = this.view.state;
      const doc = state.doc;
      const totalHeight = this.view.contentHeight;
      const scrollerHeight = this.view.dom.getBoundingClientRect().height;
      
      // Find all change decorations
      const changes = this.findChanges(state);
      
      // Create markers for each change
      changes.forEach(change => {
        const marker = document.createElement('div');
        marker.className = `scrollbar-change-marker ${change.type}`;
        
        // Calculate position as percentage of document
        const startLine = doc.lineAt(change.from).number;
        const endLine = doc.lineAt(change.to).number;
        const startPercent = (startLine / doc.lines) * 100;
        const heightPercent = Math.max(0.5, ((endLine - startLine + 1) / doc.lines) * 100);
        
        marker.style.top = `${startPercent}%`;
        marker.style.height = `${heightPercent}%`;
        
        this.scrollbarOverlay.appendChild(marker);
      });
    }

    findChanges(state) {
      const changes = [];
      const decorations = state.facet(EditorView.decorations);
      
      // Look for merge decorations
      decorations.forEach(deco => {
        deco.iter(0, state.doc.length, (from, to, value) => {
          const classes = value.class || '';
          if (classes.includes('cm-deletedChunk') || classes.includes('cm-deletedLine')) {
            changes.push({ from, to, type: 'deleted' });
          } else if (classes.includes('cm-insertedChunk') || classes.includes('cm-insertedLine')) {
            changes.push({ from, to, type: 'added' });
          } else if (classes.includes('cm-changedChunk') || classes.includes('cm-changedLine')) {
            changes.push({ from, to, type: 'modified' });
          }
        });
      });
      
      return changes;
    }

    update(update) {
      if (update.docChanged || update.viewportChanged || update.geometryChanged) {
        this.updateChangeMarkers();
      }
    }

    destroy() {
      if (this.scrollbarOverlay) {
        this.scrollbarOverlay.remove();
      }
    }
  });
}
