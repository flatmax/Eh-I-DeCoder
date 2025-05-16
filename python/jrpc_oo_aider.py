#!/usr/bin/env python

import sys
import argparse
import importlib.util

try:
    # Try different import patterns that might work depending on how the package is installed
    try:
        from jrpc_server import JRPCServer
    except ImportError:
        try:
            # If installed as package from subdirectory
            from python.jrpc_server import JRPCServer
        except ImportError:
            # If installed via Git and module is at root level
            from jrpc_oo.jrpc_server import JRPCServer
except ImportError:
    print("Error: jrpc_server module not found. Please install it from GitHub.")
    print("Try: pip install -e .")
    print("\nAlternatively, install the dependency directly:")
    print("pip install git+https://github.com/flatmax/jrpc-oo.git#subdirectory=python")
    sys.exit(1)

from aider.main import main


def parse_args():
    parser = argparse.ArgumentParser(description="Run Aider with JSON-RPC server")
    parser.add_argument("--port", type=int, default=9000, help="Port for JSON-RPC server")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument("--aider-args", nargs="*", default=[], 
                        help="Arguments to pass to Aider (space separated)")
    
    return parser.parse_args()


def main_jrpc():
    # Parse command line arguments for the server
    args = parse_args()
    
    # Parse aider arguments
    aider_args = args.aider_args
    
    # Initialize the server
    server = JRPCServer(port=args.port, debug=args.debug)
    
    # Start aider in API mode and get the coder instance
    coder = main(aider_args, return_coder=True)
    
    # Add a wrapper class with explicit methods
    class AiderWrapper:
        def __init__(self, coder):
            self.coder = coder
        
        def chat(self, message):
            """Send a chat message to Aider and get response"""
            # The coder instance has methods to handle chat
            try:
                # Process the message and get a response
                response = self.coder.run_chat_loop(message, return_response=True)
                return response
            except Exception as e:
                return f"Error processing chat: {str(e)}"
        
        def add_files(self, file_paths):
            """Add files to Aider's context"""
            try:
                added_files = []
                for file_path in file_paths:
                    self.coder.add_files([file_path])
                    added_files.append(file_path)
                return f"Successfully added files: {', '.join(added_files)}"
            except Exception as e:
                return f"Error adding files: {str(e)}"
    
    # Add the wrapper instance to the server
    server.add_class(AiderWrapper(coder), 'Aider')
    
    print(f"JSON-RPC server running on port {args.port}")
    print("Aider coder instance available through 'Aider' class")
    
    # Start the server
    server.start()


if __name__ == "__main__":
    main_jrpc()
