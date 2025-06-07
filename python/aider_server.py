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
from asyncio import Event

# Add local jrpc-oo to path if needed
if os.path.exists('./jrpc-oo'):
    sys.path.insert(0, os.path.abspath('./jrpc-oo'))
from jrpc_oo import JRPCServer

from eh_i_decoder.io_wrapper import IOWrapper
from eh_i_decoder.coder_wrapper import CoderWrapper
from eh_i_decoder.repo import Repo

# Apply the monkey patch before importing aider modules
CoderWrapper.apply_coder_create_patch()

from aider.main import main

def parse_args():
    parser = argparse.ArgumentParser(description="Run Aider with JSON-RPC server")
    parser.add_argument("--port", type=int, default=8999, help="Port for JSON-RPC server")
    
    args, unknown_args = parser.parse_known_args()
    return args, unknown_args

shutdown_event = None

async def main_starter_async():
    global shutdown_event
    shutdown_event = Event()
    
    def sigint_handler(sig, frame):
        print("\nShutting down...")
        try:
            loop = asyncio.get_running_loop()
            loop.call_soon_threadsafe(shutdown_event.set)
        except RuntimeError:
            os._exit(1)
    
    signal.signal(signal.SIGINT, sigint_handler)
    
    args, aider_args = parse_args()
    jrpc_server = JRPCServer(port=args.port)
    
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
        
        io_wrapper = IOWrapper(coder.io, port=args.port)
        jrpc_server.add_class(io_wrapper, 'IOWrapper')
        
        print(f"JSON-RPC server running on port {args.port}")
        
    except Exception as e:
        print(f"Error initializing components: {e}")
        return 1
    
    try:
        await jrpc_server.start()
        print("Server running. Press Ctrl+C to exit.")
        
        await shutdown_event.wait()
        print("Stopping server...")
        
        await asyncio.wait_for(jrpc_server.stop(), timeout=5.0)
        
    except OSError as e:
        if e.errno == 98:
            print(f"ERROR: Port {args.port} is already in use. Try a different port.")
            return 1
        else:
            print(f"ERROR: Failed to start server: {e}")
            return 2
    except Exception as e:
        print(f"Server error: {e}")
        return 3

def main_starter():
    try:
        from eh_i_decoder.logger import Logger
        Logger.configure(log_dir='/tmp', default_name='AiderServer')
        Logger.info("Starting aider-server")
        
        exit_code = asyncio.run(main_starter_async())
        return exit_code if exit_code else 0
        
    except KeyboardInterrupt:
        print("\nForced exit")
        os._exit(1)
    except Exception as e:
        print(f"Unhandled exception: {e}")
        os._exit(3)

if __name__ == "__main__":
    sys.exit(main_starter())
