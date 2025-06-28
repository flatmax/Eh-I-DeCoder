export class LSPManager {
    constructor(diffEditor) {
        this.diffEditor = diffEditor;
        this.lspPort = null;
        this.websocket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        this.openDocuments = new Map();
        this.pendingRequests = new Map();
        this.requestId = 1;
        this.isInitialized = false;
        this.initializationInProgress = false;
        this.registeredLanguages = new Set();
        
        this.handleConnectionOpen = this.handleConnectionOpen.bind(this);
        this.handleConnectionClose = this.handleConnectionClose.bind(this);
        this.handleConnectionError = this.handleConnectionError.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
    }

    async initialize(lspPort) {
        if (!lspPort) {
            console.log('LSP: No port provided, LSP features disabled');
            return false;
        }

        this.lspPort = lspPort;
        console.log(`LSP: Initializing with port ${lspPort}`);

        try {
            await this.connect();
            return true;
        } catch (error) {
            console.error('LSP: Failed to initialize:', error);
            return false;
        }
    }

    async connect() {
        if (this.websocket) {
            this.disconnect();
        }

        const wsUrl = `ws://localhost:${this.lspPort}`;
        console.log(`LSP: Connecting to ${wsUrl}`);

        return new Promise((resolve, reject) => {
            try {
                this.websocket = new WebSocket(wsUrl);
                
                this.websocket.onopen = () => {
                    this.handleConnectionOpen();
                    resolve();
                };
                
                this.websocket.onclose = (event) => {
                    this.handleConnectionClose(event);
                };
                
                this.websocket.onerror = (error) => {
                    this.handleConnectionError(error);
                    reject(error);
                };

                this.websocket.onmessage = this.handleMessage;

            } catch (error) {
                console.error('LSP: Error creating WebSocket:', error);
                reject(error);
            }
        });
    }

    async handleConnectionOpen() {
        console.log('LSP: Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.isInitialized = false;
        this.initializationInProgress = false;
        
        this.diffEditor.dispatchEvent(new CustomEvent('lsp-status-change', {
            detail: { connected: true },
            bubbles: true,
            composed: true
        }));

        try {
            await this.initializeLSP();
        } catch (error) {
            console.error('LSP: Initialization failed:', error);
            this.disconnect();
        }
    }

    handleConnectionClose(event) {
        console.log(`LSP: Disconnected (code: ${event.code})`);
        this.isConnected = false;
        this.isInitialized = false;
        this.initializationInProgress = false;

        this.diffEditor.dispatchEvent(new CustomEvent('lsp-status-change', {
            detail: { connected: false },
            bubbles: true,
            composed: true
        }));

        // Unregister Monaco providers when disconnected
        this.unregisterMonacoProviders();

        // Only attempt reconnection for unexpected disconnections
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`LSP: Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
                this.connect().catch(error => {
                    console.error('LSP: Reconnection failed:', error);
                });
            }, this.reconnectDelay);
        } else if (event.code !== 1000) {
            console.log('LSP: Max reconnection attempts reached');
        }
    }

    handleConnectionError(error) {
        console.error('LSP: Connection error:', error);
        this.isConnected = false;
        this.isInitialized = false;
        this.initializationInProgress = false;
    }

    handleMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            if (message.method === 'textDocument/publishDiagnostics') {
                this.handleDiagnostics(message.params);
            } else if (message.id && this.pendingRequests.has(message.id)) {
                // Handle response to our request
                const { resolve, reject } = this.pendingRequests.get(message.id);
                this.pendingRequests.delete(message.id);
                
                if (message.error) {
                    reject(new Error(message.error.message));
                } else {
                    resolve(message.result);
                }
            }
        } catch (error) {
            console.error('LSP: Error handling message:', error);
        }
    }

    async initializeLSP() {
        if (this.initializationInProgress) {
            return;
        }

        this.initializationInProgress = true;

        const params = {
            processId: null,
            rootUri: null,
            capabilities: {
                textDocument: {
                    synchronization: {
                        dynamicRegistration: false,
                        willSave: false,
                        willSaveWaitUntil: false,
                        didSave: false
                    },
                    completion: {
                        dynamicRegistration: false,
                        completionItem: {
                            snippetSupport: true,
                            commitCharactersSupport: true,
                            documentationFormat: ['markdown', 'plaintext']
                        }
                    },
                    hover: {
                        dynamicRegistration: false,
                        contentFormat: ['markdown', 'plaintext']
                    },
                    definition: {
                        dynamicRegistration: false
                    },
                    publishDiagnostics: {
                        relatedInformation: false,
                        versionSupport: false
                    }
                }
            }
        };

        try {
            // Step 1: Send initialize request and wait for the response
            const result = await this.sendRequest('initialize', params);

            // Step 2: Send initialized notification
            const initializedNotification = {
                jsonrpc: '2.0',
                method: 'initialized',
                params: {}
            };
            this.sendMessage(initializedNotification);
            console.log('LSP: Initialized');
            
            this.isInitialized = true;
            this.initializationInProgress = false;
            
            // Step 3: Register Monaco language providers
            await this.registerMonacoProviders();
            
        } catch (error) {
            console.error('LSP: Initialization failed:', error);
            this.initializationInProgress = false;
            throw error;
        }
    }

    async registerMonacoProviders() {
        if (!window.monaco) {
            console.log('LSP: Monaco not available, waiting for it to load...');
            await new Promise(resolve => {
                const interval = setInterval(() => {
                    if (window.monaco) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 100); // Check every 100ms
            });
            console.log('LSP: Monaco loaded, proceeding with provider registration.');
        }

        console.log('LSP: Registering Monaco language providers');

        // Languages to register LSP providers for
        const languages = ['javascript', 'typescript', 'python', 'cpp', 'c'];

        languages.forEach(language => {
            if (this.registeredLanguages.has(language)) {
                return; // Already registered
            }

            // Register completion provider
            monaco.languages.registerCompletionItemProvider(language, {
                provideCompletionItems: async (model, position) => {
                    try {
                        const uri = model.uri.toString();
                        const result = await this.getCompletion(uri, {
                            line: position.lineNumber - 1,
                            character: position.column - 1
                        });

                        if (!result || !result.items) {
                            return { suggestions: [] };
                        }

                        const suggestions = result.items.map(item => ({
                            label: item.label,
                            kind: this.convertCompletionItemKind(item.kind),
                            documentation: item.documentation,
                            detail: item.detail,
                            insertText: item.insertText || item.label,
                            range: position
                        }));

                        return { suggestions };
                    } catch (error) {
                        console.error('LSP: Error in completion provider:', error);
                        return { suggestions: [] };
                    }
                },
                triggerCharacters: ['.', ':', '>', '<']
            });

            // Register hover provider
            monaco.languages.registerHoverProvider(language, {
                provideHover: async (model, position) => {
                    try {
                        const uri = model.uri.toString();
                        const result = await this.getHover(uri, {
                            line: position.lineNumber - 1,
                            character: position.column - 1
                        });

                        if (!result || !result.contents) {
                            return null;
                        }

                        let contents = [];
                        if (Array.isArray(result.contents)) {
                            contents = result.contents.map(content => {
                                if (typeof content === 'string') {
                                    return { value: content };
                                }
                                return content;
                            });
                        } else if (typeof result.contents === 'string') {
                            contents = [{ value: result.contents }];
                        } else {
                            contents = [result.contents];
                        }

                        return {
                            contents: contents,
                            range: result.range ? this.convertRange(result.range) : undefined
                        };
                    } catch (error) {
                        console.error('LSP: Error in hover provider:', error);
                        return null;
                    }
                }
            });

            // Register definition provider
            monaco.languages.registerDefinitionProvider(language, {
                provideDefinition: async (model, position) => {
                    try {
                        const uri = model.uri.toString();
                        const result = await this.getDefinition(uri, {
                            line: position.lineNumber - 1,
                            character: position.column - 1
                        });

                        if (!result || !Array.isArray(result) || result.length === 0) {
                            return [];
                        }

                        return result.map(location => ({
                            uri: monaco.Uri.parse(location.uri),
                            range: this.convertRange(location.range)
                        }));
                    } catch (error) {
                        console.error('LSP: Error in definition provider:', error);
                        return [];
                    }
                }
            });

            this.registeredLanguages.add(language);
            console.log(`LSP: Registered providers for ${language}`);
        });
    }

    unregisterMonacoProviders() {
        // Monaco doesn't provide a direct way to unregister providers
        // They will be garbage collected when the LSPManager is destroyed
        this.registeredLanguages.clear();
    }

    convertCompletionItemKind(kind) {
        if (!window.monaco) return 0;
        
        const CompletionItemKind = monaco.languages.CompletionItemKind;
        
        switch (kind) {
            case 1: return CompletionItemKind.Text;
            case 2: return CompletionItemKind.Method;
            case 3: return CompletionItemKind.Function;
            case 4: return CompletionItemKind.Constructor;
            case 5: return CompletionItemKind.Field;
            case 6: return CompletionItemKind.Variable;
            case 7: return CompletionItemKind.Class;
            case 8: return CompletionItemKind.Interface;
            case 9: return CompletionItemKind.Module;
            case 10: return CompletionItemKind.Property;
            case 11: return CompletionItemKind.Unit;
            case 12: return CompletionItemKind.Value;
            case 13: return CompletionItemKind.Enum;
            case 14: return CompletionItemKind.Keyword;
            case 15: return CompletionItemKind.Snippet;
            case 16: return CompletionItemKind.Color;
            case 17: return CompletionItemKind.File;
            case 18: return CompletionItemKind.Reference;
            case 19: return CompletionItemKind.Folder;
            case 20: return CompletionItemKind.EnumMember;
            case 21: return CompletionItemKind.Constant;
            case 22: return CompletionItemKind.Struct;
            case 23: return CompletionItemKind.Event;
            case 24: return CompletionItemKind.Operator;
            case 25: return CompletionItemKind.TypeParameter;
            default: return CompletionItemKind.Text;
        }
    }

    convertRange(lspRange) {
        if (!window.monaco) return null;
        
        return new monaco.Range(
            lspRange.start.line + 1,
            lspRange.start.character + 1,
            lspRange.end.line + 1,
            lspRange.end.character + 1
        );
    }

    getNextRequestId() {
        return this.requestId++;
    }

    sendMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            try {
                this.websocket.send(JSON.stringify(message));
                return true;
            } catch (error) {
                console.error('LSP: Error sending message:', error);
                return false;
            }
        } else {
            return false;
        }
    }

    sendRequest(method, params) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('LSP not connected'));
                return;
            }

            const id = this.getNextRequestId();
            const message = {
                jsonrpc: '2.0',
                id: id,
                method: method,
                params: params
            };

            this.pendingRequests.set(id, { resolve, reject });
            
            const sent = this.sendMessage(message);
            if (!sent) {
                this.pendingRequests.delete(id);
                reject(new Error('Failed to send LSP request'));
                return;
            }

            // Set timeout for request
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error(`LSP request timeout for ${method}`));
                }
            }, 10000); // 10 second timeout
        });
    }

    openDocument(uri, languageId, content) {
        if (!this.isConnected || !this.isInitialized) {
            return;
        }

        const message = {
            jsonrpc: '2.0',
            method: 'textDocument/didOpen',
            params: {
                textDocument: {
                    uri: uri,
                    languageId: languageId,
                    version: 1,
                    text: content
                }
            }
        };

        this.openDocuments.set(uri, { languageId, version: 1 });
        this.sendMessage(message);
    }

    updateDocument(uri, content, version) {
        if (!this.isConnected || !this.isInitialized || !this.openDocuments.has(uri)) {
            return;
        }

        const message = {
            jsonrpc: '2.0',
            method: 'textDocument/didChange',
            params: {
                textDocument: {
                    uri: uri,
                    version: version
                },
                contentChanges: [{
                    text: content
                }]
            }
        };

        const doc = this.openDocuments.get(uri);
        doc.version = version;
        this.sendMessage(message);
    }

    closeDocument(uri) {
        if (!this.isConnected || !this.isInitialized || !this.openDocuments.has(uri)) {
            return;
        }

        const message = {
            jsonrpc: '2.0',
            method: 'textDocument/didClose',
            params: {
                textDocument: {
                    uri: uri
                }
            }
        };

        this.openDocuments.delete(uri);
        this.sendMessage(message);
    }

    async getCompletion(uri, position) {
        if (!this.isConnected || !this.isInitialized) {
            return null;
        }

        try {
            const result = await this.sendRequest('textDocument/completion', {
                textDocument: { uri: uri },
                position: position
            });
            return result;
        } catch (error) {
            console.error('LSP: Error getting completion:', error);
            return null;
        }
    }

    async getHover(uri, position) {
        if (!this.isConnected || !this.isInitialized) {
            return null;
        }

        try {
            const result = await this.sendRequest('textDocument/hover', {
                textDocument: { uri: uri },
                position: position
            });
            return result;
        } catch (error) {
            console.error('LSP: Error getting hover:', error);
            return null;
        }
    }

    async getDefinition(uri, position) {
        if (!this.isConnected || !this.isInitialized) {
            return null;
        }

        try {
            const result = await this.sendRequest('textDocument/definition', {
                textDocument: { uri: uri },
                position: position
            });
            return result;
        } catch (error) {
            console.error('LSP: Error getting definition:', error);
            return null;
        }
    }

    handleDiagnostics(params) {
        const { uri, diagnostics } = params;
        
        const monacoEditor = this.diffEditor.shadowRoot?.querySelector('monaco-diff-editor');
        if (monacoEditor && monacoEditor.diffEditor) {
            this.applyDiagnosticsToMonaco(monacoEditor.diffEditor, uri, diagnostics);
        }
    }

    applyDiagnosticsToMonaco(diffEditor, uri, diagnostics) {
        try {
            const modifiedEditor = diffEditor.getModifiedEditor();
            const model = modifiedEditor.getModel();
            
            if (!model) {
                return;
            }

            const markers = diagnostics.map(diagnostic => ({
                severity: this.convertSeverity(diagnostic.severity),
                startLineNumber: diagnostic.range.start.line + 1,
                startColumn: diagnostic.range.start.character + 1,
                endLineNumber: diagnostic.range.end.line + 1,
                endColumn: diagnostic.range.end.character + 1,
                message: diagnostic.message,
                source: diagnostic.source || 'LSP'
            }));

            monaco.editor.setModelMarkers(model, 'lsp', markers);
        } catch (error) {
            console.error('LSP: Error applying diagnostics:', error);
        }
    }

    convertSeverity(lspSeverity) {
        switch (lspSeverity) {
            case 1: return monaco.MarkerSeverity.Error;
            case 2: return monaco.MarkerSeverity.Warning;
            case 3: return monaco.MarkerSeverity.Info;
            case 4: return monaco.MarkerSeverity.Hint;
            default: return monaco.MarkerSeverity.Info;
        }
    }

    getLanguageIdFromFile(filePath) {
        const ext = filePath.split('.').pop()?.toLowerCase();
        const languageMap = {
            'py': 'python',
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'cpp': 'cpp',
            'cxx': 'cpp',
            'cc': 'cpp',
            'c': 'c',
            'hpp': 'cpp',
            'hxx': 'cpp',
            'h': 'c'
        };
        return languageMap[ext] || 'plaintext';
    }

    disconnect() {
        console.log('LSP: Disconnecting...');
        
        if (this.websocket) {
            // Close with normal closure code
            this.websocket.close(1000, 'Client disconnecting');
            this.websocket = null;
        }
        
        this.isConnected = false;
        this.isInitialized = false;
        this.initializationInProgress = false;
        this.openDocuments.clear();
        this.pendingRequests.clear();
        this.unregisterMonacoProviders();
    }

    destroy() {
        console.log('LSP: Destroying LSP manager...');
        this.disconnect();
    }
}
