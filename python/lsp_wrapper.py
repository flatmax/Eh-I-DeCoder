"""
LSP Wrapper for managing multiple language servers
"""
import asyncio
import json
import os
import sys
from typing import Dict, Any, Optional

try:
    from .base_wrapper import BaseWrapper
    from .logger import Logger
    from .lsp_protocol import LSPProtocolHandler, LanguageServerProcess
except ImportError:
    from base_wrapper import BaseWrapper
    from logger import Logger
    from lsp_protocol import LSPProtocolHandler, LanguageServerProcess

class LSPWrapper(BaseWrapper):
    """Manages multiple language servers and routes requests"""
    
    def __init__(self):
        super().__init__()
        self.language_servers = {}
        self.client_capabilities = None
        self.protocol_handler = LSPProtocolHandler(self)
        self.initialized = False
        self.root_uri = None
        self.logger = Logger.get_logger('LSPWrapper')
        self._loop = None
        
    def _get_event_loop(self):
        """Get or create event loop"""
        if self._loop is None:
            try:
                self._loop = asyncio.get_running_loop()
            except RuntimeError:
                self._loop = asyncio.new_event_loop()
                asyncio.set_event_loop(self._loop)
        return self._loop
        
    def _run_async(self, coro):
        """Run async coroutine in sync context"""
        loop = self._get_event_loop()
        
        # If we're already in an async context, create a task
        try:
            # Check if there's a running loop
            asyncio.get_running_loop()
            # We're in an async context, so create a task and run it
            future = asyncio.ensure_future(coro)
            # Use run_until_complete on the current loop
            return loop.run_until_complete(future)
        except RuntimeError:
            # No running loop, we can use run_until_complete directly
            return loop.run_until_complete(coro)
        
    def initialize(self, root_uri, capabilities):
        """Initialize all language servers"""
        return self._run_async(self._initialize_async(root_uri, capabilities))
        
    async def _initialize_async(self, root_uri, capabilities):
        """Initialize all language servers (async implementation)"""
        self.logger.info(f"Initializing LSP with root_uri: {root_uri}")
        self.client_capabilities = capabilities
        self.root_uri = root_uri
        
        try:
            # Start language servers
            await self._start_js_server()
            await self._start_python_server()
            await self._start_cpp_server()
            
            self.initialized = True
            self.logger.info("All language servers initialized successfully")
            
            return {
                "capabilities": {
                    "textDocumentSync": 2,  # Incremental
                    "completionProvider": {
                        "resolveProvider": True,
                        "triggerCharacters": [".", ":", ">", '"', "'", "/", "@", "<"]
                    },
                    "hoverProvider": True,
                    "definitionProvider": True,
                    "referencesProvider": True,
                    "documentSymbolProvider": True,
                    "workspaceSymbolProvider": True,
                    "codeActionProvider": True,
                    "documentFormattingProvider": True,
                    "documentRangeFormattingProvider": True,
                    "renameProvider": True,
                    "foldingRangeProvider": True,
                    "executeCommandProvider": {
                        "commands": []
                    },
                    "workspace": {
                        "workspaceFolders": {
                            "supported": True
                        }
                    }
                }
            }
        except Exception as e:
            self.logger.error(f"Failed to initialize language servers: {e}")
            raise
            
    async def _start_js_server(self):
        """Start TypeScript/JavaScript language server"""
        try:
            # Check if typescript-language-server is available
            server = LanguageServerProcess(
                ['typescript-language-server', '--stdio'],
                'javascript'
            )
            await server.start()
            
            # Initialize the server
            init_params = {
                "processId": os.getpid(),
                "rootUri": self.root_uri,
                "capabilities": self.client_capabilities,
                "initializationOptions": {}
            }
            
            response = await server.send_request("initialize", init_params)
            if response:
                self.language_servers['javascript'] = server
                self.language_servers['typescript'] = server
                self.logger.info("JavaScript/TypeScript language server started")
                
                # Send initialized notification
                await server.send_notification("initialized", {})
        except Exception as e:
            self.logger.warning(f"Failed to start JavaScript language server: {e}")
            
    async def _start_python_server(self):
        """Start Python language server"""
        try:
            # Try pylsp first, then jedi-language-server
            commands = [
                ['pylsp'],
                ['jedi-language-server'],
                [sys.executable, '-m', 'pylsp']
            ]
            
            for cmd in commands:
                try:
                    server = LanguageServerProcess(cmd, 'python')
                    await server.start()
                    
                    # Initialize the server
                    init_params = {
                        "processId": os.getpid(),
                        "rootUri": self.root_uri,
                        "capabilities": self.client_capabilities,
                        "initializationOptions": {}
                    }
                    
                    response = await server.send_request("initialize", init_params)
                    if response:
                        self.language_servers['python'] = server
                        self.logger.info(f"Python language server started with {cmd[0]}")
                        
                        # Send initialized notification
                        await server.send_notification("initialized", {})
                        break
                except Exception:
                    continue
                    
        except Exception as e:
            self.logger.warning(f"Failed to start Python language server: {e}")
            
    async def _start_cpp_server(self):
        """Start C++ language server"""
        try:
            # Use clangd
            server = LanguageServerProcess(
                ['clangd', '--background-index'],
                'cpp'
            )
            await server.start()
            
            # Initialize the server
            init_params = {
                "processId": os.getpid(),
                "rootUri": self.root_uri,
                "capabilities": self.client_capabilities,
                "initializationOptions": {}
            }
            
            response = await server.send_request("initialize", init_params)
            if response:
                self.language_servers['cpp'] = server
                self.language_servers['c'] = server
                self.logger.info("C/C++ language server started")
                
                # Send initialized notification
                await server.send_notification("initialized", {})
        except Exception as e:
            self.logger.warning(f"Failed to start C++ language server: {e}")
            
    def get_server_for_language(self, language: str) -> Optional[LanguageServerProcess]:
        """Get the language server for a specific language"""
        return self.language_servers.get(language)
        
    def shutdown(self):
        """Shutdown all language servers"""
        return self._run_async(self._shutdown_async())
        
    async def _shutdown_async(self):
        """Shutdown all language servers (async implementation)"""
        self.logger.info("Shutting down language servers")
        
        for language, server in self.language_servers.items():
            try:
                await server.shutdown()
                self.logger.info(f"Shut down {language} language server")
            except Exception as e:
                self.logger.error(f"Error shutting down {language} server: {e}")
                
        self.language_servers.clear()
        self.initialized = False
        
    # LSP Protocol methods exposed via JRPC (synchronous wrappers)
    
    def completion(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle completion request"""
        self.logger.debug(f"[JRPC] completion request: {params}")
        result = self._run_async(self.protocol_handler.handle_request('textDocument/completion', params))
        self.logger.debug(f"[JRPC] completion result: {result}")
        return result
        
    def hover(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle hover request"""
        self.logger.debug(f"[JRPC] hover request: {params}")
        result = self._run_async(self.protocol_handler.handle_request('textDocument/hover', params))
        self.logger.debug(f"[JRPC] hover result: {result}")
        return result
        
    def definition(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle go to definition request"""
        self.logger.info(f"[JRPC] definition request: {params}")
        result = self._run_async(self.protocol_handler.handle_request('textDocument/definition', params))
        self.logger.info(f"[JRPC] definition result: {result}")
        return result
        
    def references(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle find references request"""
        self.logger.debug(f"[JRPC] references request: {params}")
        result = self._run_async(self.protocol_handler.handle_request('textDocument/references', params))
        self.logger.debug(f"[JRPC] references result: {result}")
        return result
        
    def document_symbol(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle document symbols request"""
        self.logger.debug(f"[JRPC] document_symbol request: {params}")
        result = self._run_async(self.protocol_handler.handle_request('textDocument/documentSymbol', params))
        self.logger.debug(f"[JRPC] document_symbol result: {result}")
        return result
        
    def formatting(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle document formatting request"""
        self.logger.debug(f"[JRPC] formatting request: {params}")
        result = self._run_async(self.protocol_handler.handle_request('textDocument/formatting', params))
        self.logger.debug(f"[JRPC] formatting result: {result}")
        return result
        
    def code_action(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle code action request"""
        self.logger.debug(f"[JRPC] code_action request: {params}")
        result = self._run_async(self.protocol_handler.handle_request('textDocument/codeAction', params))
        self.logger.debug(f"[JRPC] code_action result: {result}")
        return result
        
    def rename(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle rename request"""
        self.logger.debug(f"[JRPC] rename request: {params}")
        result = self._run_async(self.protocol_handler.handle_request('textDocument/rename', params))
        self.logger.debug(f"[JRPC] rename result: {result}")
        return result
        
    def did_open(self, params: Dict[str, Any]) -> None:
        """Handle document open notification"""
        self.logger.debug(f"[JRPC] did_open notification: {params}")
        self._run_async(self.protocol_handler.handle_notification('textDocument/didOpen', params))
        
    def did_change(self, params: Dict[str, Any]) -> None:
        """Handle document change notification"""
        self.logger.debug(f"[JRPC] did_change notification: {params}")
        self._run_async(self.protocol_handler.handle_notification('textDocument/didChange', params))
        
    def did_close(self, params: Dict[str, Any]) -> None:
        """Handle document close notification"""
        self.logger.debug(f"[JRPC] did_close notification: {params}")
        self._run_async(self.protocol_handler.handle_notification('textDocument/didClose', params))
        
    def did_save(self, params: Dict[str, Any]) -> None:
        """Handle document save notification"""
        self.logger.debug(f"[JRPC] did_save notification: {params}")
        self._run_async(self.protocol_handler.handle_notification('textDocument/didSave', params))
