#!/usr/bin/env python

import argparse
import asyncio
from jrpc_oo import JRPCServer

from aider.main import main

class PromptStreamer:
    def __init__(self, coder):
        self.coder = coder
    
    def stream_prompt(self, prompt):
        """
        Start streaming the prompt through the coder's run_stream method.
        Returns immediately and sends chunks to PromptView::streamWrite.
        """
        # Start a background task to process the stream
        asyncio.create_task(self._process_stream(prompt))
        return {"status": "streaming_started"}
    
    async def _process_stream(self, prompt):
        """Background task to process the stream and send chunks to the browser"""
        try:
            import sys
            from io import StringIO
            
            # Create a simple stdout capture
            original_stdout = sys.stdout
            captured_output = StringIO()
            
            # Test that we can call the streamWrite method
            print("Testing callback to browser...")
            await self.get_call()['PromptView.sayHello']()
            
            # Get full response first (non-streaming)
            print("Getting response from Aider...")
            
            # Redirect stdout to capture output
            sys.stdout = captured_output
            
            # Run the coder's run method (not run_stream)
            response = self.coder.run(prompt)
            
            # Restore stdout
            sys.stdout = original_stdout
            
            print("Response received, streaming to browser...")
            
            # Get captured output (includes model's thinking)
            output = captured_output.getvalue()
            
            # If we have captured output, use it instead of response
            # as it likely has more detailed formatting
            if output and len(output) > len(response):
                content = output
            else:
                content = response
                
            # Stream the content in chunks
            chunk_size = 80  # Characters per chunk
            chunks = [content[i:i+chunk_size] for i in range(0, len(content), chunk_size)]
            
            chunk_count = 0
            for chunk in chunks:
                if chunk.strip():
                    chunk_count += 1
                    print(f"Sending chunk #{chunk_count}: {chunk!r}")
                    try:
                        await self.get_call()['PromptView.streamWrite'](chunk)
                        # Small delay to make it look like streaming
                        await asyncio.sleep(0.05)
                    except Exception as e:
                        print(f"Error in streamWrite: {e}")
                        
            print(f"Streaming complete. Sent {chunk_count} chunks.")
            
            # Signal that streaming is complete
            await self.get_call()['PromptView.streamComplete']()
        except Exception as e:
            print(f"Error in stream processing: {e}")
            # Notify the browser about the error
            await self.get_call()['PromptView.streamError'](str(e))

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
    print(coder)
    # Add the coder instance directly to the server with explicit class name
    jrpc_server.add_class(coder, 'EditBlockCoder')
    
    # Create a PromptStreamer instance and add it to the server
    prompt_streamer = PromptStreamer(coder)
    jrpc_server.add_class(prompt_streamer, 'PromptStreamer')
    
    print(f"JSON-RPC server running on port {args.port}")
    print("Coder instance available through 'EditBlockCoder' class")
    print("Prompt streaming available through 'PromptStreamer' class")
    
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
