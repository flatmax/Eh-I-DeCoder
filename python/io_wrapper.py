import asyncio
import os
import time
import tracemalloc
import traceback
from datetime import datetime
import concurrent.futures
import threading

try:
    from .base_wrapper import BaseWrapper
    from .logger import Logger
    from .exceptions import create_error_response
except ImportError:
    from base_wrapper import BaseWrapper
    from logger import Logger
    from exceptions import create_error_response

# Enable tracemalloc for debugging
tracemalloc.start()

class IOWrapper(BaseWrapper):
    """Wrapper for InputOutput that intercepts LLM responses for webapp display"""
    
    def __init__(self, io_instance, port=8999):
        self.io = io_instance
        Logger.info(f"IOWrapper initialized with io_instance: {io_instance}")
        
        # Initialize base class
        super().__init__()
        
        # Keep track of connection status
        self.connection_status_check_interval = 0.5  # seconds
        self.is_connected = True  # Start optimistic
        self._connection_check_task = None
        # Define webapp URL - use port provided or default from environment variable
        self.webapp_url = os.environ.get('WS URI', f'ws://localhost:{port}')
        self._start_connection_monitor()
        
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
        
        # Override prompt input to check for connections
        self.override_prompt_input()
        
    def _start_connection_monitor(self):
        """Start a background task to monitor connection status"""
        def check_connection():
            while True:
                try:
                    # Check connection status
                    was_connected = self.is_connected
                    self.is_connected = self._has_remote_connections()
                    
                    # If connection status changed
                    if was_connected != self.is_connected:
                        if self.is_connected:
                            # Connection restored
                            self.log("Remote connection established - enabling input")
                            self.io.console.print("[green]Remote connection established - input enabled[/green]")
                        else:
                            # Connection lost
                            self.log("No remote connections - disabling input")
                            self.io.console.print("[red]No remote connections - input disabled[/red]")
                            self.io.console.print(f"[yellow]In the webapp, use the server URI : [bold]{self.webapp_url}[/bold][/yellow]")
                            self.io.console.print("[yellow]If the web app is already running, check its connection[/yellow]")
                except Exception as e:
                    self.log(f"Error in connection monitor: {e}")
                
                time.sleep(self.connection_status_check_interval)
        
        # Start the thread
        thread = threading.Thread(target=check_connection, daemon=True)
        thread.start()
        
    def _has_remote_connections(self):
        """Check if any remotes are connected"""
        try:
            remotes = self.get_remotes()
            return bool(remotes and len(remotes) > 0)
        except Exception as e:
            self.log(f"Error checking remote connections: {e}")
            return False
    
    def confirm_ask_wrapper(self, question, default=None, subject=None, explicit_yes_required=False, group=None, allow_never=False):
        """Intercept confirm_ask calls and send to webapp"""
        question_id = (question, subject)
        if question_id in self.io.never_prompts:
            return False
        
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
                response = future.result()  # No timeout - wait indefinitely
                if response == "d" and allow_never:
                    self.io.never_prompts.add(question_id)
                    hist = f"{question.strip()} {response}"
                    self.io.append_chat_history(hist, linebreak=True, blockquote=True)
                    return False

                return response
            else:
                return self.original_confirm_ask(question, default, subject, explicit_yes_required, group, allow_never)
                
        except Exception as e:
            self.log(f"Error in confirm_ask_wrapper: {e}")
            return self.original_confirm_ask(question, default, subject, explicit_yes_required, group, allow_never)
    
    async def _async_confirmation_request(self, confirmation_data):
        """Make the async RPC call to the webapp"""
        try:
            call_func = self.get_call()['MessageHandler.confirmation_request']
            response = await call_func(confirmation_data)  # No timeout - wait indefinitely
            # Extract response from dict if needed
            if isinstance(response, dict) and len(response) == 1:
                response = next(iter(response.values()))
            
            return response
        except Exception as e:
            self.log(f'Error in _async_confirmation_request: {e}')
            raise

    def assistant_output_wrapper(self, message, pretty=None):
        # Store the message for webapp
        self.last_response = message
        
        # Send to webapp if connected - fire and forget
        if self.is_connected:
            self._safe_create_task(self.send_to_webapp(message))
        
        # Call original method to maintain console output
        return self.original_assistant_output(message, pretty)
    
    def get_mdstream_wrapper(self):
        """Intercept markdown stream creation for streaming responses"""
        mdstream = self.original_get_assistant_mdstream()
        
        # Store the original update method
        original_update = mdstream.update
        
        # Replace with our wrapper
        def update_wrapper(content, final=False):
            # Send to webapp asynchronously - fire and forget
            self._safe_create_task(self.send_stream_update(content, final))
            
            # Call original method with error handling for Rich LiveError
            try:
                return original_update(content, final)
            except Exception as e:
                # Check if it's a Rich LiveError
                if "Only one live display may be active at once" in str(e):
                    # Don't call the original update to avoid the Rich conflict
                    # The webapp will handle the display instead
                    return None
                else:
                    # Re-raise other exceptions
                    raise
        
        mdstream.update = update_wrapper
        return mdstream
        
    # Command output wrapper methods
    def tool_output_wrapper(self, message='', **kwargs):
        """Intercept standard informational output"""
        # Mark that we've seen command output
        self.has_command_output = True
        
        # Send to webapp - fire and forget
        self._safe_create_task(self.send_to_webapp_command('output', message))
        
        # Call original method with all arguments
        return self.original_tool_output(message, **kwargs)
    
    def tool_error_wrapper(self, message='', **kwargs):
        """Intercept error messages"""
        # Mark that we've seen command output
        self.has_command_output = True
        
        # Send to webapp - fire and forget
        self._safe_create_task(self.send_to_webapp_command('error', message))
        
        # Call original method with all arguments
        return self.original_tool_error(message, **kwargs)
    
    def tool_warning_wrapper(self, message='', **kwargs):
        """Intercept warning messages"""
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
        
        # Mark that we've seen command output
        self.has_command_output = True
        
        # Send to webapp - fire and forget
        self._safe_create_task(self.send_to_webapp_command('print', message))
        
        # Call original method
        return self.original_print(*args, **kwargs)
    
    def signal_command_complete(self):
        """Signal that command processing is complete"""
        try:
            if self.has_command_output:
                # Reset the flag
                self.has_command_output = False
                # Send completion signal
                self._safe_create_task(self.get_call()['MessageHandler.streamComplete']())
        except Exception as e:
            self.log(f"Error in signal_command_complete: {e}")
    
    async def send_to_webapp(self, message):
        """Send completed response to webapp - OPTIMIZED VERSION"""
        try:
            # Fire and forget - don't wait for response
            self._safe_create_task(self.get_call()['MessageHandler.streamWrite'](message, True, 'assistant'))
            
        except Exception as e:
            err_msg = f"Error sending to webapp: {e}"
            self.log(f"{err_msg}\n{type(e)}\n{e.__traceback__}")
            
            # Try to notify the webapp about the error - fire and forget
            try:
                self._safe_create_task(self.get_call()['MessageHandler.streamError'](str(e)))
            except Exception as e2:
                self.log(f"Failed to send error notification: {e2}")
    
    async def send_stream_update(self, content, final):
        """Send streaming update to webapp - OPTIMIZED VERSION"""
        if not self.is_connected:
            return
            
        try:
            # Fire and forget - don't wait for response
            self._safe_create_task(self.get_call()['MessageHandler.streamWrite'](content, final, 'assistant'))
            
        except Exception as e:
            err_msg = f"Error sending stream update to webapp: {e}"
            self.log(f"{err_msg}\n{type(e)}")
            
            # Try to notify the webapp about the error - fire and forget
            try:
                self._safe_create_task(self.get_call()['MessageHandler.streamError'](str(e)))
            except Exception as e2:
                self.log(f"Failed to send error notification: {e2}")
                
    async def send_to_webapp_command(self, msg_type, message):
        """Send command output to webapp using streamWrite with 'command' role"""
        if not self.is_connected:
            return
            
        try:
            # Format the message with type prefix for parsing in JavaScript
            formatted_message = f"{msg_type}:{message}"
            
            # Fire and forget - don't wait for response
            # Use streamWrite with 'command' role instead of displayCommandOutput
            self._safe_create_task(self.get_call()['MessageHandler.streamWrite'](formatted_message, False, 'command'))
        except Exception as e:
            err_msg = f"Error sending command output to webapp (if you're exiting, ctl-c again please): {e}"
            self.log(f"{err_msg}\n{type(e)}")
            print(err_msg)
    
    def override_prompt_input(self):
        """Override the prompt_session to check for connections before accepting input"""
        if not hasattr(self.io, 'prompt_session'):
            self.log("No prompt_session to override")
            return
        
        # Store the original prompt method
        original_prompt_method = self.io.prompt_session.prompt
    
        def wrapped_prompt(*args, **kwargs):
            # Check for remote connections before allowing input
            if not self.is_connected:
                # Print message once
                self.io.console.print("[red]Input disabled: No remote connections[/red]")
                self.io.console.print(f"[yellow]In your application use the Server URI : [bold]{self.webapp_url}[/bold][/yellow]")
                self.io.console.print("[yellow]Waiting for connection... (Press Ctrl+C to exit)[/yellow]")
            
                # Wait for connection to be restored, checking periodically
                while not self.is_connected:
                    try:
                        # Sleep to avoid high CPU usage and repeated prints
                        time.sleep(3)
                    except KeyboardInterrupt:
                        # Allow exit with Ctrl+C
                        self.io.console.print("[yellow]Keyboard interrupt detected, exiting...[/yellow]")
                        return "exit"
            
                # Connection restored
                self.io.console.print("[green]Connection restored, input enabled[/green]")
        
            # Proceed with original prompt method
            return original_prompt_method(*args, **kwargs)
        
        # Replace the original prompt method
        self.io.prompt_session.prompt = wrapped_prompt
        self.log("Prompt session method overridden to check connections")
