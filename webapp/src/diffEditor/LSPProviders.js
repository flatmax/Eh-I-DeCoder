export class LSPProviders {
  constructor(client) {
    this.client = client;
    this.disposables = [];
    this.languages = ['javascript', 'typescript', 'python', 'c', 'cpp'];
  }

  registerAll() {
    this.client.log('Registering LSP providers for languages:', this.languages);
    
    // First check what providers Monaco already has
    this.languages.forEach(language => {
      this.client.log(`Checking existing providers for ${language}:`, {
        hover: monaco.languages.hasHoverProvider(language),
        definition: monaco.languages.hasDefinitionProvider(language),
        completion: monaco.languages.hasCompletionProvider(language)
      });
    });
    
    this.languages.forEach(language => {
      this.registerProvidersForLanguage(language);
    });
    
    // Check again after registration
    this.languages.forEach(language => {
      this.client.log(`After registration - providers for ${language}:`, {
        hover: monaco.languages.hasHoverProvider(language),
        definition: monaco.languages.hasDefinitionProvider(language),
        completion: monaco.languages.hasCompletionProvider(language)
      });
    });
  }

  registerProvidersForLanguage(language) {
    this.client.log(`Registering providers for language: ${language}`);
    
    // Completion provider
    if (this.client.serverCapabilities?.completionProvider) {
      const completionProvider = monaco.languages.registerCompletionItemProvider(language, {
        provideCompletionItems: async (model, position, context, token) => {
          this.client.log(`[${language}] Completion requested at position:`, position);
          return await this.provideCompletionItems(model, position, context);
        },
        resolveCompletionItem: async (item, token) => {
          return item; // TODO: Implement completion item resolution
        },
        triggerCharacters: this.client.serverCapabilities.completionProvider.triggerCharacters || []
      });
      this.disposables.push(completionProvider);
      this.client.log(`Registered completion provider for ${language}`);
    }

    // Hover provider
    if (this.client.serverCapabilities?.hoverProvider) {
      const hoverProvider = monaco.languages.registerHoverProvider(language, {
        provideHover: async (model, position, token) => {
          this.client.log(`[${language}] Hover requested at position:`, {
            line: position.lineNumber,
            column: position.column,
            uri: model.uri.toString()
          });
          const result = await this.provideHover(model, position);
          this.client.log(`[${language}] Hover result:`, result);
          return result;
        }
      });
      this.disposables.push(hoverProvider);
      this.client.log(`Registered hover provider for ${language}`);
    }

    // Definition provider
    if (this.client.serverCapabilities?.definitionProvider) {
      const definitionProvider = monaco.languages.registerDefinitionProvider(language, {
        provideDefinition: async (model, position, token) => {
          this.client.log(`[${language}] Definition requested at position:`, { 
            uri: model.uri.toString(), 
            position: { line: position.lineNumber, column: position.column }
          });
          const result = await this.provideDefinition(model, position);
          this.client.log(`[${language}] Definition result:`, result);
          return result;
        }
      });
      this.disposables.push(definitionProvider);
      this.client.log(`Registered definition provider for ${language}`);
    }

    // References provider
    if (this.client.serverCapabilities?.referencesProvider) {
      const referencesProvider = monaco.languages.registerReferenceProvider(language, {
        provideReferences: async (model, position, context, token) => {
          this.client.log(`[${language}] References requested at position:`, position);
          return await this.provideReferences(model, position, context);
        }
      });
      this.disposables.push(referencesProvider);
      this.client.log(`Registered references provider for ${language}`);
    }

    // Document symbols provider
    if (this.client.serverCapabilities?.documentSymbolProvider) {
      const symbolsProvider = monaco.languages.registerDocumentSymbolProvider(language, {
        provideDocumentSymbols: async (model, token) => {
          this.client.log(`[${language}] Document symbols requested`);
          return await this.provideDocumentSymbols(model);
        }
      });
      this.disposables.push(symbolsProvider);
      this.client.log(`Registered document symbols provider for ${language}`);
    }

    // Formatting provider
    if (this.client.serverCapabilities?.documentFormattingProvider) {
      const formattingProvider = monaco.languages.registerDocumentFormattingEditProvider(language, {
        provideDocumentFormattingEdits: async (model, options, token) => {
          this.client.log(`[${language}] Formatting requested`);
          return await this.provideFormatting(model, options);
        }
      });
      this.disposables.push(formattingProvider);
      this.client.log(`Registered formatting provider for ${language}`);
    }

    // Code action provider
    if (this.client.serverCapabilities?.codeActionProvider) {
      const codeActionProvider = monaco.languages.registerCodeActionProvider(language, {
        provideCodeActions: async (model, range, context, token) => {
          this.client.log(`[${language}] Code actions requested`);
          return await this.provideCodeActions(model, range, context);
        }
      });
      this.disposables.push(codeActionProvider);
      this.client.log(`Registered code action provider for ${language}`);
    }

    // Rename provider
    if (this.client.serverCapabilities?.renameProvider) {
      const renameProvider = monaco.languages.registerRenameProvider(language, {
        provideRenameEdits: async (model, position, newName, token) => {
          this.client.log(`[${language}] Rename requested`);
          return await this.provideRenameEdits(model, position, newName);
        }
      });
      this.disposables.push(renameProvider);
      this.client.log(`Registered rename provider for ${language}`);
    }
  }

  // Provider implementations
  async provideCompletionItems(model, position, context) {
    if (!this.client.initialized) {
      this.client.log('Completion skipped - client not initialized');
      return { suggestions: [] };
    }

    const params = {
      textDocument: { uri: model.uri.toString() },
      position: { line: position.lineNumber - 1, character: position.column - 1 },
      context: {
        triggerKind: context.triggerKind,
        triggerCharacter: context.triggerCharacter
      }
    };

    this.client.log('Sending completion request with params:', params);
    const result = await this.client.sendRequest('textDocument/completion', params);
    
    if (!result) {
      this.client.log('No completion results received');
      return { suggestions: [] };
    }

    const items = Array.isArray(result) ? result : result.items || [];
    this.client.log(`Received ${items.length} completion items`);
    
    return {
      suggestions: items.map(item => ({
        label: item.label,
        kind: this.client.convertCompletionItemKind(item.kind),
        detail: item.detail,
        documentation: item.documentation,
        insertText: item.insertText || item.label,
        insertTextRules: item.insertTextFormat === 2 ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
        range: this.client.convertRange(item.textEdit?.range) || undefined,
        sortText: item.sortText,
        filterText: item.filterText,
        preselect: item.preselect
      }))
    };
  }

  async provideHover(model, position) {
    if (!this.client.initialized) {
      this.client.log('Hover skipped - client not initialized');
      return null;
    }

    const params = {
      textDocument: { uri: model.uri.toString() },
      position: { line: position.lineNumber - 1, character: position.column - 1 }
    };

    this.client.log('Sending hover request with params:', params);
    const result = await this.client.sendRequest('textDocument/hover', params);
    
    if (!result || !result.contents) {
      this.client.log('No hover results received');
      return null;
    }

    const contents = Array.isArray(result.contents) ? result.contents : [result.contents];
    this.client.log('Hover contents:', contents);
    
    return {
      contents: contents.map(content => ({
        value: typeof content === 'string' ? content : content.value,
        isTrusted: true
      })),
      range: this.client.convertRange(result.range)
    };
  }

  async provideDefinition(model, position) {
    if (!this.client.initialized) {
      this.client.log('Definition provider: client not initialized');
      return null;
    }

    const params = {
      textDocument: { uri: model.uri.toString() },
      position: { line: position.lineNumber - 1, character: position.column - 1 }
    };

    this.client.log('Definition provider: sending request with params:', params);

    const result = await this.client.sendRequest('textDocument/definition', params);
    
    if (!result) {
      this.client.log('Definition provider: no result received');
      return null;
    }

    const locations = Array.isArray(result) ? result : [result];
    this.client.log('Definition provider: locations found:', locations);
    
    // Convert locations to Monaco format
    const monacoLocations = locations.map(loc => ({
      uri: monaco.Uri.parse(loc.uri),
      range: this.client.convertRange(loc.range)
    }));

    // If we have a single definition location, navigate to it
    if (monacoLocations.length === 1) {
      const location = monacoLocations[0];
      this.client.log('Definition provider: navigating to single definition:', {
        uri: location.uri.toString(),
        range: location.range
      });

      // Emit navigation event
      this._emitNavigationEvent(location);
    } else if (monacoLocations.length > 1) {
      this.client.log('Definition provider: multiple definitions found, showing peek widget');
    }

    return monacoLocations;
  }

  _emitNavigationEvent(location) {
    // Convert file:// URI to relative path
    let filePath = location.uri.toString();
    if (filePath.startsWith('file://')) {
      filePath = filePath.substring(7);
    }

    // Emit event to navigate to the definition
    const event = new CustomEvent('navigate-to-definition', {
      detail: {
        filePath: filePath,
        line: location.range.startLineNumber,
        character: location.range.startColumn
      },
      bubbles: true,
      composed: true
    });

    this.client.log('Definition provider: emitting navigation event:', event.detail);

    // Find the Monaco editor element and dispatch from there
    const editorElement = document.querySelector('monaco-diff-editor');
    if (editorElement) {
      editorElement.dispatchEvent(event);
    } else {
      document.dispatchEvent(event);
    }
  }

  async provideReferences(model, position, context) {
    if (!this.client.initialized) {
      this.client.log('References skipped - client not initialized');
      return null;
    }

    const params = {
      textDocument: { uri: model.uri.toString() },
      position: { line: position.lineNumber - 1, character: position.column - 1 },
      context: { includeDeclaration: context.includeDeclaration }
    };

    this.client.log('Sending references request with params:', params);
    const result = await this.client.sendRequest('textDocument/references', params);
    
    if (!result) {
      this.client.log('No references results received');
      return null;
    }

    const locations = Array.isArray(result) ? result : [];
    this.client.log(`Found ${locations.length} references`);
    
    return locations.map(loc => ({
      uri: monaco.Uri.parse(loc.uri),
      range: this.client.convertRange(loc.range)
    }));
  }

  async provideDocumentSymbols(model) {
    if (!this.client.initialized) {
      this.client.log('Document symbols skipped - client not initialized');
      return null;
    }

    const params = {
      textDocument: { uri: model.uri.toString() }
    };

    this.client.log('Sending document symbols request');
    const result = await this.client.sendRequest('textDocument/documentSymbol', params);
    
    if (!result) {
      this.client.log('No document symbols received');
      return null;
    }

    const symbols = Array.isArray(result) ? result : [];
    this.client.log(`Found ${symbols.length} document symbols`);
    
    return symbols.map(symbol => this.client.convertDocumentSymbol(symbol));
  }

  async provideFormatting(model, options) {
    if (!this.client.initialized) {
      this.client.log('Formatting skipped - client not initialized');
      return null;
    }

    const params = {
      textDocument: { uri: model.uri.toString() },
      options: {
        tabSize: options.tabSize,
        insertSpaces: options.insertSpaces
      }
    };

    this.client.log('Sending formatting request');
    const result = await this.client.sendRequest('textDocument/formatting', params);
    
    if (!result) {
      this.client.log('No formatting results received');
      return null;
    }

    const edits = Array.isArray(result) ? result : [];
    this.client.log(`Received ${edits.length} formatting edits`);
    
    return edits.map(edit => ({
      range: this.client.convertRange(edit.range),
      text: edit.newText
    }));
  }

  async provideCodeActions(model, range, context) {
    if (!this.client.initialized) {
      this.client.log('Code actions skipped - client not initialized');
      return null;
    }

    const params = {
      textDocument: { uri: model.uri.toString() },
      range: {
        start: { line: range.startLineNumber - 1, character: range.startColumn - 1 },
        end: { line: range.endLineNumber - 1, character: range.endColumn - 1 }
      },
      context: {
        diagnostics: context.markers.map(marker => ({
          range: {
            start: { line: marker.startLineNumber - 1, character: marker.startColumn - 1 },
            end: { line: marker.endLineNumber - 1, character: marker.endColumn - 1 }
          },
          severity: marker.severity,
          code: marker.code,
          source: marker.source,
          message: marker.message
        }))
      }
    };

    this.client.log('Sending code actions request');
    const result = await this.client.sendRequest('textDocument/codeAction', params);
    
    if (!result) {
      this.client.log('No code actions received');
      return null;
    }

    const actions = Array.isArray(result) ? result : [];
    this.client.log(`Found ${actions.length} code actions`);
    
    return {
      actions: actions.map(action => ({
        title: action.title,
        kind: action.kind,
        diagnostics: context.markers,
        edit: action.edit ? this.client.convertWorkspaceEdit(action.edit) : undefined,
        command: action.command
      })),
      dispose: () => {}
    };
  }

  async provideRenameEdits(model, position, newName) {
    if (!this.client.initialized) {
      this.client.log('Rename skipped - client not initialized');
      return null;
    }

    const params = {
      textDocument: { uri: model.uri.toString() },
      position: { line: position.lineNumber - 1, character: position.column - 1 },
      newName: newName
    };

    this.client.log('Sending rename request');
    const result = await this.client.sendRequest('textDocument/rename', params);
    
    if (!result) {
      this.client.log('No rename results received');
      return null;
    }

    return this.client.convertWorkspaceEdit(result);
  }

  dispose() {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
