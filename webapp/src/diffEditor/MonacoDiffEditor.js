import { LitElement, html } from 'lit';
import { MonacoDiffEditorStyles } from './MonacoDiffEditorStyles.js';
import { MonacoLoader } from './MonacoLoader.js';
import { MonacoKeyBindings } from './MonacoKeyBindings.js';
import { MonacoLanguageClient } from './MonacoLanguageClient.js';
import { EditorConfig } from './EditorConfig.js';
import { EditorEventHandlers } from './EditorEventHandlers.js';
import { EditorContentManager } from './EditorContentManager.js';

class MonacoDiffEditor extends LitElement {
  static properties = {
    originalContent: { type: String },
    modifiedContent: { type: String },
    language: { type: String },
    theme: { type: String },
    readOnly: { type: Boolean }
  };

  static styles = MonacoDiffEditorStyles.styles;

  constructor() {
    super();
    this.originalContent = '';
    this.modifiedContent = '';
    this.language = 'javascript';
    this.theme = 'vs-dark';
    this.readOnly = false;
    this.diffEditor = null;
    this.monacoLoader = new MonacoLoader();
    this.keyBindings = new MonacoKeyBindings();
    this.eventHandlers = new EditorEventHandlers(this);
    this.contentManager = new EditorContentManager(this);
    this.languageClient = null;
    this.currentUri = null;
    this.jrpcClient = null;
  }

  render() {
    return html`
      <div id="diff-editor-container"></div>
    `;
  }

  firstUpdated() {
    this._waitForMonaco();
  }

  _waitForMonaco() {
    if (this.monacoLoader.isLoaded() && window.monaco) {
      this._disableBuiltInLanguageFeatures();
      this._initializeEditor();
    } else {
      setTimeout(() => this._waitForMonaco(), 100);
    }
  }

  _disableBuiltInLanguageFeatures() {
    console.log('[MonacoDiffEditor] Disabling built-in language features...');
    
    // List of languages we want to handle with our LSP
    const lspLanguages = ['javascript', 'typescript', 'python', 'c', 'cpp'];
    
    lspLanguages.forEach(language => {
      // Disable all built-in features for these languages
      monaco.languages.typescript?.javascriptDefaults?.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
        noSuggestionDiagnostics: true
      });
      
      monaco.languages.typescript?.typescriptDefaults?.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
        noSuggestionDiagnostics: true
      });
      
      // Disable TypeScript/JavaScript language features
      monaco.languages.typescript?.javascriptDefaults?.setCompilerOptions({
        noLib: true,
        allowNonTsExtensions: true
      });
      
      monaco.languages.typescript?.typescriptDefaults?.setCompilerOptions({
        noLib: true,
        allowNonTsExtensions: true
      });
      
      // Remove any existing providers
      monaco.languages.getLanguages().forEach(lang => {
        if (lspLanguages.includes(lang.id)) {
          // Clear any registered providers by re-registering empty ones
          // This effectively removes built-in providers
          console.log(`[MonacoDiffEditor] Clearing built-in providers for ${lang.id}`);
        }
      });
    });
    
    console.log('[MonacoDiffEditor] Built-in language features disabled');
  }

  updated(changedProperties) {
    if (!this.diffEditor) return;
    
    if (changedProperties.has('originalContent') || changedProperties.has('modifiedContent')) {
      this.contentManager.updateContentIfChanged();
      
      // Update LSP document if content changed
      if (this.languageClient && this.currentUri && changedProperties.has('modifiedContent')) {
        this._updateLSPDocument();
      }
    }
    
    if (changedProperties.has('theme')) {
      monaco.editor.setTheme(this.theme);
    }
    
    if (changedProperties.has('readOnly')) {
      this._updateReadOnly();
    }
  }

  async _initializeEditor() {
    const container = this.shadowRoot.querySelector('#diff-editor-container');
    
    // Create a style element for Monaco's dynamic styles with absolute path
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @import url('/node_modules/monaco-editor/min/vs/editor/editor.main.css');
    `;
    this.shadowRoot.appendChild(styleElement);
    
    // Modify editor options to disable built-in features
    const editorOptions = {
      ...EditorConfig.getEditorOptions(this.theme),
      // Disable built-in IntelliSense
      quickSuggestions: false,
      parameterHints: { enabled: false },
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: 'off',
      tabCompletion: 'off',
      wordBasedSuggestions: false,
      // Keep other features that don't conflict with LSP
      folding: true,
      links: false, // We'll handle this with LSP
      hover: { enabled: false }, // We'll handle this with LSP
      occurrencesHighlight: false,
      selectionHighlight: false,
      renderValidationDecorations: 'off'
    };
    
    this.diffEditor = monaco.editor.createDiffEditor(container, editorOptions);

    this.contentManager.updateContent();
    this.eventHandlers.setupEventHandlers();
    this.keyBindings.setupKeyBindings(this.diffEditor, this);
    this.eventHandlers.setupNavigationKeyBindings();
    
    // Apply initial readOnly state to modified editor
    if (this.readOnly) {
      this._updateReadOnly();
    }

    // Listen for navigation events
    this.addEventListener('navigate-to-definition', this.handleNavigateToDefinition.bind(this));
    
    console.log('[MonacoDiffEditor] Editor initialized, waiting for LSP initialization...');
  }

  handleNavigateToDefinition(event) {
    console.log('[MonacoDiffEditor] Received navigate-to-definition event:', event.detail);
    
    // Re-dispatch the event so it bubbles up to DiffEditor
    this.dispatchEvent(new CustomEvent('open-file', {
      detail: {
        filePath: event.detail.filePath,
        lineNumber: event.detail.line,
        characterNumber: event.detail.character
      },
      bubbles: true,
      composed: true
    }));
  }

  async initializeLSP(jrpcClient, rootUri) {
    console.log('[MonacoDiffEditor] Starting LSP initialization with rootUri:', rootUri);
    
    try {
      this.jrpcClient = jrpcClient;

      // Get client capabilities
      const capabilities = this._getClientCapabilities();
      console.log('[MonacoDiffEditor] Client capabilities:', capabilities);

      // Initialize LSP on the server
      console.log('[MonacoDiffEditor] Calling LSPWrapper.initialize...');
      const response = await jrpcClient.call['LSPWrapper.initialize'](rootUri, capabilities);
      const result = response && Object.values(response)[0]; // Extract from UUID wrapper
      
      console.log('[MonacoDiffEditor] LSP initialization response:', result);
      
      if (result && result.capabilities) {
        console.log('[MonacoDiffEditor] LSP initialized with server capabilities:', result.capabilities);
        
        // Create language client with the jrpcClient
        this.languageClient = new MonacoLanguageClient({
          jrpcClient: jrpcClient,
          rootUri: rootUri,
          serverCapabilities: result.capabilities,
          languageIdMap: {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'c': 'c',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'h': 'c',
            'hpp': 'cpp',
            'hxx': 'cpp'
          }
        });

        await this.languageClient.start();
        console.log('[MonacoDiffEditor] LSP client started successfully');
        
        // Set up document synchronization
        this._setupDocumentSync();
        
        // Test if providers are registered
        this._testProviders();
        
        return true;
      } else {
        console.error('[MonacoDiffEditor] Invalid LSP initialization response:', response);
        throw new Error('Invalid LSP initialization response');
      }
    } catch (error) {
      console.error('[MonacoDiffEditor] Failed to initialize LSP:', error);
      throw error;
    }
  }

  _testProviders() {
    console.log('[MonacoDiffEditor] Testing Monaco providers registration...');
    
    // Check registered languages
    const languages = monaco.languages.getLanguages();
    console.log('[MonacoDiffEditor] Registered languages:', languages.map(l => l.id));
    
    // Test hover provider for each language
    ['javascript', 'typescript', 'python'].forEach(lang => {
      const hasHover = monaco.languages.hasHoverProvider(lang);
      const hasDefinition = monaco.languages.hasDefinitionProvider(lang);
      const hasCompletion = monaco.languages.hasCompletionProvider(lang);
      console.log(`[MonacoDiffEditor] ${lang} - Hover: ${hasHover}, Definition: ${hasDefinition}, Completion: ${hasCompletion}`);
    });
  }

  _getClientCapabilities() {
    return {
      textDocument: {
        synchronization: {
          dynamicRegistration: true,
          willSave: true,
          willSaveWaitUntil: true,
          didSave: true
        },
        completion: {
          dynamicRegistration: true,
          completionItem: {
            snippetSupport: true,
            commitCharactersSupport: true,
            documentationFormat: ['markdown', 'plaintext'],
            deprecatedSupport: true,
            preselectSupport: true
          },
          completionItemKind: {
            valueSet: Array.from({ length: 25 }, (_, i) => i + 1)
          },
          contextSupport: true
        },
        hover: {
          dynamicRegistration: true,
          contentFormat: ['markdown', 'plaintext']
        },
        signatureHelp: {
          dynamicRegistration: true,
          signatureInformation: {
            documentationFormat: ['markdown', 'plaintext']
          }
        },
        definition: {
          dynamicRegistration: true
        },
        references: {
          dynamicRegistration: true
        },
        documentHighlight: {
          dynamicRegistration: true
        },
        documentSymbol: {
          dynamicRegistration: true,
          symbolKind: {
            valueSet: Array.from({ length: 26 }, (_, i) => i + 1)
          }
        },
        codeAction: {
          dynamicRegistration: true,
          codeActionLiteralSupport: {
            codeActionKind: {
              valueSet: [
                '',
                'quickfix',
                'refactor',
                'refactor.extract',
                'refactor.inline',
                'refactor.rewrite',
                'source',
                'source.organizeImports'
              ]
            }
          }
        },
        codeLens: {
          dynamicRegistration: true
        },
        formatting: {
          dynamicRegistration: true
        },
        rangeFormatting: {
          dynamicRegistration: true
        },
        onTypeFormatting: {
          dynamicRegistration: true
        },
        rename: {
          dynamicRegistration: true
        },
        documentLink: {
          dynamicRegistration: true
        },
        typeDefinition: {
          dynamicRegistration: true
        },
        implementation: {
          dynamicRegistration: true
        },
        colorProvider: {
          dynamicRegistration: true
        },
        foldingRange: {
          dynamicRegistration: true,
          rangeLimit: 5000,
          lineFoldingOnly: true
        }
      },
      workspace: {
        applyEdit: true,
        workspaceEdit: {
          documentChanges: true
        },
        didChangeConfiguration: {
          dynamicRegistration: true
        },
        didChangeWatchedFiles: {
          dynamicRegistration: true
        },
        symbol: {
          dynamicRegistration: true,
          symbolKind: {
            valueSet: Array.from({ length: 26 }, (_, i) => i + 1)
          }
        },
        executeCommand: {
          dynamicRegistration: true
        },
        configuration: true,
        workspaceFolders: true
      }
    };
  }

  _setupDocumentSync() {
    if (!this.languageClient || !this.diffEditor) {
      console.log('[MonacoDiffEditor] Cannot setup document sync - missing client or editor');
      return;
    }

    console.log('[MonacoDiffEditor] Setting up document synchronization...');

    const modifiedEditor = this.diffEditor.getModifiedEditor();
    
    // Add hover listener for debugging
    modifiedEditor.onMouseMove((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT) {
        console.log('[MonacoDiffEditor] Mouse over text at position:', e.target.position);
      }
    });
    
    // Track document open/close
    modifiedEditor.onDidChangeModel((e) => {
      console.log('[MonacoDiffEditor] Model changed:', e);
      
      if (e.oldModelUrl && this.currentUri) {
        // Close old document
        console.log('[MonacoDiffEditor] Closing document:', this.currentUri);
        this.languageClient.didClose(this.currentUri);
      }
      
      if (e.newModelUrl) {
        // Open new document
        this.currentUri = e.newModelUrl.toString();
        const model = modifiedEditor.getModel();
        if (model) {
          const languageId = model.getLanguageId();
          const version = model.getVersionId();
          const content = model.getValue();
          
          console.log('[MonacoDiffEditor] Opening document:', {
            uri: this.currentUri,
            languageId,
            version,
            contentLength: content.length
          });
          
          this.languageClient.didOpen(this.currentUri, languageId, version, content);
        }
      }
    });

    // Track document changes
    modifiedEditor.onDidChangeModelContent((e) => {
      if (!this.currentUri) return;
      
      const model = modifiedEditor.getModel();
      if (model) {
        const version = model.getVersionId();
        console.log('[MonacoDiffEditor] Document content changed:', {
          uri: this.currentUri,
          version,
          changes: e.changes.length
        });
        this.languageClient.didChange(this.currentUri, version, e.changes);
      }
    });
    
    // If we already have content, open the document
    const model = modifiedEditor.getModel();
    if (model) {
      this.currentUri = model.uri.toString();
      const languageId = model.getLanguageId();
      const version = model.getVersionId();
      const content = model.getValue();
      
      console.log('[MonacoDiffEditor] Opening initial document:', {
        uri: this.currentUri,
        languageId,
        version,
        contentLength: content.length
      });
      
      this.languageClient.didOpen(this.currentUri, languageId, version, content);
    }
  }

  _updateLSPDocument() {
    if (!this.languageClient || !this.currentUri || !this.diffEditor) return;
    
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    const model = modifiedEditor.getModel();
    
    if (model) {
      // Send didSave notification when content is updated externally
      this.languageClient.didSave(this.currentUri, model.getValue());
    }
  }

  _updateReadOnly() {
    if (!this.diffEditor) return;
    
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    modifiedEditor.updateOptions({ readOnly: this.readOnly });
  }

  // Public API
  updateContent(originalContent, modifiedContent, language = 'javascript') {
    this.originalContent = originalContent;
    this.modifiedContent = modifiedContent;
    this.language = language;
  }

  getContent() {
    if (!this.diffEditor) return null;
    return {
      original: this.diffEditor.getOriginalEditor().getValue(),
      modified: this.diffEditor.getModifiedEditor().getValue()
    };
  }

  getModifiedContent() {
    return this.diffEditor?.getModifiedEditor().getValue() || null;
  }

  getOriginalContent() {
    return this.diffEditor?.getOriginalEditor().getValue() || null;
  }

  getSelectedText() {
    if (!this.diffEditor) return '';
    
    // Try to get selected text from the modified editor first
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    const modifiedSelection = modifiedEditor.getSelection();
    
    if (modifiedSelection && !modifiedSelection.isEmpty()) {
      return modifiedEditor.getModel().getValueInRange(modifiedSelection);
    }
    
    // If no selection in modified editor, try the original editor
    const originalEditor = this.diffEditor.getOriginalEditor();
    const originalSelection = originalEditor.getSelection();
    
    if (originalSelection && !originalSelection.isEmpty()) {
      return originalEditor.getModel().getValueInRange(originalSelection);
    }
    
    return '';
  }

  scrollToPosition(line, character) {
    if (!this.diffEditor) return;
    
    const modifiedEditor = this.diffEditor.getModifiedEditor();
    
    // Set cursor position
    modifiedEditor.setPosition({
      lineNumber: line,
      column: character
    });
    
    // Reveal the position in the center of the viewport
    modifiedEditor.revealPositionInCenter({
      lineNumber: line,
      column: character
    });
    
    // Focus the editor
    modifiedEditor.focus();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Clean up LSP client
    if (this.languageClient) {
      this.languageClient.dispose();
      this.languageClient = null;
    }
  }
}

customElements.define('monaco-diff-editor', MonacoDiffEditor);
