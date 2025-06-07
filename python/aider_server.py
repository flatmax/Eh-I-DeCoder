#!/usr/bin/env python3
"""
aider_server.py - JSON-RPC server for the Aider AI coding assistant
"""
#test
import argparse
import asyncio
from datetime import datetime
import signal
import sys
import os
from pathlib import Path
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
    # Create a parser that will extract the port argument
    parser = argparse.ArgumentParser(description="Run Aider with JSON-RPC server")
    # parser.add_argument("--port", '--no-fancy-input', type=int, default=8999, help="Port for JSON-RPC server")
    parser.add_argument("--port", type=int, default=8999, help="Port for JSON-RPC server")
    
    # Parse known args to get the port
    args, unknown_args = parser.parse_known_args()
    
    # Return both the parsed args (containing port) and the remaining args for Aider
    return args, unknown_args

# Setup custom sys.exit handler
original_sigint_handler = None  # Will be set in main_starter_async

async def main_starter_async():
    # Store the original SIGINT handler
    global original_sigint_handler
    original_sigint_handler = signal.getsignal(signal.SIGINT)
    
    # Create shutdown event
    shutdown_event = Event()
    
    # Define SIGINT handler that will trigger shutdown
    def sigint_handler(sig, frame):
        print("\nSIGINT received, initiating shutdown... please wait")
        shutdown_event.set()
    
    # Set our custom SIGINT handler
    signal.signal(signal.SIGINT, sigint_handler)
    
    # Parse command line arguments for the server and get remaining args for Aider
    args, aider_args = parse_args()
    # Initialize the server
    jrpc_server = JRPCServer(port=args.port)
    
    # simple_stdio = SimpleStdIO()

    # Start aider in a separate thread so it doesn't block the asyncio loop                                                                                                                          
    aider_thread = threading.Thread(target=main, args=(aider_args,), daemon=True)
    aider_thread.start()
    
    # Wait for the coder instance to be initialized instead of arbitrary sleep
    print("Waiting for coder initialization...")
    timeout = 60  # seconds
    start_time = asyncio.get_event_loop().time()
    while CoderWrapper._coder_instance is None:
        if asyncio.get_event_loop().time() - start_time > timeout:
            print(f"Timed out waiting for coder initialization after {timeout} seconds")
            break
        await asyncio.sleep(0.5)  # Check every half second
    
    if CoderWrapper._coder_instance:
        print(f"Coder initialized after {asyncio.get_event_loop().time() - start_time:.1f} seconds")
    else:
        print("Warning: Coder initialization may not be complete")
                                
    # Create a CoderWrapper to handle non-blocking run method using stored coder
    try:
        coder_wrapper = CoderWrapper()
        coder = coder_wrapper.coder
        coder.io.yes = None  # Now confirm_ask will actually prompt the user
        
        # Add the coder instance directly to the server with explicit class name
        jrpc_server.add_class(coder, 'EditBlockCoder')
        # Add the coder's commands to the server
        jrpc_server.add_class(coder.commands, 'Commands')
        
        # Create a Repo instance and add it to the server
        repo = Repo()
        jrpc_server.add_class(repo, 'Repo')
        
        jrpc_server.add_class(coder_wrapper, 'CoderWrapper')
        print(f"Coder wrapper created successfully: {coder_wrapper}")
    except Exception as e:
        print(f"Error creating coder wrapper: {e}")
        # Still create a log file with error information
        with open('/tmp/coder_wrapper.log', 'w') as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')}] Error initializing Coder Wrapper: {e}\n")
    
    # Create an IOWrapper to intercept coder IO and commands output
    try:
        io_wrapper = IOWrapper(coder.io, port=args.port)
        jrpc_server.add_class(io_wrapper, 'IOWrapper')
        print(f"IO wrapper created successfully: {io_wrapper}")
        # Log information about the server
        log_timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
        
        # Make sure log file is created and accessible
        with open('/tmp/io_wrapper.log', 'w') as f:
            f.write(f"[{log_timestamp}] IO Wrapper log initialized\n")
            f.write(f"JRPC Server: {jrpc_server}\n")
            f.write(f"Coder: {coder}\n")
            f.write(f"Server methods: {dir(jrpc_server)}\n")
            f.write(f"IO wrapper methods: {dir(io_wrapper)}\n")
    except Exception as e:
        print(f"Error creating IO wrapper: {e}")
        # Still create a log file with error information
        with open('/tmp/io_wrapper.log', 'w') as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')}] Error initializing IO Wrapper: {e}\n")
        
    print(f"JSON-RPC server running on port {args.port}")
    print("Coder instance available through 'EditBlockCoder' class")
    print("CoderWrapper available for running prompts")
    print("IO wrapping enabled for LLM responses")
    print("Command output wrapping enabled")
    print("Repo instance available for Git operations")
    
    # Start server with proper error handling
    try:
        await jrpc_server.start()
        
        try:
            # Wait until shutdown event is set
            print("Server running. Press Ctrl+C to exit.")
            await shutdown_event.wait()
            print("Shutdown event triggered, stopping server...")
        except Exception as e:
            print(f"Error in server main loop: {e}")
        finally:
            print("Stopping JSON-RPC server...")
            await jrpc_server.stop()
            # Restore original signal handler and sys.exit when shutting down
            signal.signal(signal.SIGINT, original_sigint_handler)
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"ERROR: Port {args.port} is already in use. Try a different port.")
            print(f"       Use --port argument to specify an alternative port.")
            return 1  # Exit code indicating error
        else:
            print(f"ERROR: Failed to start server: {e}")
            return 2  # Different error code for other OSErrors


def main_starter():
    """Entry point for the aider-server command"""
    try:
        # Import and configure our centralized logger
        from eh_i_decoder.logger import Logger
        
        # Configure the logger
        Logger.configure(log_dir='/tmp', default_name='AiderServer')
        
        # Set up basic logging through our centralized logger
        Logger.info("Starting aider-server")
        
        exit_code = asyncio.run(main_starter_async())
        return exit_code if exit_code else 0
    except Exception as e:
        print(f"Unhandled exception: {e}")
        # Restore original sys.exit in case of exception
        return 3  # Exit code for unhandled exceptions

if __name__ == "__main__":
    main_starter()
