#!/usr/bin/env python3
"""
webapp_server.py - Utilities for managing the webapp development server
"""
import webbrowser

try:
    from .process_manager import WebappProcessManager
    from .server_config import ServerConfig
except ImportError:
    from process_manager import WebappProcessManager
    from server_config import ServerConfig

webapp_manager = None

def start_npm_dev_server(config: ServerConfig):
    """Start npm dev server using configuration"""
    global webapp_manager
    
    webapp_config = config.get_webapp_config()
    webapp_manager = WebappProcessManager(
        webapp_config['webapp_dir'], 
        webapp_config['port']
    )
    
    success = webapp_manager.start_dev_server()
    if success:
        config.update_actual_ports(webapp_port=webapp_config['port'])
    
    return success

def open_browser(config: ServerConfig):
    """Open the webapp in the default browser using configuration"""
    if not config.should_open_browser():
        return
    
    url = config.get_browser_url()
    
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
