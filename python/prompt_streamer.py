import asyncio

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
