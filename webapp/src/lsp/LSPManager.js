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
            console.log('LSP: Closing existing connection before reconnecting');
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

                // Add pong handler for ping/pong keepalive
                this.websocket.onpong = () => {
                    console.log('LSP: Received pong from server');
                };

            } catch (error) {
                console.error('LSP: Error creating WebSocket:', error);
                reject(error);
            }
        });
    }

    async handleConnectionOpen() {
        console.log('LSP: WebSocket connected successfully');
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
            console.error('LSP: Initialization handshake failed:', error);
            this.disconnect();
        }
    }

    handleConnectionClose(event) {
        console.log(`LSP: WebSocket disconnected - Code: ${event.code}, Reason: "${event.reason}", WasClean: ${event.wasClean}`);
        this.isConnected = false;
        this.isInitialized = false;
        this.initializationInProgress = false;

        this.diffEditor.dispatchEvent(new CustomEvent('lsp-status-change', {
            detail: { connected: false },
            bubbles: true,
            composed: true
        }));

        // Only attempt reconnection for unexpected disconnections
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`LSP: Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms`);
            setTimeout(() => {
                this.connect().catch(error => {
                    console.error('LSP: Reconnection failed:', error);
                });
            }, this.reconnectDelay);
        } else if (event.code === 1000) {
            console.log('LSP: Connection closed normally, not attempting to reconnect');
        } else {
            console.log('LSP: Max reconnection attempts reached, giving up');
        }
    }

    handleConnectionError(error) {
        console.error('LSP: WebSocket error:', error);
        this.isConnected = false;
        this.isInitialized = false;
        this.initializationInProgress = false;
    }

    handleMessage(event) {
        console.log('LSP: Received raw message:', event.data);
        try {
            const message = JSON.parse(event.data);
            
            if (message.method === 'textDocument/publishDiagnostics') {
                console.log('LSP: Received diagnostics:', message.params);
                this.handleDiagnostics(message.params);
            } else if (message.id && this.pendingRequests.has(message.id)) {
                // Handle response to our request
                console.log(`LSP: Received response for request ${message.id}`);
                const { resolve, reject } = this.pendingRequests.get(message.id);
                this.pendingRequests.delete(message.id);
                
                if (message.error) {
                    console.error(`LSP: Request ${message.id} failed:`, message.error);
                    reject(new Error(message.error.message));
                } else {
                    console.log(`LSP: Request ${message.id} succeeded:`, message.result);
                    resolve(message.result);
                }
            } else {
                console.log('LSP: Received unhandled message:', message);
            }
        } catch (error) {
            console.error('LSP: Error handling message:', error);
        }
    }

    async initializeLSP() {
        if (this.initializationInProgress) {
            console.log('LSP: Initialization already in progress, skipping');
            return;
        }

        this.initializationInProgress = true;
        console.log('LSP: Starting initialization handshake...');

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
            console.log('LSP: Sending initialize request...');
            const result = await this.sendRequest('initialize', params);
            console.log('LSP: Received initialize response:', result);

            // Step 2: Send initialized notification
            const initializedNotification = {
                jsonrpc: '2.0',
                method: 'initialized',
                params: {}
            };
            this.sendMessage(initializedNotification);
            console.log('LSP: Sent initialized notification. Handshake complete.');
            
            this.isInitialized = true;
            this.initializationInProgress = false;
            
        } catch (error) {
            console.error('LSP: Initialization failed:', error);
            this.initializationInProgress = false;
            throw error;
        }
    }

    getNextRequestId() {
        return this.requestId++;
    }

    sendMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const messageStr = JSON.stringify(message);
            console.log('LSP: Sending message:', messageStr);
            try {
                this.websocket.send(messageStr);
                return true;
            } catch (error) {
                console.error('LSP: Error sending message:', error);
                return false;
            }
        } else {
            console.warn('LSP: Cannot send message - WebSocket not open. ReadyState:', this.websocket?.readyState);
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
            console.warn('LSP: Cannot open document - not connected or initialized');
            return;
        }

        console.log(`LSP: Opening document: ${uri} (${languageId})`);

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
            console.warn('LSP: Cannot update document - not connected, initialized, or document not open');
            return;
        }

        console.log(`LSP: Updating document: ${uri} (version ${version})`);

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
            console.warn('LSP: Cannot close document - not connected, initialized, or document not open');
            return;
        }

        console.log(`LSP: Closing document: ${uri}`);

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
            console.warn('LSP: Cannot get completion - not connected or initialized');
            return null;
        }

        try {
            console.log(`LSP: Requesting completion for ${uri} at position`, position);
            const result = await this.sendRequest('textDocument/completion', {
                textDocument: { uri: uri },
                position: position
            });
            console.log('LSP: Completion result:', result);
            return result;
        } catch (error) {
            console.error('LSP: Error getting completion:', error);
            return null;
        }
    }

    async getHover(uri, position) {
        if (!this.isConnected || !this.isInitialized) {
            console.warn('LSP: Cannot get hover - not connected or initialized');
            return null;
        }

        try {
            console.log(`LSP: Requesting hover for ${uri} at position`, position);
            const result = await this.sendRequest('textDocument/hover', {
                textDocument: { uri: uri },
                position: position
            });
            console.log('LSP: Hover result:', result);
            return result;
        } catch (error) {
            console.error('LSP: Error getting hover:', error);
            return null;
        }
    }

    async getDefinition(uri, position) {
        if (!this.isConnected || !this.isInitialized) {
            console.warn('LSP: Cannot get definition - not connected or initialized');
            return null;
        }

        try {
            console.log(`LSP: Requesting definition for ${uri} at position`, position);
            const result = await this.sendRequest('textDocument/definition', {
                textDocument: { uri: uri },
                position: position
            });
            console.log('LSP: Definition result:', result);
            return result;
        } catch (error) {
            console.error('LSP: Error getting definition:', error);
            return null;
        }
    }

    handleDiagnostics(params) {
        const { uri, diagnostics } = params;
        console.log(`LSP: Applying ${diagnostics.length} diagnostics for ${uri}`);
        
        const monacoEditor = this.diffEditor.shadowRoot?.querySelector('monaco-diff-editor');
        if (monacoEditor && monacoEditor.diffEditor) {
            this.applyDiagnosticsToMonaco(monacoEditor.diffEditor, uri, diagnostics);
        } else {
            console.warn('LSP: Monaco editor not found, cannot apply diagnostics');
        }
    }

    applyDiagnosticsToMonaco(diffEditor, uri, diagnostics) {
        try {
            const modifiedEditor = diffEditor.getModifiedEditor();
            const model = modifiedEditor.getModel();
            
            if (!model) {
                console.warn('LSP: No model available, cannot apply diagnostics');
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

            console.log(`LSP: Setting ${markers.length} markers on Monaco model`);
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
    }

    destroy() {
        console.log('LSP: Destroying LSP manager...');
        this.disconnect();
    }
}
