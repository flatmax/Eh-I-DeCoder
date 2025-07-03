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
from concurrent.futures import ThreadPoolExecutor
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
    from .exceptions import ValidationError, ProcessError, WebappError, LSPError
except ImportError:
    from io_wrapper import IOWrapper
    from coder_wrapper import CoderWrapper
    from repo import Repo
    from chat_history import ChatHistory
    from webapp_server import start_npm_dev_server, open_browser, cleanup_npm_process
    from lsp_server import start_lsp_server, cleanup_lsp_process
    from port_utils import find_available_port
    from server_config import ServerConfig
    from exceptions import ValidationError, ProcessError, WebappError, LSPError

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

async def find_ports_async(config):
    """Find available ports concurrently"""
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=2) as executor:
        # Find server port
        server_port_future = loop.run_in_executor(
            executor, 
            find_available_port, 
            config.aider_port
        )
        
        # Find LSP port if needed
        if config.is_lsp_enabled():
            lsp_start_port = config.aider_port + 100
            lsp_port_future = loop.run_in_executor(
                executor,
                find_available_port,
                lsp_start_port
            )
            server_port = await server_port_future
            lsp_port = await lsp_port_future
            return server_port, lsp_port
        else:
            server_port = await server_port_future
            return server_port, None

async def start_aider_async(aider_config):
    """Start aider in a thread asynchronously"""
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=1) as executor:
        await loop.run_in_executor(executor, main, aider_config['args'])

async def wait_for_coder_init(timeout=30):
    """Wait for coder initialization with shorter polling interval"""
    start_time = asyncio.get_event_loop().time()
    while CoderWrapper._coder_instance is None:
        if asyncio.get_event_loop().time() - start_time > timeout:
            return False
        await asyncio.sleep(0.1)  # Reduced from 0.5 to 0.1
    return True

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
    
    # Find available ports concurrently
    try:
        server_port, lsp_port = await find_ports_async(config)
        config.update_actual_ports(aider_port=server_port, lsp_port=lsp_port)
        
        if config.is_lsp_enabled() and lsp_port:
            print(f"Allocated LSP port: {lsp_port}")
            
    except RuntimeError as e:
        print(f"Error finding available ports: {e}")
        return 1
    
    # Create and configure JRPC server
    jrpc_server = JRPCServer(port=server_port)
    
    # Start all services concurrently
    aider_config = config.get_aider_config()
    
    # Create tasks for parallel startup
    tasks = []
    
    # Start aider in a separate thread
    aider_thread = threading.Thread(
        target=main, 
        args=(aider_config['args'],), 
        daemon=True,
        name="AiderThread"
    )
    aider_thread.start()
    
    # Start webapp dev server asynchronously
    try:
        webapp_task = asyncio.create_task(
            asyncio.to_thread(start_npm_dev_server, config)
        )
        tasks.append(webapp_task)
    except (ProcessError, WebappError) as e:
        print(f"Failed to start webapp: {e}")
        return 1
    
    # Wait for coder initialization (with shorter timeout)
    print("Waiting for coder initialization...")
    coder_initialized = await wait_for_coder_init(timeout=30)
    
    if not coder_initialized:
        print("Warning: Coder initialization timed out, continuing anyway...")
    else:
        print(f"Coder initialized")
    
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
        
    except ValidationError as e:
        print(f"Error initializing coder wrapper: {e}")
        return 1
    except Exception as e:
        print(f"Error initializing components: {e}")
        return 1
    
    # Start LSP server if enabled (asynchronously)
    if config.is_lsp_enabled() and lsp_port:
        try:
            lsp_task = asyncio.create_task(
                asyncio.to_thread(start_lsp_server, config, repo)
            )
            tasks.append(lsp_task)
        except (ProcessError, LSPError) as e:
            print(f"Failed to start LSP server: {e}")
            # LSP is optional, so we continue
    
    # Start JRPC server
    try:
        await jrpc_server.start()
        print("Server running. Press Ctrl+C to exit.")
        
        # Wait for webapp to be ready and open browser
        try:
            dev_server_started = await webapp_task
            if dev_server_started:
                # Small delay for dev server readiness
                await asyncio.sleep(0.5)  # Reduced from 2 seconds
                # Open browser asynchronously
                asyncio.create_task(asyncio.to_thread(open_browser, config))
            else:
                print("Warning: Failed to start webapp dev server")
        except (ProcessError, WebappError) as e:
            print(f"Webapp error: {e}")
        
        # Check LSP server result if started
        if config.is_lsp_enabled() and lsp_port and len(tasks) > 1:
            try:
                actual_lsp_port = await tasks[1]  # LSP task
                if actual_lsp_port:
                    print(f"LSP server running on port {actual_lsp_port}")
                else:
                    print("LSP server failed to start, continuing without LSP features")
            except Exception as e:
                print(f"LSP server error: {e}")
        
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
        # Cancel any remaining tasks
        for task in tasks:
            if not task.done():
                task.cancel()
        
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
