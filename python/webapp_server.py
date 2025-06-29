#!/usr/bin/env python3
"""
webapp_server.py - Utilities for managing the webapp development server
"""
import os
import webbrowser

try:
    from .process_manager import WebappProcessManager
except ImportError:
    from process_manager import WebappProcessManager

webapp_manager = None

def start_npm_dev_server(webapp_port=9876):
    """Start npm dev server if not already running"""
    global webapp_manager
    
    # Find webapp directory
    webapp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'webapp')
    
    webapp_manager = WebappProcessManager(webapp_dir, webapp_port)
    return webapp_manager.start_dev_server()

def open_browser(webapp_port=9876, aider_port=8999, lsp_port=None):
    """Open the webapp in the default browser with the aider port and optional LSP port as parameters"""
    url = f"http://localhost:{webapp_port}/?port={aider_port}"
    if lsp_port:
        url += f"&lsp={lsp_port}"
    
    print(f"Opening browser to {url}")
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"Failed to open browser: {e}")
        print(f"Please manually open: {url}")

def cleanup_npm_process():
    """Clean up the npm process"""
    global webapp_manager
    if webapp_manager:
        webapp_manager.cleanup()
        webapp_manager = None
