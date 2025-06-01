import asyncio
import os
import time
import tracemalloc
import traceback
from datetime import datetime
import concurrent.futures
import threading
from eh_i_decoder.base_wrapper import BaseWrapper

# Enable tracemalloc for debugging
tracemalloc.start()

class IOWrapper(BaseWrapper):
    """Wrapper for InputOutput that intercepts LLM responses for webapp display"""
    
    def __init__(self, io_instance):
        self.io = io_instance
        self.log_file = '/tmp/io_wrapper.log'
        self.log(f"IOWrapper initialized with io_instance: {io_instance}")
        
        # Initialize base class
        super().__init__()
        
        # Store the original method
        self.original_assistant_output = io_instance.assistant_output
        # Replace with our wrapper method
        io_instance.assistant_output = self.assistant_output_wrapper
        
        # For streaming responses
        if hasattr(io_instance, 'get_assistant_mdstream'):
            self.original_get_assistant_mdstream = io_instance.get_assistant_mdstream
            io_instance.get_assistant_mdstream = self.get_mdstream_wrapper
        
        # Storage for responses
        self.last_response = None
        
        # Set up command output interception
        # Store the original methods
        self.original_tool_output = io_instance.tool_output
        self.original_tool_error = io_instance.tool_error
        self.original_tool_warning = io_instance.tool_warning
        self.original_print = io_instance.print
        
        # Replace with our wrapper methods
        io_instance.tool_output = self.tool_output_wrapper
        io_instance.tool_error = self.tool_error_wrapper
        io_instance.tool_warning = self.tool_warning_wrapper
        io_instance.print = self.print_wrapper
        
        # Set up confirmation interception
        self.original_confirm_ask = io_instance.confirm_ask
        io_instance.confirm_ask = self.confirm_ask_wrapper

        # Track if we've seen any command output for this request
        self.has_command_output = False
    
    def confirm_ask_wrapper(self, question, default=None, subject=None, explicit_yes_required=False, group=None, allow_never=False):
        """Intercept confirm_ask calls and send to webapp"""
        self.log(f"confirm_ask_wrapper called with question: {question}")
        
        try:
            confirmation_data = {
                'question': str(question) if question is not None else '',
                'default': default,
                'subject': str(subject) if subject is not None else None,
                'explicit_yes_required': explicit_yes_required,
                'group': str(group) if group is not None else None,
                'allow_never': allow_never
            }
            
            # Use main_loop if available, otherwise fall back to original method
            if self.main_loop and not self.main_loop.is_closed():
                future = asyncio.run_coroutine_threadsafe(
                    self._async_confirmation_request(confirmation_data),
                    self.main_loop
                )
                response = future.result(timeout=30.0)
                self.log(f"Received response from webapp: {response}")
                return response
            else:
                self.log("No main loop available, falling back to original method")
                return self.original_confirm_ask(question, default, subject, explicit_yes_required, group, allow_never)
                
        except Exception as e:
            self.log(f"Error in confirm_ask_wrapper: {e}")
            return self.original_confirm_ask(question, default, subject, explicit_yes_required, group, allow_never)
    
    async def _async_confirmation_request(self, confirmation_data):
        """Make the async RPC call to the webapp"""
        self.log('Making RPC call to webapp')
        try:
            call_func = self.get_call()['PromptView.confirmation_request']
            response = await asyncio.wait_for(call_func(confirmation_data), timeout=30.0)
            
            # Extract response from dict if needed
            if isinstance(response, dict) and len(response) == 1:
                response = next(iter(response.values()))
            
            return response
        except Exception as e:
            self.log(f'Error in _async_confirmation_request: {e}')
            raise

    def assistant_output_wrapper(self, message, pretty=None):
        # Log debug information
        self.log(f"assistant_output_wrapper called with message type: {type(message)}")
        self.log(f"message content (first 100 chars): {str(message)[:100]}")
        
        # Also print to console
        print(f"IOWrapper: assistant_output_wrapper called with message type: {type(message)}")
        print(f"IOWrapper: message content (first 100 chars): {str(message)[:100]}")
        
        # Store the message for webapp
        self.last_response = message
        
        # Send to webapp - fire and forget
        self.log(f"Sending message to webapp")
        self._safe_create_task(self.send_to_webapp(message))
        
        # Call original method to maintain console output
        self.log(f"Calling original assistant_output method")
        return self.original_assistant_output(message, pretty)
    
    def get_mdstream_wrapper(self):
        """Intercept markdown stream creation for streaming responses"""
        self.log(f"get_mdstream_wrapper called")
        mdstream = self.original_get_assistant_mdstream()
        
        # Store the original update method
        original_update = mdstream.update
        
        # Replace with our wrapper
        def update_wrapper(content, final=False):
            self.log(f"mdstream.update called with content (first 100 chars): {content[:100] if content else 'None'}, final: {final}")
            
            # Send to webapp asynchronously - fire and forget
            self._safe_create_task(self.send_stream_update(content, final))
            
            # Call original method immediately
            self.log("Calling original mdstream.update")
            return original_update(content, final)
        
        mdstream.update = update_wrapper
        return mdstream
        
    # Command output wrapper methods
    def tool_output_wrapper(self, message='', **kwargs):
        """Intercept standard informational output"""
        self.log(f"tool_output_wrapper called with message: {message}, kwargs: {kwargs}")
        
        # Mark that we've seen command output
        self.has_command_output = True
        
        # Send to webapp - fire and forget
        self._safe_create_task(self.send_to_webapp_command('output', message))
        
        # Call original method with all arguments
        return self.original_tool_output(message, **kwargs)
    
    def tool_error_wrapper(self, message='', **kwargs):
        """Intercept error messages"""
        self.log(f"tool_error_wrapper called with message: {message}, kwargs: {kwargs}")
        
        # Mark that we've seen command output
        self.has_command_output = True
        
        # Send to webapp - fire and forget
        self._safe_create_task(self.send_to_webapp_command('error', message))
        
        # Call original method with all arguments
        return self.original_tool_error(message, **kwargs)
    
    def tool_warning_wrapper(self, message='', **kwargs):
        """Intercept warning messages"""
        self.log(f"tool_warning_wrapper called with message: {message}, kwargs: {kwargs}")
        
        # Mark that we've seen command output
        self.has_command_output = True
        
        # Send to webapp - fire and forget
        self._safe_create_task(self.send_to_webapp_command('warning', message))
        
        # Call original method with all arguments
        return self.original_tool_warning(message, **kwargs)
    
    def print_wrapper(self, *args, **kwargs):
        """Intercept print calls"""
        # Convert args to string message
        message = ' '.join(str(arg) for arg in args)
        
        # Log debug information
        self.log(f"print_wrapper called with message: {message}, kwargs: {kwargs}")
        
        # Mark that we've seen command output
        self.has_command_output = True
        
        # Send to webapp - fire and forget
        self._safe_create_task(self.send_to_webapp_command('print', message))
        
        # Call original method
        return self.original_print(*args, **kwargs)
    
    def signal_command_complete(self):
        """Signal that command processing is complete"""
        self.log("Signaling command completion to webapp")
        if self.has_command_output:
            # Reset the flag
            self.has_command_output = False
            # Send completion signal
            self._safe_create_task(self.get_call()['PromptView.streamComplete']())
    
    async def send_to_webapp(self, message):
        """Send completed response to webapp - OPTIMIZED VERSION"""
        self.log(f"send_to_webapp called with message length: {len(str(message))}")
        print(f"IOWrapper: send_to_webapp called with message length: {len(str(message))}")
        
        try:
            # Fire and forget - don't wait for response
            self.log("About to call PromptView.streamWrite")
            self._safe_create_task(self.get_call()['PromptView.streamWrite'](message))
            self.log("streamWrite call initiated, calling streamComplete")
            
            self._safe_create_task(self.get_call()['PromptView.streamComplete']())
            self.log("streamComplete call initiated")
            
        except Exception as e:
            err_msg = f"Error sending to webapp: {e}"
            self.log(f"{err_msg}\n{type(e)}\n{e.__traceback__}")
            print(err_msg)
            
            # Try to notify the webapp about the error - fire and forget
            try:
                self._safe_create_task(self.get_call()['PromptView.streamError'](str(e)))
                self.log("Sent error notification to webapp")
            except Exception as e2:
                self.log(f"Failed to send error notification: {e2}")
    
    async def send_stream_update(self, content, final):
        """Send streaming update to webapp - OPTIMIZED VERSION"""
        current_time = time.time()
        self.log(f"[TIME: {current_time:.6f}] send_stream_update called with content length: {len(content) if content else 0}, final: {final}")
        
        try:
            self.log(f"[TIME: {current_time:.6f}] Calling PromptView.streamWrite with content and final param")
            # Fire and forget - don't wait for response
            self._safe_create_task(self.get_call()['PromptView.streamWrite'](content, final))
            self.log("streamWrite call initiated")
            
            if final:
                self.log("Final chunk, calling streamComplete")
                # Fire and forget - don't wait for response
                self._safe_create_task(self.get_call()['PromptView.streamComplete']())
                self.log("streamComplete call initiated")
        except Exception as e:
            err_msg = f"Error sending stream update to webapp: {e}"
            self.log(f"{err_msg}\n{type(e)}")
            print(err_msg)
            
            # Try to notify the webapp about the error - fire and forget
            try:
                self._safe_create_task(self.get_call()['PromptView.streamError'](str(e)))
                self.log("Sent error notification to webapp")
            except Exception as e2:
                self.log(f"Failed to send error notification: {e2}")
                
    async def send_to_webapp_command(self, msg_type, message):
        """Send command output to webapp - OPTIMIZED VERSION"""
        self.log(f"send_to_webapp_command called with type: {msg_type}, message: {message}")
        
        try:
            # Fire and forget - don't wait for response
            self._safe_create_task(self.get_call()['Commands.displayCommandOutput'](msg_type, message))
            self.log("displayCommandOutput call initiated")
        except Exception as e:
            err_msg = f"Error sending command output to webapp: {e}"
            self.log(f"{err_msg}\n{type(e)}")
            print(err_msg)
