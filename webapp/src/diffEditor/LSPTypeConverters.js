export class LSPTypeConverters {
  convertRange(lspRange) {
    if (!lspRange) return null;
    
    return new monaco.Range(
      lspRange.start.line + 1,
      lspRange.start.character + 1,
      lspRange.end.line + 1,
      lspRange.end.character + 1
    );
  }

  convertCompletionItemKind(kind) {
    // Map LSP completion item kinds to Monaco completion item kinds
    const kindMap = {
      1: monaco.languages.CompletionItemKind.Text,
      2: monaco.languages.CompletionItemKind.Method,
      3: monaco.languages.CompletionItemKind.Function,
      4: monaco.languages.CompletionItemKind.Constructor,
      5: monaco.languages.CompletionItemKind.Field,
      6: monaco.languages.CompletionItemKind.Variable,
      7: monaco.languages.CompletionItemKind.Class,
      8: monaco.languages.CompletionItemKind.Interface,
      9: monaco.languages.CompletionItemKind.Module,
      10: monaco.languages.CompletionItemKind.Property,
      11: monaco.languages.CompletionItemKind.Unit,
      12: monaco.languages.CompletionItemKind.Value,
      13: monaco.languages.CompletionItemKind.Enum,
      14: monaco.languages.CompletionItemKind.Keyword,
      15: monaco.languages.CompletionItemKind.Snippet,
      16: monaco.languages.CompletionItemKind.Color,
      17: monaco.languages.CompletionItemKind.File,
      18: monaco.languages.CompletionItemKind.Reference,
      19: monaco.languages.CompletionItemKind.Folder,
      20: monaco.languages.CompletionItemKind.EnumMember,
      21: monaco.languages.CompletionItemKind.Constant,
      22: monaco.languages.CompletionItemKind.Struct,
      23: monaco.languages.CompletionItemKind.Event,
      24: monaco.languages.CompletionItemKind.Operator,
      25: monaco.languages.CompletionItemKind.TypeParameter
    };
    
    return kindMap[kind] || monaco.languages.CompletionItemKind.Text;
  }

  convertDocumentSymbol(symbol) {
    return {
      name: symbol.name,
      detail: symbol.detail || '',
      kind: this.convertSymbolKind(symbol.kind),
      range: this.convertRange(symbol.range),
      selectionRange: this.convertRange(symbol.selectionRange),
      children: symbol.children ? symbol.children.map(child => this.convertDocumentSymbol(child)) : []
    };
  }

  convertSymbolKind(kind) {
    // Map LSP symbol kinds to Monaco symbol kinds
    const kindMap = {
      1: monaco.languages.SymbolKind.File,
      2: monaco.languages.SymbolKind.Module,
      3: monaco.languages.SymbolKind.Namespace,
      4: monaco.languages.SymbolKind.Package,
      5: monaco.languages.SymbolKind.Class,
      6: monaco.languages.SymbolKind.Method,
      7: monaco.languages.SymbolKind.Property,
      8: monaco.languages.SymbolKind.Field,
      9: monaco.languages.SymbolKind.Constructor,
      10: monaco.languages.SymbolKind.Enum,
      11: monaco.languages.SymbolKind.Interface,
      12: monaco.languages.SymbolKind.Function,
      13: monaco.languages.SymbolKind.Variable,
      14: monaco.languages.SymbolKind.Constant,
      15: monaco.languages.SymbolKind.String,
      16: monaco.languages.SymbolKind.Number,
      17: monaco.languages.SymbolKind.Boolean,
      18: monaco.languages.SymbolKind.Array,
      19: monaco.languages.SymbolKind.Object,
      20: monaco.languages.SymbolKind.Key,
      21: monaco.languages.SymbolKind.Null,
      22: monaco.languages.SymbolKind.EnumMember,
      23: monaco.languages.SymbolKind.Struct,
      24: monaco.languages.SymbolKind.Event,
      25: monaco.languages.SymbolKind.Operator,
      26: monaco.languages.SymbolKind.TypeParameter
    };
    
    return kindMap[kind] || monaco.languages.SymbolKind.Variable;
  }

  convertWorkspaceEdit(edit) {
    const edits = [];
    
    if (edit.changes) {
      for (const [uri, textEdits] of Object.entries(edit.changes)) {
        edits.push({
          resource: monaco.Uri.parse(uri),
          edits: textEdits.map(textEdit => ({
            range: this.convertRange(textEdit.range),
            text: textEdit.newText
          }))
        });
      }
    }
    
    return { edits };
  }
}
