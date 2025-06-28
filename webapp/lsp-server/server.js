#!/usr/bin/env node

const WebSocket = require('ws');
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

class LSPServer {
    constructor() {
        this.port = null;
        this.server = null;
        this.languageServerPromises = new Map();
        this.documents = new Map();
        this.clients = new Set();
        this.workspaceRoot = process.cwd();
        this.messageId = 1;
        
        // Language server configurations
        this.languageConfigs = {
            python: {
                command: 'pylsp',
                args: [],
                extensions: ['.py'],
                languageId: 'python'
            },
            typescript: {
                command: 'typescript-language-server',
                args: ['--stdio'],
                extensions: ['.ts', '.tsx', '.js', '.jsx'],
                languageId: 'typescript'
            },
            cpp: {
                command: 'clangd',
                args: ['--background-index', '--clang-tidy'],
                extensions: ['.cpp', '.cxx', '.cc', '.c', '.hpp', '.hxx', '.h'],
                languageId: 'cpp'
            }
        };
    }

    async findAvailablePort(startPort = 9000) {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.listen(startPort, (err) => {
                if (err) {
                    server.listen(0, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            const port = server.address().port;
                            server.close(() => resolve(port));
                        }
                    });
                } else {
                    const port = server.address().port;
                    server.close(() => resolve(port));
                }
            });
        });
    }

    async start() {
        try {
            // Use LSP_PORT from environment if available, otherwise find one
            if (process.env.LSP_PORT) {
                this.port = parseInt(process.env.LSP_PORT, 10);
                console.log(`Using LSP_PORT from environment: ${this.port}`);
            } else {
                this.port = await this.findAvailablePort(9000);
            }
            
            // Set workspace root from command line args or environment
            if (process.argv.length > 2) {
                this.workspaceRoot = process.argv[2];
            } else if (process.env.WORKSPACE_ROOT) {
                this.workspaceRoot = process.env.WORKSPACE_ROOT;
            }

            console.log(`LSP Server starting on port ${this.port}`);
            console.log(`Workspace root: ${this.workspaceRoot}`);

            // Test language server availability
            await this.testLanguageServers();

            // Create WebSocket server
            this.server = new WebSocket.Server({ port: this.port });

            this.server.on('connection', (ws, req) => {
                const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                console.log(`LSP Client connected: ${clientId}`);
                this.clients.add(ws);
                ws.clientId = clientId;

                ws.on('message', async (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        await this.handleMessage(ws, message);
                    } catch (error) {
                        console.error(`LSP Server [${clientId}]: Error handling message:`, error);
                        this.sendError(ws, error.message);
                    }
                });

                ws.on('close', (code, reason) => {
                    console.log(`LSP Client disconnected: ${clientId}, code: ${code}`);
                    this.clients.delete(ws);
                });

                ws.on('error', (error) => {
                    console.error(`LSP WebSocket error [${clientId}]:`, error);
                    this.clients.delete(ws);
                });

                // Send a ping to keep connection alive
                const pingInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.ping();
                    } else {
                        clearInterval(pingInterval);
                    }
                }, 30000); // Ping every 30 seconds

                ws.on('close', () => {
                    clearInterval(pingInterval);
                });
            });

            console.log(`LSP Server running on port ${this.port}`);
            
            // Output port for parent process to capture
            if (process.send) {
                process.send({ type: 'port', port: this.port });
            }

        } catch (error) {
            console.error('Failed to start LSP server:', error);
            process.exit(1);
        }
    }

    async testLanguageServers() {
        console.log('Testing language server availability...');
        
        for (const [langKey, config] of Object.entries(this.languageConfigs)) {
            try {
                // Test if the command exists
                const testProcess = spawn(config.command, ['--help'], {
                    stdio: ['ignore', 'ignore', 'ignore'],
                    timeout: 5000
                });
                
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        testProcess.kill();
                        reject(new Error('Timeout'));
                    }, 5000);
                    
                    testProcess.on('exit', (code) => {
                        clearTimeout(timeout);
                        resolve(code);
                    });
                    
                    testProcess.on('error', (error) => {
                        clearTimeout(timeout);
                        reject(error);
                    });
                });
                
                console.log(`✓ ${langKey} language server available`);
                
            } catch (error) {
                console.log(`✗ ${langKey} language server NOT available`);
            }
        }
    }

    _normalizeUri(uri) {
        // A valid file URI for an absolute path starts with file:///
        // A URI for a relative path might be sent as file://path/to/file
        if (uri && uri.startsWith('file://') && !uri.startsWith('file:///')) {
            const relativePath = uri.substring('file://'.length);
            const absolutePath = path.resolve(this.workspaceRoot, relativePath);
            // For Windows, paths can have backslashes, which need to be encoded or converted.
            // The 'new URL()' approach handles this correctly.
            const fileUrl = new URL(`file://${absolutePath}`);
            return fileUrl.href;
        }
        return uri;
    }

    async handleMessage(ws, message) {
        const clientId = ws.clientId || 'unknown';
        
        // Normalize URI before handling
        if (message.params && message.params.textDocument && message.params.textDocument.uri) {
            message.params.textDocument.uri = this._normalizeUri(message.params.textDocument.uri);
        }

        const { method, params, id } = message;

        switch (method) {
            case 'initialize':
                await this.handleInitialize(ws, params, id);
                break;
            case 'initialized':
                await this.handleInitialized(ws, params);
                break;
            case 'textDocument/didOpen':
                await this.handleDidOpenTextDocument(ws, params);
                break;
            case 'textDocument/didChange':
                await this.handleDidChangeTextDocument(ws, params);
                break;
            case 'textDocument/didClose':
                await this.handleDidCloseTextDocument(ws, params);
                break;
            case 'textDocument/completion':
                await this.handleCompletion(ws, params, id);
                break;
            case 'textDocument/hover':
                await this.handleHover(ws, params, id);
                break;
            case 'textDocument/definition':
                await this.handleDefinition(ws, params, id);
                break;
            default:
                if (id) {
                    this.sendMethodNotFound(ws, id);
                }
        }
    }

    async handleInitialize(ws, params, id) {
        const clientId = ws.clientId || 'unknown';
        
        const response = {
            jsonrpc: '2.0',
            id: id,
            result: {
                capabilities: {
                    textDocumentSync: 1,
                    diagnosticProvider: true,
                    completionProvider: {
                        triggerCharacters: ['.', ':', '>', '<']
                    },
                    hoverProvider: true,
                    definitionProvider: true,
                    documentSymbolProvider: true,
                    workspaceSymbolProvider: true
                }
            }
        };

        try {
            ws.send(JSON.stringify(response));
        } catch (error) {
            console.error(`LSP Server [${clientId}]: Error sending initialize response:`, error);
        }
    }

    async handleInitialized(ws, params) {
        const clientId = ws.clientId || 'unknown';
        console.log(`LSP Server [${clientId}]: Client initialized`);
        
        // Mark this connection as fully initialized
        ws.isInitialized = true;
    }

    async handleDidOpenTextDocument(ws, params) {
        const clientId = ws.clientId || 'unknown';
        const { textDocument } = params;
        const { uri, languageId, text } = textDocument;

        console.log(`LSP Server [${clientId}]: Opening document: ${path.basename(uri)} (${languageId})`);
        this.documents.set(uri, { uri, languageId, text, version: 1 });

        const languageServer = await this.getLanguageServerForDocument(textDocument);
        if (languageServer) {
            this.forwardToLanguageServer(languageServer, 'textDocument/didOpen', params);
        }
    }

    async handleDidChangeTextDocument(ws, params) {
        const { textDocument, contentChanges } = params;
        const { uri } = textDocument;

        const document = this.documents.get(uri);
        if (document) {
            document.version = textDocument.version;
            if (contentChanges.length > 0) {
                document.text = contentChanges[0].text;
            }

            const languageServer = await this.getLanguageServerForUri(uri);
            if (languageServer) {
                this.forwardToLanguageServer(languageServer, 'textDocument/didChange', params);
            }
        }
    }

    async handleDidCloseTextDocument(ws, params) {
        const { textDocument } = params;
        const { uri } = textDocument;

        this.documents.delete(uri);

        const languageServer = await this.getLanguageServerForUri(uri);
        if (languageServer) {
            this.forwardToLanguageServer(languageServer, 'textDocument/didClose', params);
        }
    }

    async handleCompletion(ws, params, id) {
        const { textDocument } = params;
        
        const languageServer = await this.getLanguageServerForUri(textDocument.uri);
        
        if (languageServer) {
            this.forwardRequestToLanguageServer(languageServer, 'textDocument/completion', params, id, ws);
        } else {
            this.sendResponse(ws, id, { items: [] });
        }
    }

    async handleHover(ws, params, id) {
        const { textDocument } = params;
        
        const languageServer = await this.getLanguageServerForUri(textDocument.uri);
        
        if (languageServer) {
            this.forwardRequestToLanguageServer(languageServer, 'textDocument/hover', params, id, ws);
        } else {
            this.sendResponse(ws, id, null);
        }
    }

    async handleDefinition(ws, params, id) {
        const { textDocument } = params;
        
        const languageServer = await this.getLanguageServerForUri(textDocument.uri);
        
        if (languageServer) {
            this.forwardRequestToLanguageServer(languageServer, 'textDocument/definition', params, id, ws);
        } else {
            this.sendResponse(ws, id, []);
        }
    }

    async getLanguageServerForDocument(textDocument) {
        const { uri, languageId } = textDocument;
        return this.getLanguageServerForUri(uri, languageId);
    }

    async getLanguageServerForUri(uri, languageId = null) {
        const filePath = uri.replace('file://', '');
        const ext = path.extname(filePath).toLowerCase();

        let langConfig = null;
        let langKey = null;

        for (const [key, config] of Object.entries(this.languageConfigs)) {
            if (config.extensions.includes(ext) || (languageId && config.languageId === languageId)) {
                langConfig = config;
                langKey = key;
                break;
            }
        }

        if (!langConfig) {
            return null;
        }

        if (!this.languageServerPromises.has(langKey)) {
            console.log(`Starting ${langKey} language server`);
            const serverPromise = this.startLanguageServer(langKey, langConfig);
            this.languageServerPromises.set(langKey, serverPromise);
        }

        // Wait for the server to be fully initialized
        try {
            const server = await this.languageServerPromises.get(langKey);
            return server;
        } catch (error) {
            console.error(`Failed to get language server for ${langKey}:`, error);
            this.languageServerPromises.delete(langKey);
            return null;
        }
    }

    async startLanguageServer(langKey, config) {
        return new Promise((resolve, reject) => {
            try {
                const server = spawn(config.command, config.args, {
                    cwd: this.workspaceRoot,
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                // Store promise handlers on the server process object
                server.initResolve = resolve;
                server.initReject = reject;
                server.isInitializing = true;

                server.stderr.on('data', (data) => {
                    // Only log errors, not all stderr output
                    const output = data.toString();
                    if (output.toLowerCase().includes('error')) {
                        console.error(`${langKey} LSP error:`, output.trim());
                    }
                });

                server.on('error', (error) => {
                    console.error(`Failed to start ${langKey} language server:`, error.message);
                    this.languageServerPromises.delete(langKey);
                    if (server.isInitializing && server.initReject) {
                        server.initReject(error);
                    }
                });

                server.on('exit', (code, signal) => {
                    console.log(`${langKey} language server exited with code ${code}`);
                    this.languageServerPromises.delete(langKey);
                    if (server.isInitializing && server.initReject) {
                        server.initReject(new Error(`Language server exited with code ${code}`));
                    }
                });

                // Initialize the language server
                const initializeParams = {
                    processId: process.pid,
                    rootUri: `file://${this.workspaceRoot}`,
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
                                versionSupport: false,
                                codeDescriptionSupport: false,
                                dataSupport: false
                            }
                        }
                    }
                };

                const initMessage = {
                    jsonrpc: '2.0',
                    id: this.messageId++,
                    method: 'initialize',
                    params: initializeParams
                };

                // Store the init request ID to identify the response
                server.initRequestId = initMessage.id;

                server.stdin.write(this.createLSPMessage(JSON.stringify(initMessage)));

                // Set up response handling
                server.pendingRequests = new Map();
                server.outputBuffer = '';

                server.stdout.on('data', (data) => {
                    server.outputBuffer += data.toString();
                    this.processLanguageServerOutput(langKey, server);
                });

            } catch (error) {
                console.error(`Error starting ${langKey} language server:`, error.message);
                this.languageServerPromises.delete(langKey);
                reject(error);
            }
        });
    }

    createLSPMessage(content) {
        return `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`;
    }

    processLanguageServerOutput(langKey, server) {
        while (true) {
            const headerEnd = server.outputBuffer.indexOf('\r\n\r\n');
            if (headerEnd === -1) break;

            const headers = server.outputBuffer.substring(0, headerEnd);
            const contentLengthMatch = headers.match(/Content-Length: (\d+)/);
            
            if (!contentLengthMatch) {
                server.outputBuffer = server.outputBuffer.substring(headerEnd + 4);
                continue;
            }

            const contentLength = parseInt(contentLengthMatch[1]);
            const messageStart = headerEnd + 4;
            
            if (server.outputBuffer.length < messageStart + contentLength) {
                break; // Wait for more data
            }

            const messageContent = server.outputBuffer.substring(messageStart, messageStart + contentLength);
            server.outputBuffer = server.outputBuffer.substring(messageStart + contentLength);

            try {
                const message = JSON.parse(messageContent);
                this.handleLanguageServerMessage(langKey, server, message);
            } catch (error) {
                console.error(`Error parsing LSP message from ${langKey}:`, error);
            }
        }
    }

    handleLanguageServerMessage(langKey, server, message) {
        // Check if this is the response to our initialization request
        if (message.id === server.initRequestId && server.isInitializing) {
            if (message.error) {
                console.error(`${langKey} language server initialization failed:`, message.error);
                if (server.initReject) {
                    server.initReject(new Error(message.error.message));
                }
            } else {
                console.log(`${langKey} language server initialized`);
                
                // Send initialized notification
                const initializedMessage = {
                    jsonrpc: '2.0',
                    method: 'initialized',
                    params: {}
                };
                
                server.stdin.write(this.createLSPMessage(JSON.stringify(initializedMessage)));
                
                // Initialization is successful, resolve the promise with the server process.
                if (server.initResolve) {
                    server.initResolve(server);
                }
            }
            
            // Clean up initialization state
            server.isInitializing = false;
            delete server.initRequestId;
            delete server.initResolve;
            delete server.initReject;
            return;
        }

        if (message.method === 'textDocument/publishDiagnostics') {
            this.broadcastToClients(message);
        } else if (message.id && server.pendingRequests && server.pendingRequests.has(message.id)) {
            // Handle response to a request
            const { ws, originalId } = server.pendingRequests.get(message.id);
            server.pendingRequests.delete(message.id);
            
            const response = {
                jsonrpc: '2.0',
                id: originalId,
                result: message.result,
                error: message.error
            };
            
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(response));
            }
        }
    }

    forwardToLanguageServer(server, method, params) {
        if (server && server.stdin && !server.stdin.destroyed) {
            const message = {
                jsonrpc: '2.0',
                method: method,
                params: params
            };

            try {
                server.stdin.write(this.createLSPMessage(JSON.stringify(message)));
            } catch (error) {
                console.error('Error forwarding to language server:', error);
            }
        }
    }

    forwardRequestToLanguageServer(server, method, params, originalId, ws) {
        if (server && server.stdin && !server.stdin.destroyed) {
            const requestId = this.messageId++;
            const message = {
                jsonrpc: '2.0',
                id: requestId,
                method: method,
                params: params
            };

            // Track the request for response handling
            if (!server.pendingRequests) {
                server.pendingRequests = new Map();
            }
            server.pendingRequests.set(requestId, { ws, originalId });

            try {
                server.stdin.write(this.createLSPMessage(JSON.stringify(message)));
            } catch (error) {
                console.error('Error forwarding request to language server:', error);
                this.sendError(ws, 'Language server communication error');
            }
        }
    }

    broadcastToClients(message) {
        const messageStr = JSON.stringify(message);
        
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(messageStr);
                } catch (error) {
                    console.error(`Error broadcasting to client [${client.clientId}]:`, error);
                    this.clients.delete(client);
                }
            }
        }
    }

    sendResponse(ws, id, result) {
        const response = {
            jsonrpc: '2.0',
            id: id,
            result: result
        };
        
        try {
            ws.send(JSON.stringify(response));
        } catch (error) {
            console.error(`LSP Server [${ws.clientId}]: Error sending response:`, error);
        }
    }

    sendError(ws, message, id = null) {
        const error = {
            jsonrpc: '2.0',
            id: id,
            error: {
                code: -1,
                message: message
            }
        };

        try {
            ws.send(JSON.stringify(error));
        } catch (error) {
            console.error(`LSP Server [${ws.clientId}]: Error sending error message:`, error);
        }
    }

    sendMethodNotFound(ws, id) {
        const error = {
            jsonrpc: '2.0',
            id: id,
            error: {
                code: -32601,
                message: 'Method not found'
            }
        };

        try {
            ws.send(JSON.stringify(error));
        } catch (error) {
            console.error(`LSP Server [${ws.clientId}]: Error sending method not found:`, error);
        }
    }

    async stop() {
        console.log('Stopping LSP server...');

        for (const [key, serverPromise] of this.languageServerPromises) {
            try {
                const server = await Promise.race([
                    serverPromise,
                    new Promise(resolve => setTimeout(() => resolve(null), 1000))
                ]);

                if (server && typeof server.kill === 'function') {
                    console.log(`Stopping ${key} language server...`);
                    server.kill();
                }
            } catch (error) {
                console.error(`Error stopping ${key} language server:`, error);
            }
        }

        if (this.server) {
            console.log('Closing WebSocket server...');
            this.server.close();
        }
    }
}

const lspServer = new LSPServer();

process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down...');
    await lspServer.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down...');
    await lspServer.stop();
    process.exit(0);
});

lspServer.start().catch((error) => {
    console.error('Failed to start LSP server:', error);
    process.exit(1);
});
