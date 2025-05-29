import asyncio
import threading
import traceback
from datetime import datetime


class CoderWrapper:
    """Wrapper for Coder that provides non-blocking run method"""
    
    def __init__(self, coder):
        self.coder = coder
        self.log_file = '/tmp/coder_wrapper.log'
        self.log(f"CoderWrapper initialized with coder: {coder}")
        
        # Store the original method
        self.original_run = coder.run
        # Replace with our wrapper method
        coder.run = self.run_wrapper
    
    def log(self, message):
        """Write a log message to the log file with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
        with open(self.log_file, 'a') as f:
            f.write(f"[{timestamp}] {message}\n")

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
            except Exception as e:
                self.log(f"Exception in threaded coder.run (Thread '{thread_name}'): {e}")
                self.log(f"Traceback: {traceback.format_exc()}")
                # Optionally, you might want to send an error notification to the webapp here
                # if self.coder.run fails in the background.

        # Create and start a daemon thread to run the task
        thread = threading.Thread(target=task_to_run_in_thread, name="CoderRunThread")
        thread.daemon = True  # Allows the main program to exit even if this thread is running
        thread.start()
        
        self.log(f"Thread '{thread.name}' launched for coder.run, run_wrapper returning immediately.")
        return {"status": "coder.run initiated", "thread_name": thread.name}
