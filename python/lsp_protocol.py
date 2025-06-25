"""
LSP Protocol handler for communication with language servers
"""
import asyncio
import json
import os
import subprocess
from typing import Dict, Any, Optional, List
try:
    from .logger import Logger
except ImportError:
    from logger import Logger

class LanguageServerProcess:
    """Manages a language server subprocess"""
    
    def __init__(self, command: List[str], language: str):
        self.command = command
        self.language = language
        self.process = None
        self.reader = None
        self.writer = None
        self.request_id = 0
        self.pending_requests = {}
        self.logger = Logger.get_logger(f'LSP-{language}')
        self._read_task = None
        
    async def start(self):
        """Start the language server process"""
        try:
            self.logger.info(f"Starting language server with command: {' '.join(self.command)}")
            
            self.process = await asyncio.create_subprocess_exec(
                *self.command,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            self.reader = self.process.stdout
            self.writer = self.process.stdin
            
            # Start reading responses
            self._read_task = asyncio.create_task(self._read_loop())
            
            self.logger.info(f"Started language server process (PID: {self.process.pid})")
        except Exception as e:
            self.logger.error(f"Failed to start language server: {e}")
            raise
            
    async def _read_loop(self):
        """Continuously read responses from the language server"""
        while self.process and self.process.returncode is None:
            try:
                # Read LSP header
                headers = {}
                while True:
                    line = await self.reader.readline()
                    if not line:
                        self.logger.warning("EOF received from language server")
                        return
                        
                    line = line.decode('utf-8').strip()
                    if not line:
                        break
                        
                    key, value = line.split(':', 1)
                    headers[key.strip()] = value.strip()
                    
                # Read content
                if 'Content-Length' in headers:
                    content_length = int(headers['Content-Length'])
                    content = await self.reader.read(content_length)
                    
                    if content:
                        try:
                            message = json.loads(content.decode('utf-8'))
                            self.logger.debug(f"Received message: {message.get('method', 'response')} (id: {message.get('id', 'N/A')})")
                            await self._handle_message(message)
                        except json.JSONDecodeError as e:
                            self.logger.error(f"Failed to parse JSON: {e}")
                            self.logger.error(f"Raw content: {content}")
                            
            except Exception as e:
                self.logger.error(f"Error in read loop: {e}")
                break
                
    async def _handle_message(self, message: Dict[str, Any]):
        """Handle a message from the language server"""
        if 'id' in message:
            # This is a response to a request
            request_id = message['id']
            if request_id in self.pending_requests:
                future = self.pending_requests.pop(request_id)
                if 'error' in message:
                    self.logger.error(f"LSP error response: {message['error']}")
                    future.set_exception(Exception(message['error']))
                else:
                    self.logger.debug(f"LSP response for request {request_id}: {message.get('result')}")
                    future.set_result(message.get('result'))
            else:
                self.logger.warning(f"Received response for unknown request ID: {request_id}")
        else:
            # This is a notification
            method = message.get('method', '')
            if method == 'textDocument/publishDiagnostics':
                # Handle diagnostics
                self.logger.debug(f"Received diagnostics: {message.get('params')}")
            elif method.startswith('$/'):
                # Server-specific notifications
                self.logger.debug(f"Received server notification: {method}")
            else:
                self.logger.info(f"Received notification: {method}")
                
    async def send_request(self, method: str, params: Dict[str, Any]) -> Any:
        """Send a request to the language server and wait for response"""
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method,
            "params": params
        }
        
        self.logger.info(f"Sending request {self.request_id}: {method}")
        self.logger.debug(f"Request params: {params}")
        
        future = asyncio.Future()
        self.pending_requests[self.request_id] = future
        
        await self._send_message(request)
        
        try:
            # Wait for response with timeout
            result = await asyncio.wait_for(future, timeout=10.0)
            self.logger.debug(f"Request {self.request_id} completed successfully")
            return result
        except asyncio.TimeoutError:
            self.logger.error(f"Request timeout for {method} (id: {self.request_id})")
            self.pending_requests.pop(self.request_id, None)
            raise
            
    async def send_notification(self, method: str, params: Dict[str, Any]):
        """Send a notification to the language server"""
        notification = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        }
        
        self.logger.debug(f"Sending notification: {method}")
        await self._send_message(notification)
        
    async def _send_message(self, message: Dict[str, Any]):
        """Send a message to the language server"""
        if not self.writer:
            raise Exception("Language server not started")
            
        content = json.dumps(message)
        content_bytes = content.encode('utf-8')
        
        header = f"Content-Length: {len(content_bytes)}\r\n\r\n"
        
        self.writer.write(header.encode('utf-8'))
        self.writer.write(content_bytes)
        await self.writer.drain()
        
        self.logger.debug(f"Sent message: {message.get('method', 'response')} (id: {message.get('id', 'N/A')})")
        
    async def shutdown(self):
        """Shutdown the language server"""
        if self.process:
            try:
                self.logger.info("Sending shutdown request")
                # Send shutdown request
                await self.send_request("shutdown", {})
                
                # Send exit notification
                await self.send_notification("exit", {})
                
                # Wait for process to exit
                await asyncio.wait_for(self.process.wait(), timeout=5.0)
                self.logger.info("Language server shut down gracefully")
            except Exception as e:
                self.logger.error(f"Error during shutdown: {e}")
                # Force kill if graceful shutdown fails
                self.process.kill()
                self.logger.warning("Force killed language server")
                
            if self._read_task:
                self._read_task.cancel()
                
            self.process = None
            self.reader = None
            self.writer = None


class LSPProtocolHandler:
    """Handles LSP protocol translation between Monaco and language servers"""
    
    def __init__(self, lsp_wrapper):
        self.lsp_wrapper = lsp_wrapper
        self.logger = Logger.get_logger('LSPProtocolHandler')
        self.open_documents = {}  # Track open documents
        
    def _get_language_from_uri(self, uri: str) -> str:
        """Determine language from file URI"""
        if uri.startswith('file://'):
            path = uri[7:]
        else:
            path = uri
            
        ext = os.path.splitext(path)[1].lower()
        
        # Map file extensions to language IDs
        ext_map = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.c': 'c',
            '.cpp': 'cpp',
            '.cc': 'cpp',
            '.cxx': 'cpp',
            '.h': 'c',
            '.hpp': 'cpp',
            '.hxx': 'cpp'
        }
        
        language = ext_map.get(ext, 'plaintext')
        self.logger.debug(f"Determined language '{language}' for URI: {uri}")
        return language
        
    async def handle_request(self, method: str, params: Dict[str, Any]) -> Any:
        """Route LSP requests to appropriate language server"""
        self.logger.info(f"Handling request: {method}")
        self.logger.debug(f"Request params: {params}")
        
        # Get language from document URI
        doc_uri = params.get('textDocument', {}).get('uri', '')
        language = self._get_language_from_uri(doc_uri)
        
        # Log specific details for definition requests
        if method == 'textDocument/definition':
            self.logger.info(f"Definition request for {doc_uri} at position {params.get('position')}")
        
        server = self.lsp_wrapper.get_server_for_language(language)
        if not server:
            self.logger.warning(f"No language server available for {language}")
            return None
            
        try:
            # Send request to language server
            result = await server.send_request(method, params)
            
            # Log definition results
            if method == 'textDocument/definition' and result:
                self.logger.info(f"Definition result: {result}")
            
            self.logger.debug(f"Request {method} completed successfully")
            return result
        except Exception as e:
            self.logger.error(f"Error handling {method}: {e}")
            return None
            
    async def handle_notification(self, method: str, params: Dict[str, Any]):
        """Route LSP notifications to appropriate language server"""
        self.logger.debug(f"Handling notification: {method}")
        
        # Get language from document URI
        doc_uri = params.get('textDocument', {}).get('uri', '')
        language = self._get_language_from_uri(doc_uri)
        
        # Track document state
        if method == 'textDocument/didOpen':
            self.open_documents[doc_uri] = {
                'language': language,
                'version': params.get('textDocument', {}).get('version', 0)
            }
            self.logger.info(f"Document opened: {doc_uri} (language: {language})")
        elif method == 'textDocument/didClose':
            self.open_documents.pop(doc_uri, None)
            self.logger.info(f"Document closed: {doc_uri}")
        elif method == 'textDocument/didChange':
            if doc_uri in self.open_documents:
                self.open_documents[doc_uri]['version'] = params.get('textDocument', {}).get('version', 0)
                self.logger.debug(f"Document changed: {doc_uri} (version: {self.open_documents[doc_uri]['version']})")
                
        # Send to all relevant language servers for some notifications
        if method in ['textDocument/didOpen', 'textDocument/didClose', 'textDocument/didChange', 'textDocument/didSave']:
            server = self.lsp_wrapper.get_server_for_language(language)
            if server:
                try:
                    await server.send_notification(method, params)
                    self.logger.debug(f"Notification {method} sent successfully")
                except Exception as e:
                    self.logger.error(f"Error sending notification {method}: {e}")
