import asyncio
import threading
from datetime import datetime
try:
    from .logger import Logger
except ImportError:
    from logger import Logger

class BaseWrapper:
    """Base class for wrappers that provides common functionality"""
    
    def __init__(self):
        # Register this class instance with the logger
        Logger.register_class(self)
        
        # Try to get the main event loop reference
        self.main_loop = None
        try:
            self.main_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass
    
    def log(self, message):
        """Write a log message to the log file with timestamp (legacy method)"""
        Logger.info(message)

    def _safe_create_task(self, coro):
        """Safely create an async task using main_loop if available"""
        try:
            # Use main_loop if available and not closed
            if self.main_loop and not self.main_loop.is_closed():
                future = asyncio.run_coroutine_threadsafe(coro, self.main_loop)
                return future
            else:
                # Try to get the current event loop
                loop = asyncio.get_running_loop()
                # If we have a loop, create the task
                return asyncio.create_task(coro)
        except RuntimeError:
            # No event loop running, schedule it to run later
            try:
                # Try to run in a new event loop in a thread
                def run_in_thread():
                    try:
                        asyncio.run(coro)
                    except Exception as e:
                        self.log(f"Error running coroutine in thread: {e}")
                
                thread = threading.Thread(target=run_in_thread, daemon=True)
                thread.start()
                return None
            except Exception as e:
                self.log(f"Error creating thread for coroutine: {e}")
                return None
