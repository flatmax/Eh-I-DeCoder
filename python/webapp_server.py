#!/usr/bin/env python3
"""
webapp_server.py - Utilities for managing the webapp development server
"""
import webbrowser

try:
    from .process_manager import WebappProcessManager
    from .server_config import ServerConfig
    from .exceptions import ProcessError, WebappError, create_error_response
except ImportError:
    from process_manager import WebappProcessManager
    from server_config import ServerConfig
    from exceptions import ProcessError, WebappError, create_error_response

webapp_manager = None

def start_npm_dev_server(config: ServerConfig):
    """Start npm dev server using configuration"""
    global webapp_manager
    
    try:
        webapp_config = config.get_webapp_config()
        webapp_manager = WebappProcessManager(
            webapp_config['webapp_dir'], 
            webapp_config['port']
        )
        
        success = webapp_manager.start_dev_server()
        if success:
            config.update_actual_ports(webapp_port=webapp_config['port'])
        
        return success
    except ProcessError as e:
        # Log the error but don't convert to dict since this is internal
        raise WebappError(f"Failed to start webapp dev server: {e}")
    except Exception as e:
        # Log the error but don't convert to dict since this is internal
        raise WebappError(f"Unexpected error starting webapp dev server: {e}")

def open_browser(config: ServerConfig):
    """Open the webapp in the default browser using configuration"""
    try:
        if not config.should_open_browser():
            return
        
        url = config.get_browser_url()
        
        try:
            webbrowser.open(url)
        except Exception as e:
            print(f"Failed to open browser: {e}")
            print(f"Please manually open: {url}")
    except Exception as e:
        # Log the error but don't convert to dict since this is internal
        raise WebappError(f"Error opening browser: {e}")

def cleanup_npm_process():
    """Clean up the npm process"""
    global webapp_manager
    if webapp_manager:
        try:
            webapp_manager.cleanup()
        except Exception as e:
            # Log but don't raise during cleanup
            print(f"Error during webapp cleanup: {e}")
        finally:
            webapp_manager = None
