import { StateField, StateEffect } from '@codemirror/state';
import { Decoration } from '@codemirror/view';

export function createDiagnosticsExtension(fileUri) {
  // State field for tracking diagnostics
  const diagnosticsState = StateField.define({
    create() {
      return Decoration.none;
    },
    update(diagnostics, tr) {
      // Update diagnostics based on language server messages
      return diagnostics;
    }
  });

  // Listen for diagnostics
  window.addEventListener('language-diagnostics', (event) => {
    if (event.detail.uri === fileUri) {
      // Handle diagnostics for this file
      console.log('Diagnostics received:', event.detail.diagnostics);
    }
  });

  return diagnosticsState;
}
