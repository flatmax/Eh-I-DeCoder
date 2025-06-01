import asyncio
import threading
import traceback
from datetime import datetime
from eh_i_decoder.base_wrapper import BaseWrapper


class CoderWrapper(BaseWrapper):
    """Wrapper for Coder that provides non-blocking run method"""
    
    def __init__(self, coder):
        self.coder = coder
        self.log_file = '/tmp/coder_wrapper.log'
        self.log(f"CoderWrapper initialized with coder: {coder}")
        
        # Initialize base class
        super().__init__()
        
        # Store the original method
        self.original_run = coder.run
        # Replace with our wrapper method
        coder.run = self.run_wrapper

    def signal_completion(self):
        """Signal that command processing is complete"""
        self.log("Signaling command completion to webapp")
        try:
            # Send completion signal to MessageHandler
            self._safe_create_task(self.get_call()['MessageHandler.streamComplete']())
            self.log("streamComplete call initiated")
        except Exception as e:
            self.log(f"Error signaling completion: {e}")

    def run_wrapper(self, message):
        """
        Wrapper for the coder's run method to execute it non-blockingly.
        This method is intended to be called via JRPC and return immediately.
        """
        self.log(f"run_wrapper called with message (first 100 chars): {str(message)[:100]}...")

        actual_run_method = self.original_run

        def task_to_run_in_thread():
            thread_name = threading.current_thread().name
            self.log(f"Thread '{thread_name}' started for coder.run with message (first 100 chars): {str(message)[:100]}...")
            try:
                if asyncio.iscoroutinefunction(actual_run_method):
                    self.log(f"coder.run ('{actual_run_method.__name__}') is an async function. Running in a new event loop.")
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        loop.run_until_complete(actual_run_method(message))
                    finally:
                        loop.close()
                else:
                    self.log(f"coder.run ('{actual_run_method.__name__}') is a sync function. Running directly.")
                    actual_run_method(message)
                
                self.log(f"Thread '{thread_name}' for coder.run completed for message (first 100 chars): {str(message)[:100]}...")
                
                # Signal completion to MessageHandler
                self.signal_completion()
                
            except Exception as e:
                self.log(f"Exception in threaded coder.run (Thread '{thread_name}'): {e}")
                self.log(f"Traceback: {traceback.format_exc()}")
                
                # Signal completion even on error to reset the UI
                self.signal_completion()

        # Create and start a daemon thread to run the task
        thread = threading.Thread(target=task_to_run_in_thread, name="CoderRunThread")
        thread.daemon = True  # Allows the main program to exit even if this thread is running
        thread.start()
        
        self.log(f"Thread '{thread.name}' launched for coder.run, run_wrapper returning immediately.")
        return {"status": "coder.run initiated", "thread_name": thread.name}
