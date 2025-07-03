import asyncio
import os
import signal
import threading
import traceback
from datetime import datetime

try:
    from .base_wrapper import BaseWrapper
    from .logger import Logger
    from .exceptions import ProcessError, ValidationError, create_error_response
except ImportError:
    from base_wrapper import BaseWrapper
    from logger import Logger
    from exceptions import ProcessError, ValidationError, create_error_response


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
        try:
            from aider.coders.base_coder import Coder
            if callback not in Coder._coder_change_callbacks:
                Coder._coder_change_callbacks.append(callback)
                return {"success": True, "message": "Callback registered"}
            return {"success": False, "message": "Callback already registered"}
        except Exception as e:
            return create_error_response(e)
    
    @classmethod
    def get_coder(cls):
        """Get the current coder instance"""
        return cls._coder_instance

    def __init__(self, coder=None):
        try:
            if coder is None:
                coder = self.__class__._coder_instance
                if coder is None:
                    raise ValidationError("No coder instance available, and none was provided")
            
            self.coder = coder
            
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
                coder.add_rel_fname = self.add_rel_fname_wrapper
                
            if self.original_drop_rel_fname:
                coder.drop_rel_fname = self.drop_rel_fname_wrapper
            
            # Register for coder type changes
            from aider.coders.base_coder import Coder
            if hasattr(Coder, '_coder_change_callbacks'):
                self.register_coder_change_callback(self.on_coder_type_changed)
                
        except Exception as e:
            raise ValidationError(f"Failed to initialize CoderWrapper: {e}")
    
    def on_coder_type_changed(self, coder_type, edit_format, coder_instance):
        """Handle coder type change events"""
        try:
            self.coder = coder_instance
            # You could send this to the webapp
            self._safe_create_task(self.get_call()['MessageHandler.onCoderTypeChanged'](
                coder_type, 
                edit_format
            ))
        except Exception as e:
            self.log(f"Error in on_coder_type_changed: {e}")
    
    def add_rel_fname_wrapper(self, filename):
        """Wrapper for coder's add_rel_fname method to notify RepoTree after adding file"""
        try:
            # Call original method and store result
            result = self.original_add_rel_fname(filename)
            
            # Notify RepoTree to refresh its file list
            self._safe_create_task(self.get_call()['RepoTree.loadFileTree']())
            
            return result
        except Exception as e:
            self.log(f"Error in add_rel_fname_wrapper: {e}")
            raise
    
    def drop_rel_fname_wrapper(self, filename):
        """Wrapper for coder's drop_rel_fname method to notify RepoTree after dropping file"""
        try:
            # Call original method and store result
            result = self.original_drop_rel_fname(filename)
            
            # Notify RepoTree to refresh its file list
            self._safe_create_task(self.get_call()['RepoTree.loadFileTree']())
            
            return result
        except Exception as e:
            self.log(f"Error in drop_rel_fname_wrapper: {e}")
            raise

    def stop(self):
        """Stop the current running operation by raising KeyboardInterrupt"""
        try:
            self.log("Stop requested - interrupting coder operation only")
            
            # Use a custom event to signal threads to stop
            # This will not affect the main server
            if hasattr(self, '_current_run_thread') and self._current_run_thread:
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
                        raise ProcessError("Failed to interrupt thread")
                    else:
                        return {"status": "interrupt_sent_to_thread"}
                else:
                    raise ProcessError("No thread ID available")
            else:
                raise ProcessError("No active thread to interrupt")
        except Exception as e:
            return create_error_response(e)
        
    def signal_completion(self):
        """Signal that command processing is complete"""
        try:
            # Send completion signal to MessageHandler
            self._safe_create_task(self.get_call()['MessageHandler.streamComplete']())
        except Exception as e:
            self.log(f"Error signaling completion: {e}")

    def _is_terminal_command(self, message):
        """Check if a message is a command that should be executed in the terminal."""
        terminal_commands = [
            '/model', '/editor-model', '/weak-model', '/chat-mode', 
            '/help', '/ask', '/code', '/architect', '/context'
        ]
        
        # Ensure we're dealing with a string and only match exact commands without postfix
        if isinstance(message, str):
            message = message.strip()
            return message in terminal_commands
        return False

    def run_wrapper(self, message):
        """
        Wrapper for the coder's run method to execute it non-blockingly.
        This method is intended to be called via JRPC and return immediately.
        """
        try:
            # Check if this is a terminal command
            if self._is_terminal_command(message):
                # Send immediate response that this command should be executed in the terminal
                self._safe_create_task(self.get_call()['MessageHandler.streamWrite'](
                    f"The command `{message}` (without suffix string) should be executed directly in your terminal, not in the web interface.", 
                    True, 
                    'assistant'
                ))
                # Signal completion to reset UI state
                self.signal_completion()
                return {"status": "terminal_command_detected", "command": message}

            actual_run_method = self.original_run

            def task_to_run_in_thread():
                thread_name = threading.current_thread().name
                try:
                    if asyncio.iscoroutinefunction(actual_run_method):
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        try:
                            loop.run_until_complete(actual_run_method(message))
                        finally:
                            loop.close()
                    else:
                        actual_run_method(message)
                    
                    # Signal completion to MessageHandler
                    self.signal_completion()
                    
                except Exception as e:
                    self.log(f"Exception in threaded coder.run: {e}")
                    
                    # Signal completion even on error to reset the UI
                    self.signal_completion()
                finally:
                    # Clear the thread reference when done
                    if hasattr(self, '_current_run_thread') and self._current_run_thread == threading.current_thread():
                        self._current_run_thread = None

            # Create and start a daemon thread to run the task
            thread = threading.Thread(target=task_to_run_in_thread, name="CoderRunThread")
            thread.daemon = True  # Allows the main program to exit even if this thread is running
            
            # Store the thread reference for later interruption
            self._current_run_thread = thread
            
            thread.start()
            
            return {"status": "coder.run initiated", "thread_name": thread.name}
            
        except Exception as e:
            return create_error_response(e)
