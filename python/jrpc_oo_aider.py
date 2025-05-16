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
    print("Try: pip install git+https://github.com/flatmax/jrpc-oo.git#subdirectory=python")
    print("\nAlternatively, clone the repository and install from the python directory:")
    print("git clone https://github.com/flatmax/jrpc-oo.git")
    print("cd jrpc-oo/python")
    print("pip install -e .")
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
    
    # Add the coder instance directly to the server
    server.add_class(coder, 'Aider')
    
    print(f"JSON-RPC server running on port {args.port}")
    print("Aider coder instance available through 'Aider' class")
    
    # Start the server
    server.start()


if __name__ == "__main__":
    main_jrpc()
