#!/usr/bin/env python3
"""
lsp_server.py - Utilities for managing the LSP server
"""

try:
    from .process_manager import LSPProcessManager
    from .port_utils import find_available_port
    from .server_config import ServerConfig
except ImportError:
    from process_manager import LSPProcessManager
    from port_utils import find_available_port
    from server_config import ServerConfig

lsp_manager = None

def start_lsp_server(config: ServerConfig, repo=None):
    """Start the LSP server using configuration and return its port"""
    global lsp_manager
    
    if not config.is_lsp_enabled():
        print("LSP Python: LSP server disabled by configuration")
        return None
    
    print("LSP Python: Starting LSP server...")
    
    lsp_config = config.get_lsp_config()
    lsp_port = lsp_config['port']
    
    # Use the port from config (which should already be allocated)
    if lsp_port is None:
        print("LSP Python: Error - no LSP port allocated")
        return None
    
    # Get workspace root from repo if available
    workspace_root = lsp_config['workspace_root']  # fallback to config default
    if repo:
        try:
            repo_root = repo.get_repo_root()
            if isinstance(repo_root, str):  # Success case
                workspace_root = repo_root
                print(f"LSP Python: Using repository root as workspace: {workspace_root}")
            else:
                print(f"LSP Python: Could not get repo root, using config default: {workspace_root}")
        except Exception as e:
            print(f"LSP Python: Error getting repo root, using config default: {e}")
    
    print(f"LSP Python: Using allocated port {lsp_port}")
    print(f"LSP Python: Looking for webapp directory at: {lsp_config['webapp_dir']}")
    print(f"LSP Python: Using workspace root: {workspace_root}")
    
    lsp_manager = LSPProcessManager(
        lsp_config['webapp_dir'], 
        lsp_port, 
        workspace_root
    )
    
    actual_port = lsp_manager.start_lsp_server()
    if actual_port:
        config.update_actual_ports(lsp_port=actual_port)
    
    return actual_port

def cleanup_lsp_process():
    """Clean up the LSP process"""
    global lsp_manager
    if lsp_manager:
        lsp_manager.cleanup()
        lsp_manager = None
