// Language Server constants and enums

// Server capabilities
const SERVER_CAPABILITIES = {
  textDocumentSync: 1, // Full sync
  completionProvider: {
    resolveProvider: true,
    triggerCharacters: ['.', '(', '"', "'", '{', '[']
  },
  hoverProvider: true,
  definitionProvider: true,
  referencesProvider: true,
  documentSymbolProvider: true,
  workspaceSymbolProvider: true,
  codeActionProvider: true,
  codeLensProvider: {
    resolveProvider: true
  },
  documentFormattingProvider: true,
  documentRangeFormattingProvider: true,
  renameProvider: true,
  foldingRangeProvider: true
};

// Completion item kinds
const COMPLETION_ITEM_KIND = {
  Text: 1,
  Method: 2,
  Function: 3,
  Constructor: 4,
  Field: 5,
  Variable: 6,
  Class: 7,
  Interface: 8,
  Module: 9,
  Property: 10,
  Unit: 11,
  Value: 12,
  Enum: 13,
  Keyword: 14,
  Snippet: 15,
  Color: 16,
  File: 17,
  Reference: 18
};

// Diagnostic severity
const DIAGNOSTIC_SEVERITY = {
  Error: 1,
  Warning: 2,
  Information: 3,
  Hint: 4
};

// WebSocket server port
const WS_PORT = 8998;

module.exports = {
  SERVER_CAPABILITIES,
  COMPLETION_ITEM_KIND,
  DIAGNOSTIC_SEVERITY,
  WS_PORT
};
