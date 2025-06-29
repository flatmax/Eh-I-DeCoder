#!/usr/bin/env python3
"""
lsp_server.py - Utilities for managing the LSP server
"""
import os

try:
    from .process_manager import LSPProcessManager
    from .port_utils import find_available_port
except ImportError:
    from process_manager import LSPProcessManager
    from port_utils import find_available_port

lsp_manager = None

def start_lsp_server(lsp_port=None):
    """Start the LSP server using npm run and return its port"""
    global lsp_manager
    
    print("LSP Python: Starting LSP server...")
    
    # Find an available port if none specified
    if lsp_port is None:
        try:
            lsp_port = find_available_port(9000)
            print(f"LSP Python: Auto-selected port {lsp_port}")
        except RuntimeError as e:
            print(f"LSP Python: Error finding available port for LSP server: {e}")
            return None
    else:
        print(f"LSP Python: Using specified port {lsp_port}")
    
    # Find webapp directory
    webapp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'webapp')
    print(f"LSP Python: Looking for webapp directory at: {webapp_dir}")
    
    # Set workspace root to the repository root (parent of python directory)
    # This ensures the LSP server uses the correct base path
    repo_root = os.path.dirname(os.path.dirname(__file__))
    
    lsp_manager = LSPProcessManager(webapp_dir, lsp_port, repo_root)
    return lsp_manager.start_lsp_server()

def cleanup_lsp_process():
    """Clean up the LSP process"""
    global lsp_manager
    if lsp_manager:
        lsp_manager.cleanup()
        lsp_manager = None
