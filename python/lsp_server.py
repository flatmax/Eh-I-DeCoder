#!/usr/bin/env python3
"""
lsp_server.py - Utilities for managing the LSP server
"""

try:
    from .process_manager import LSPProcessManager
    from .port_utils import find_available_port
    from .server_config import ServerConfig
    from .exceptions import ProcessError, LSPError, create_error_response
except ImportError:
    from process_manager import LSPProcessManager
    from port_utils import find_available_port
    from server_config import ServerConfig
    from exceptions import ProcessError, LSPError, create_error_response

lsp_manager = None

def start_lsp_server(config: ServerConfig, repo=None):
    """Start the LSP server using configuration and return its port"""
    global lsp_manager
    
    try:
        if not config.is_lsp_enabled():
            return None
        
        lsp_config = config.get_lsp_config()
        lsp_port = lsp_config['port']
        
        # Use the port from config (which should already be allocated)
        if lsp_port is None:
            raise LSPError("No LSP port allocated")
        
        # Get workspace root from repo if available
        workspace_root = lsp_config['workspace_root']  # fallback to config default
        if repo:
            try:
                repo_root = repo.get_repo_root()
                if isinstance(repo_root, str):  # Success case
                    workspace_root = repo_root
                elif isinstance(repo_root, dict) and 'error' in repo_root:
                    # Handle error response from repo
                    print(f"LSP Python: Error getting repo root: {repo_root['error']}")
            except Exception as e:
                print(f"LSP Python: Error getting repo root: {e}")
        
        lsp_manager = LSPProcessManager(
            lsp_config['webapp_dir'], 
            lsp_port, 
            workspace_root
        )
        
        actual_port = lsp_manager.start_lsp_server()
        if actual_port:
            config.update_actual_ports(lsp_port=actual_port)
        
        return actual_port
        
    except ProcessError as e:
        # LSP is optional, so we don't raise but return None
        print(f"LSP server failed to start: {e}")
        return None
    except Exception as e:
        # LSP is optional, so we don't raise but return None
        print(f"Unexpected error starting LSP server: {e}")
        return None

def cleanup_lsp_process():
    """Clean up the LSP process"""
    global lsp_manager
    if lsp_manager:
        try:
            lsp_manager.cleanup()
        except Exception as e:
            # Log but don't raise during cleanup
            print(f"Error during LSP cleanup: {e}")
        finally:
            lsp_manager = None
