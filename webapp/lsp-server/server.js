#!/usr/bin/env node

const WebSocket = require('ws');
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

class LSPServer {
    constructor() {
        this.port = null;
        this.server = null;
        this.languageServers = new Map();
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
            // Find available port
            this.port = await this.findAvailablePort(9000);
            
            // Set workspace root from command line args or environment
            if (process.argv.length > 2) {
                this.workspaceRoot = process.argv[2];
            } else if (process.env.WORKSPACE_ROOT) {
                this.workspaceRoot = process.env.WORKSPACE_ROOT;
            }

            console.log(`LSP Server starting on port ${this.port}`);
            console.log(`Workspace root: ${this.workspaceRoot}`);

            // Create WebSocket server
            this.server = new WebSocket.Server({ port: this.port });

            this.server.on('connection', (ws) => {
                console.log('LSP Client connected');
                this.clients.add(ws);

                ws.on('message', async (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        await this.handleMessage(ws, message);
                    } catch (error) {
                        console.error('Error handling message:', error);
                        this.sendError(ws, error.message);
                    }
                });

                ws.on('close', () => {
                    console.log('LSP Client disconnected');
                    this.clients.delete(ws);
                });

                ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    this.clients.delete(ws);
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

    async handleMessage(ws, message) {
        const { method, params, id } = message;

        switch (method) {
            case 'initialize':
                await this.handleInitialize(ws, params, id);
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
                console.log(`Unhandled method: ${method}`);
                if (id) {
                    this.sendMethodNotFound(ws, id);
                }
        }
    }

    async handleInitialize(ws, params, id) {
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

        ws.send(JSON.stringify(response));
        
        ws.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialized',
            params: {}
        }));
    }

    async handleDidOpenTextDocument(ws, params) {
        const { textDocument } = params;
        const { uri, languageId, text } = textDocument;

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

        if (!this.languageServers.has(langKey)) {
            const server = await this.startLanguageServer(langKey, langConfig);
            if (server) {
                this.languageServers.set(langKey, server);
            }
        }

        return this.languageServers.get(langKey);
    }

    async startLanguageServer(langKey, config) {
        try {
            console.log(`Starting ${langKey} language server: ${config.command}`);

            const server = spawn(config.command, config.args, {
                cwd: this.workspaceRoot,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            server.stderr.on('data', (data) => {
                console.error(`${langKey} LSP stderr:`, data.toString());
            });

            server.on('error', (error) => {
                console.error(`Failed to start ${langKey} language server:`, error.message);
            });

            server.on('exit', (code) => {
                console.log(`${langKey} language server exited with code ${code}`);
                this.languageServers.delete(langKey);
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

            server.stdin.write(this.createLSPMessage(JSON.stringify(initMessage)));

            // Set up response handling
            server.pendingRequests = new Map();
            server.outputBuffer = '';

            server.stdout.on('data', (data) => {
                server.outputBuffer += data.toString();
                this.processLanguageServerOutput(langKey, server);
            });

            return server;

        } catch (error) {
            console.error(`Error starting ${langKey} language server:`, error.message);
            return null;
        }
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
                    console.error('Error broadcasting to client:', error);
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
        ws.send(JSON.stringify(response));
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

        ws.send(JSON.stringify(error));
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

        ws.send(JSON.stringify(error));
    }

    async stop() {
        console.log('Stopping LSP server...');

        for (const [key, server] of this.languageServers) {
            try {
                server.kill();
            } catch (error) {
                console.error(`Error stopping ${key} language server:`, error);
            }
        }

        if (this.server) {
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
