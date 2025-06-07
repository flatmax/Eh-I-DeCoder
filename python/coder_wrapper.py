import asyncio
import os
import signal
import threading
import traceback
from datetime import datetime
from eh_i_decoder.base_wrapper import BaseWrapper
from eh_i_decoder.logger import Logger


class CoderWrapper(BaseWrapper):
    # Class variable to store the coder instance
    _coder_instance = None
    @staticmethod
    def apply_coder_create_patch():
        """
        Monkey patch Coder.create to detect new coder creation and type changes.
        Call this function before importing or using aider.
        """
        from aider.coders.base_coder import Coder
        
        # Store the original create method
        original_create = Coder.create
        
        # Add a field to track the current coder type
        Coder._current_coder_type = None
        Coder._coder_change_callbacks = []
        
        @classmethod
        def patched_create(cls, *args, **kwargs):
            # Call the original create method
            result = original_create(*args, **kwargs)
            
            # Get coder details
            coder_type = result.__class__.__name__
            edit_format = getattr(result, 'edit_format', 'unknown')
            
            # Store the coder instance in CoderWrapper
            CoderWrapper._coder_instance = result
            
            # Check if coder type has changed
            if Coder._current_coder_type != coder_type:
                print(f"🔄 Coder switched to: {coder_type} (edit_format: {edit_format})")
                
                # Log the change
                with open('/tmp/coder_changes.log', 'a') as f:
                    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
                    f.write(f"[{timestamp}] Coder switched to: {coder_type} (edit_format: {edit_format})\n")
                
                # Update current type
                Coder._current_coder_type = coder_type
                
                # Call any registered callbacks
                for callback in Coder._coder_change_callbacks:
                    try:
                        callback(coder_type, edit_format, result)
                    except Exception as e:
                        print(f"Error in coder change callback: {e}")
            
            return result
        
        # Replace the create method
        Coder.create = patched_create

    def register_coder_change_callback(self, callback):
        """Register a callback to be called when coder type changes"""
        from aider.coders.base_coder import Coder
        if callback not in Coder._coder_change_callbacks:
            Coder._coder_change_callbacks.append(callback)
            return True
        return False
    
    @classmethod
    def get_coder(cls):
        """Get the current coder instance"""
        return cls._coder_instance

    def __init__(self, coder=None):
        if coder is None:
            coder = self.__class__._coder_instance
            if coder is None:
                raise ValueError("No coder instance available, and none was provided")
        
        self.coder = coder
        Logger.info(f"CoderWrapper initialized with coder: {coder}")
        
        # Initialize base class
        super().__init__()
        
        # Store the original methods
        self.original_run = coder.run
        self.original_add_rel_fname = getattr(coder, 'add_rel_fname', None)
        self.original_drop_rel_fname = getattr(coder, 'drop_rel_fname', None)
        
        # Replace with our wrapper methods
        coder.run = self.run_wrapper
        
        # Only wrap methods if they exist in the coder instance
        if self.original_add_rel_fname:
            self.log("Wrapping add_rel_fname method")
            coder.add_rel_fname = self.add_rel_fname_wrapper
            
        if self.original_drop_rel_fname:
            self.log("Wrapping drop_rel_fname method")
            coder.drop_rel_fname = self.drop_rel_fname_wrapper
        
        # Register for coder type changes
        from aider.coders.base_coder import Coder
        if hasattr(Coder, '_coder_change_callbacks'):
            self.log("Registering for coder change notifications")
            self.register_coder_change_callback(self.on_coder_type_changed)
    
    def on_coder_type_changed(self, coder_type, edit_format, coder_instance):
        """Handle coder type change events"""
        self.log(f"Coder type changed to: {coder_type} (edit_format: {edit_format})")
        self.coder = coder_instance
        # You could send this to the webapp
        self._safe_create_task(self.get_call()['MessageHandler.onCoderTypeChanged'](
            coder_type, 
            edit_format
        ))
    
    def add_rel_fname_wrapper(self, filename):
        """Wrapper for coder's add_rel_fname method to notify RepoTree after adding file"""
        self.log(f"add_rel_fname_wrapper called for {filename}")
        
        # Call original method and store result
        result = self.original_add_rel_fname(filename)
        
        # Notify RepoTree to refresh its file list
        self.log(f"Notifying RepoTree about file addition: {filename}")
        self._safe_create_task(self.get_call()['RepoTree.loadFileTree']())
        
        return result
    
    def drop_rel_fname_wrapper(self, filename):
        """Wrapper for coder's drop_rel_fname method to notify RepoTree after dropping file"""
        self.log(f"drop_rel_fname_wrapper called for {filename}")
        
        # Call original method and store result
        result = self.original_drop_rel_fname(filename)
        
        # Notify RepoTree to refresh its file list
        self.log(f"Notifying RepoTree about file removal: {filename}")
        self._safe_create_task(self.get_call()['RepoTree.loadFileTree']())
        
        return result

    def stop(self):
        """Stop the current running operation by raising KeyboardInterrupt"""
        self.log("Stop requested - interrupting coder operation only")
        
        # Use a custom event to signal threads to stop
        # This will not affect the main server
        if hasattr(self, '_current_run_thread') and self._current_run_thread:
            self.log(f"Sending interrupt to thread: {self._current_run_thread.name}")
            # Raise exception in the coder thread using ctypes
            import ctypes
            thread_id = self._current_run_thread.ident
            if thread_id:
                # This raises KeyboardInterrupt in the target thread
                res = ctypes.pythonapi.PyThreadState_SetAsyncExc(
                    ctypes.c_long(thread_id), 
                    ctypes.py_object(KeyboardInterrupt)
                )
                if res > 1:
                    # If more than one thread was affected, undo it
                    ctypes.pythonapi.PyThreadState_SetAsyncExc(ctypes.c_long(thread_id), None)
                    self.log("Failed to interrupt thread (affected multiple threads)")
                    return {"status": "error", "message": "Failed to interrupt thread"}
                else:
                    self.log("Interrupt signal sent to thread")
                    return {"status": "interrupt_sent_to_thread"}
            else:
                self.log("No thread ID available")
                return {"status": "error", "message": "No thread ID available"}
        else:
            self.log("No active thread to interrupt")
            return {"status": "error", "message": "No active thread to interrupt"}
        
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
            finally:
                # Clear the thread reference when done
                if hasattr(self, '_current_run_thread') and self._current_run_thread == threading.current_thread():
                    self._current_run_thread = None
                    self.log(f"Thread reference cleared for '{thread_name}'")

        # Create and start a daemon thread to run the task
        thread = threading.Thread(target=task_to_run_in_thread, name="CoderRunThread")
        thread.daemon = True  # Allows the main program to exit even if this thread is running
        
        # Store the thread reference for later interruption
        self._current_run_thread = thread
        
        thread.start()
        
        self.log(f"Thread '{thread.name}' launched for coder.run, run_wrapper returning immediately.")
        return {"status": "coder.run initiated", "thread_name": thread.name}
