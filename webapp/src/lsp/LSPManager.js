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

    handleConnectionOpen() {
        console.log('LSP: WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        this.diffEditor.dispatchEvent(new CustomEvent('lsp-status-change', {
            detail: { connected: true },
            bubbles: true,
            composed: true
        }));

        this.initializeLSP();
    }

    handleConnectionClose(event) {
        console.log('LSP: WebSocket disconnected', event.code, event.reason);
        this.isConnected = false;

        this.diffEditor.dispatchEvent(new CustomEvent('lsp-status-change', {
            detail: { connected: false },
            bubbles: true,
            composed: true
        }));

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`LSP: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => {
                this.connect().catch(error => {
                    console.error('LSP: Reconnection failed:', error);
                });
            }, this.reconnectDelay);
        }
    }

    handleConnectionError(error) {
        console.error('LSP: WebSocket error:', error);
        this.isConnected = false;
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

    initializeLSP() {
        const initializeMessage = {
            jsonrpc: '2.0',
            id: this.getNextRequestId(),
            method: 'initialize',
            params: {
                processId: null,
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
            }
        };

        this.sendMessage(initializeMessage);
    }

    getNextRequestId() {
        return this.requestId++;
    }

    sendMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
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
            this.sendMessage(message);

            // Set timeout for request
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('LSP request timeout'));
                }
            }, 10000); // 10 second timeout
        });
    }

    openDocument(uri, languageId, content) {
        if (!this.isConnected) return;

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
        if (!this.isConnected || !this.openDocuments.has(uri)) return;

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
        if (!this.isConnected || !this.openDocuments.has(uri)) return;

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
            
            if (!model) return;

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
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        this.isConnected = false;
        this.openDocuments.clear();
        this.pendingRequests.clear();
    }

    destroy() {
        this.disconnect();
    }
}
