import { createDiagnosticsExtension } from './extensions/DiagnosticsExtension.js';
import { createCompletionExtension } from './extensions/CompletionExtension.js';
import { createHoverExtension } from './extensions/HoverExtension.js';
import { createKeyBindingsExtension } from './extensions/KeyBindingsExtension.js';
import { createClickHandlerExtension } from './extensions/ClickHandlerExtension.js';
import { createDocumentSyncExtension } from './extensions/DocumentSyncExtension.js';
import { createThemeExtension } from './extensions/ThemeExtension.js';

export function createLanguageClientExtension(languageClient, filePath) {
  const fileUri = `file://${filePath}`;
  
  return [
    createDiagnosticsExtension(fileUri),
    createCompletionExtension(languageClient, fileUri),
    createHoverExtension(languageClient, fileUri),
    createKeyBindingsExtension(languageClient, fileUri),
    createClickHandlerExtension(languageClient, fileUri),
    createDocumentSyncExtension(languageClient, fileUri, filePath),
    createThemeExtension()
  ];
}
