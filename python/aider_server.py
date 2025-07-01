#!/usr/bin/env python3
"""
aider_server.py - JSON-RPC server for the Aider AI coding assistant
"""
import asyncio
import signal
import sys
import os
import threading
import atexit
from asyncio import Event
from jrpc_oo import JRPCServer

try:
    from .io_wrapper import IOWrapper
    from .coder_wrapper import CoderWrapper
    from .repo import Repo
    from .chat_history import ChatHistory
    from .webapp_server import start_npm_dev_server, open_browser, cleanup_npm_process
    from .lsp_server import start_lsp_server, cleanup_lsp_process
    from .port_utils import find_available_port
    from .server_config import ServerConfig
except ImportError:
    from io_wrapper import IOWrapper
    from coder_wrapper import CoderWrapper
    from repo import Repo
    from chat_history import ChatHistory
    from webapp_server import start_npm_dev_server, open_browser, cleanup_npm_process
    from lsp_server import start_lsp_server, cleanup_lsp_process
    from port_utils import find_available_port
    from server_config import ServerConfig

# Apply the monkey patch before importing aider modules
CoderWrapper.apply_coder_create_patch()

from aider.main import main

shutdown_event = None
jrpc_server = None
aider_thread = None
cleanup_done = False

def cleanup_all():
    """Comprehensive cleanup function"""
    global cleanup_done
    
    if cleanup_done:
        return
    
    cleanup_done = True
    print("Performing cleanup...")
    
    # Clean up external processes first
    cleanup_npm_process()
    cleanup_lsp_process()

def force_exit():
    """Force exit the application"""
    cleanup_all()
    os._exit(0)

async def main_starter_async():
    global shutdown_event, jrpc_server, aider_thread
    shutdown_event = Event()
    
    # Register cleanup function to run on exit
    atexit.register(cleanup_all)
    
    def sigint_handler(sig, frame):
        print("\nShutting down...")
        cleanup_all()
        try:
            loop = asyncio.get_running_loop()
            loop.call_soon_threadsafe(shutdown_event.set)
        except RuntimeError:
            force_exit()
    
    signal.signal(signal.SIGINT, sigint_handler)
    signal.signal(signal.SIGTERM, sigint_handler)
    
    # Parse configuration from command line
    config = ServerConfig.from_args()
    
    # Validate configuration
    errors = config.validate()
    if errors:
        print("Configuration errors:")
        for error in errors:
            print(f"  - {error}")
        return 1
    
    # Print configuration summary
    config.print_summary()
    
    # Find available ports for all services
    try:
        # Start with the base aider port and find consecutive available ports
        base_port = config.aider_port
        server_port = find_available_port(start_port=base_port)
        
        # Find LSP port (if LSP is enabled) - make sure it's different from server port
        lsp_port = None
        if config.is_lsp_enabled():
            lsp_start_port = server_port + 1 if server_port >= base_port else base_port + 100
            lsp_port = find_available_port(start_port=lsp_start_port)
            print(f"Allocated LSP port: {lsp_port}")
        
        # Update config with allocated ports
        config.update_actual_ports(aider_port=server_port, lsp_port=lsp_port)
        
    except RuntimeError as e:
        print(f"Error finding available ports: {e}")
        return 1
    
    # Create and configure JRPC server
    jrpc_server = JRPCServer(port=server_port)
    
    # Start aider in a separate thread with proper daemon setting
    aider_config = config.get_aider_config()
    aider_thread = threading.Thread(
        target=main, 
        args=(aider_config['args'],), 
        daemon=True,
        name="AiderThread"
    )
    aider_thread.start()
    
    # Wait for coder initialization
    print("Waiting for coder initialization...")
    timeout = 60
    start_time = asyncio.get_event_loop().time()
    while CoderWrapper._coder_instance is None:
        if asyncio.get_event_loop().time() - start_time > timeout:
            print(f"Timed out waiting for coder initialization after {timeout} seconds")
            break
        await asyncio.sleep(0.5)
    
    if CoderWrapper._coder_instance:
        print(f"Coder initialized after {asyncio.get_event_loop().time() - start_time:.1f} seconds")
    
    # Create wrappers and add to server
    try:
        coder_wrapper = CoderWrapper()
        coder = coder_wrapper.coder
        coder.io.yes = None
        
        jrpc_server.add_class(coder, 'EditBlockCoder')
        jrpc_server.add_class(coder.commands, 'Commands')
        jrpc_server.add_class(coder_wrapper, 'CoderWrapper')
        
        repo = Repo()
        jrpc_server.add_class(repo, 'Repo')
        
        io_wrapper = IOWrapper(coder.io, port=server_port)
        jrpc_server.add_class(io_wrapper, 'IOWrapper')
        
        chat_history = ChatHistory()
        jrpc_server.add_class(chat_history, 'ChatHistory')
        
        print(f"JSON-RPC server running on port {server_port}")
        
    except Exception as e:
        print(f"Error initializing components: {e}")
        return 1
    
    # Start LSP server if enabled - pass the repo instance to get the correct workspace root
    if config.is_lsp_enabled() and lsp_port:
        actual_lsp_port = start_lsp_server(config, repo)
        if actual_lsp_port:
            print(f"LSP server running on port {actual_lsp_port}")
        else:
            print("LSP server failed to start, continuing without LSP features")
    
    # Start webapp dev server
    dev_server_started = start_npm_dev_server(config)
    if not dev_server_started:
        print("Warning: Failed to start webapp dev server")
    
    try:
        await jrpc_server.start()
        print("Server running. Press Ctrl+C to exit.")
        
        # Open browser after servers are started
        if dev_server_started:
            # Wait a bit more for the dev server to be fully ready
            await asyncio.sleep(2)
            open_browser(config)
        
        await shutdown_event.wait()
        print("Stopping server...")
        
        # Stop JRPC server with timeout
        try:
            await asyncio.wait_for(jrpc_server.stop(), timeout=5.0)
        except asyncio.TimeoutError:
            print("JRPC server stop timed out, forcing shutdown")
        
    except OSError as e:
        if e.errno == 98:
            print(f"ERROR: Port {server_port} is already in use. Try a different port.")
            return 1
        else:
            print(f"ERROR: Failed to start server: {e}")
            return 2
    except Exception as e:
        print(f"Server error: {e}")
        return 3
    finally:
        # Ensure cleanup happens
        cleanup_all()
        
        # Give a moment for cleanup to complete
        await asyncio.sleep(0.5)

def main_starter():
    try:
        try:
            from .logger import Logger
        except ImportError:
            from logger import Logger

        Logger.configure(log_dir='/tmp', default_name='AiderServer')
        Logger.info("Starting aider-server")
        
        exit_code = asyncio.run(main_starter_async())
        return exit_code if exit_code else 0
        
    except KeyboardInterrupt:
        print("\nForced exit")
        force_exit()
    except Exception as e:
        print(f"Unhandled exception: {e}")
        force_exit()
    finally:
        # Final cleanup attempt
        cleanup_all()

if __name__ == "__main__":
    try:
        sys.exit(main_starter())
    except:
        force_exit()
