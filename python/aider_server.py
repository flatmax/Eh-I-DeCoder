#!/usr/bin/env python3
"""
aider_server.py - JSON-RPC server for the Aider AI coding assistant
"""
import argparse
import asyncio
import signal
import sys
import os
import threading
import socket
from asyncio import Event
from jrpc_oo import JRPCServer

try:
    from .io_wrapper import IOWrapper
    from .coder_wrapper import CoderWrapper
    from .repo import Repo
    from .chat_history import ChatHistory
    from .webapp_server import start_npm_dev_server, open_browser, cleanup_npm_process
    from .lsp_server import start_lsp_server, cleanup_lsp_process
except ImportError:
    from io_wrapper import IOWrapper
    from coder_wrapper import CoderWrapper
    from repo import Repo
    from chat_history import ChatHistory
    from webapp_server import start_npm_dev_server, open_browser, cleanup_npm_process
    from lsp_server import start_lsp_server, cleanup_lsp_process

# Apply the monkey patch before importing aider modules
CoderWrapper.apply_coder_create_patch()

from aider.main import main

def find_available_port(start_port=8999, max_attempts=1000):
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('', port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"Could not find an available port in range {start_port}-{start_port + max_attempts}")

def parse_args():
    parser = argparse.ArgumentParser(description="Run Aider with JSON-RPC server")
    parser.add_argument("--port", type=int, default=8999, help="Port for JSON-RPC server")
    parser.add_argument("--webapp-port", type=int, default=9876, help="Port for webapp dev server")
    parser.add_argument("--lsp-port", type=int, help="Port for LSP server (auto-detected if not specified)")
    parser.add_argument("--no-browser", action="store_true", help="Don't open browser automatically")
    parser.add_argument("--no-lsp", action="store_true", help="Don't start LSP server")
    
    args, unknown_args = parser.parse_known_args()
    return args, unknown_args

shutdown_event = None

async def main_starter_async():
    global shutdown_event
    shutdown_event = Event()
    
    def sigint_handler(sig, frame):
        print("\nShutting down...")
        cleanup_npm_process()
        cleanup_lsp_process()
        try:
            loop = asyncio.get_running_loop()
            loop.call_soon_threadsafe(shutdown_event.set)
        except RuntimeError:
            os._exit(1)
    
    signal.signal(signal.SIGINT, sigint_handler)
    
    args, aider_args = parse_args()
    
    # Check if port was explicitly specified
    port_specified = '--port' in sys.argv
    server_port = find_available_port(start_port=args.port)
    
    # Start LSP server if not disabled
    lsp_port = None
    if not args.no_lsp:
        lsp_port = start_lsp_server(args.lsp_port)
        if lsp_port:
            print(f"LSP server running on port {lsp_port}")
        else:
            print("LSP server failed to start, continuing without LSP features")
    
    # Start npm dev server
    dev_server_started = start_npm_dev_server(args.webapp_port)
    
    jrpc_server = JRPCServer(port=server_port)
    
    # Start aider in a separate thread
    aider_thread = threading.Thread(target=main, args=(aider_args,), daemon=True)
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
    
    try:
        await jrpc_server.start()
        print("Server running. Press Ctrl+C to exit.")
        
        # Open browser after servers are started
        if dev_server_started and not args.no_browser:
            # Wait a bit more for the dev server to be fully ready
            await asyncio.sleep(2)
            # Include LSP port in the URL if available
            open_browser(args.webapp_port, server_port, lsp_port)
        
        await shutdown_event.wait()
        print("Stopping server...")
        
        await asyncio.wait_for(jrpc_server.stop(), timeout=5.0)
        
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
        # Clean up processes
        cleanup_npm_process()
        cleanup_lsp_process()

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
        cleanup_npm_process()
        cleanup_lsp_process()
        os._exit(1)
    except Exception as e:
        print(f"Unhandled exception: {e}")
        cleanup_npm_process()
        cleanup_lsp_process()
        os._exit(3)

if __name__ == "__main__":
    sys.exit(main_starter())
