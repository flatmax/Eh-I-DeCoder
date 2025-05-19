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
            # First, test the callback with sayHello
            response = await self.get_call()['PromptView.sayHello']()
            print("PromptView.sayHello response:", response)
            
            print("Starting to process stream from coder.run_stream...")
            
            # Check if streamWrite is in available methods
            available_methods = self.get_call()
            print("Available RPC methods:", available_methods.keys())
            
            # Validate streamWrite exists
            if 'PromptView.streamWrite' not in available_methods:
                print("ERROR: PromptView.streamWrite method is not available!")
            else:
                print("PromptView.streamWrite method is available")
                
            # WORKAROUND: Instead of relying on direct generator output, 
            # monitor the terminal output
            import time
            import re
            from io import StringIO
            import sys
            
            # Original stdout
            orig_stdout = sys.stdout
            
            # Create a custom StringIO object to capture output
            class TeeStringIO(StringIO):
                def __init__(self, target_stream):
                    super().__init__()
                    self.target_stream = target_stream
                    self.last_content = ""
                    self.new_content = ""
                
                def write(self, content):
                    # Write to the original stream
                    self.target_stream.write(content)
                    # Also capture the content
                    super().write(content)
                    self.last_content = content
                    self.new_content += content
                    return len(content)
                    
                def get_new_content(self):
                    content = self.new_content
                    self.new_content = ""
                    return content
            
            # Replace stdout with our capturing stdout
            capture_stdout = TeeStringIO(orig_stdout)
            sys.stdout = capture_stdout
            
            # Start the generator
            chunk_count = 0
            stream_gen = self.coder.run_stream(prompt)
            
            # Helper to process chunks
            async def process_chunk(chunk_text):
                nonlocal chunk_count
                if chunk_text and chunk_text.strip():
                    chunk_count += 1
                    print(f"\nStreamWrite Chunk #{chunk_count}: {chunk_text!r}", file=orig_stdout)
                    try:
                        response = await self.get_call()['PromptView.streamWrite'](chunk_text)
                        print(f"StreamWrite Response: {response}", file=orig_stdout)
                    except Exception as e:
                        print(f"Error in streamWrite: {e}", file=orig_stdout)
            
            # Start the generator running in the background
            import threading
            
            def run_generator():
                try:
                    for _ in stream_gen:
                        pass  # Just iterate through the generator
                except Exception as e:
                    print(f"Error in generator: {e}", file=orig_stdout)
            
            # Start running the generator in a thread
            thread = threading.Thread(target=run_generator)
            thread.daemon = True
            thread.start()
            
            # Capture and process output in chunks
            try:
                prev_length = 0
                buffer = ""
                
                # Monitor for new content for 60 seconds
                for _ in range(600):  # 60 seconds with 0.1s checks
                    new_content = capture_stdout.get_new_content()
                    if new_content:
                        buffer += new_content
                        # Send chunk if buffer has reasonable size or ends with newline
                        if len(buffer) > 50 or '\n' in buffer:
                            await process_chunk(buffer)
                            buffer = ""
                    
                    # Sleep a bit
                    await asyncio.sleep(0.1)
                    
                    # If thread is done and no new content for a while, break
                    if not thread.is_alive() and _ > 20:  # 2 seconds
                        break
                
                # Send any remaining content
                if buffer:
                    await process_chunk(buffer)
                
            finally:
                # Restore original stdout
                sys.stdout = orig_stdout
                print(f"Stream monitoring complete. Processed {chunk_count} chunks.")
            
            print(f"Stream processing complete. Processed {chunk_count} chunks.")
            
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
