import { ViewPlugin } from '@codemirror/view';
import { getLanguageId, offsetToPosition } from './utils/LanguageUtils.js';

export function createDocumentSyncExtension(languageClient, fileUri, filePath) {
  let documentVersion = 0;
  
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.view = view;
      this.initialize();
    }
    
    async initialize() {
      // Send didOpen when document is first opened
      const text = this.view.state.doc.toString();
      const languageId = getLanguageId(filePath);
      
      try {
        await languageClient.didOpen(fileUri, languageId, documentVersion, text);
      } catch (error) {
        console.error('Failed to open document:', error);
      }
    }
    
    update(update) {
      if (!update.docChanged || !languageClient.connected) return;
      
      // Increment version
      documentVersion++;
      
      // Build content changes
      const contentChanges = [];
      update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
        contentChanges.push({
          range: {
            start: offsetToPosition(update.startState.doc, fromA),
            end: offsetToPosition(update.startState.doc, toA)
          },
          text: inserted.toString()
        });
      });
      
      // Send didChange
      languageClient.didChange(fileUri, documentVersion, contentChanges).catch(error => {
        console.error('Failed to sync document changes:', error);
      });
    }
    
    destroy() {
      // Send didClose when document is closed
      languageClient.didClose(fileUri).catch(error => {
        console.error('Failed to close document:', error);
      });
    }
  });
}
