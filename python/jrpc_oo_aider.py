#!/usr/bin/env python

import argparse
import asyncio
from jrpc_oo import JRPCServer

from aider.main import main

def parse_args():
    parser = argparse.ArgumentParser(description="Run Aider with JSON-RPC server")
    parser.add_argument("--port", type=int, default=9000, help="Port for JSON-RPC server")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument("--aider-args", nargs="*", default=[], 
                        help="Arguments to pass to Aider (space separated)")
    
    return parser.parse_args()

async def main_starter():
    # Parse command line arguments for the server
    args = parse_args()
    
    # Parse aider arguments
    aider_args = args.aider_args
    
    # Initialize the server
    print('debug ', args.debug)
    jrpc_server = JRPCServer(port=args.port)
    
    # Start aider in API mode and get the coder instance
    coder = main(aider_args, return_coder=True)
    
    # Add the coder instance directly to the server with explicit class name
    jrpc_server.add_class(coder, 'EditBlockCoder')
    
    print(f"JSON-RPC server running on port {args.port}")
    print("Coder instance available through 'EditBlockCoder' class")
    
    # Start server
    await jrpc_server.start()

    try:
        # Keep server running indefinitely
        await asyncio.Future()
    except KeyboardInterrupt:
        print("Server stopped by user")
    finally:
        await jrpc_server.stop()


if __name__ == "__main__":
    asyncio.run(main_starter())
