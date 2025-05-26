import asyncio
import os
import time
from datetime import datetime
from simple_std_io import SimpleStdIO

class IOWrapper:
    """Wrapper for InputOutput that intercepts LLM responses for webapp display"""
    
    def __init__(self, io_instance):
        self.io = io_instance
        self.log_file = '/tmp/io_wrapper.log'
        self.log(f"IOWrapper initialized with io_instance: {io_instance}")
        
        # Replace PromptSession input/output with simple stdio versions
        # Create simple stdio wrapper with the same log file
        self.simple_stdio = SimpleStdIO()
        self.simple_stdio.log('hi')
        # self.simple_stdio.log(f"Current pompt_session _input: {io_instance.prompt_session._input}")                                                                                                                    
        # self.simple_stdio.log(f"Current pompt_session _output: {io_instance.prompt_session._output}")                                                                                                                  
        # self.simple_stdio.log(f"Current pompt_session input: {io_instance.prompt_session.input}")                                                                                                                    
        # self.simple_stdio.log(f"Current pompt_session output: {io_instance.prompt_session.output}")                                                                                                                  
        # self.simple_stdio.log(f"Current pompt_session app.input: {io_instance.prompt_session.app.input}")                                                                                                                    
        # self.simple_stdio.log(f"Current pompt_session app.output: {io_instance.prompt_session.app.output}")                                                                                                                  
        self.original_input = io_instance.prompt_session.input
        self.original_output = io_instance.prompt_session.output
        self.original_app_input = io_instance.prompt_session.input
        self.original_app_output = io_instance.prompt_session.output
        
        # Replace the input and output
        io_instance.prompt_session.app.input = self.simple_stdio.input
        io_instance.prompt_session.app.output = self.simple_stdio.output
        
        self.log("Replaced PromptSession input/output with SimpleStdIO")
        # self.simple_stdio.log(f"Current pompt_session _input: {io_instance.prompt_session._input}")                                                                                                                    
        # self.simple_stdio.log(f"Current pompt_session _output: {io_instance.prompt_session._output}")                                                                                                                  
        # self.simple_stdio.log(f"Current pompt_session input: {io_instance.prompt_session.input}")                                                                                                                    
        # self.simple_stdio.log(f"Current pompt_session output: {io_instance.prompt_session.output}")                                                                                                                  
        # self.simple_stdio.log(f"Current pompt_session app.input: {io_instance.prompt_session.app.input}")                                                                                                                    
        # self.simple_stdio.log(f"Current pompt_session app.output: {io_instance.prompt_session.app.output}")                                                                                                                  
        
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
        
        # # Set up confirmation interception
        # if hasattr(io_instance, 'confirm_ask'):
        #     self.original_confirm_ask = io_instance.confirm_ask
        #     io_instance.confirm_ask = self.confirm_ask_wrapper
    
    def log(self, message):
        """Write a log message to the log file with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
        with open(self.log_file, 'a') as f:
            f.write(f"[{timestamp}] {message}\n")
    
    def confirm_ask_wrapper(self, question, default=None, subject=None, explicit_yes_required=False, group=None, allow_never=False):
        """Intercept confirm_ask calls and send to webapp"""
        self.log(f"confirm_ask_wrapper called with question: {question}, default: {default}, subject: {subject}, group: {group}, allow_never: {allow_never}")
        
        try:
            confirmation_data = {
                'question': question,
                'default': default,
                'subject': subject,
                'explicit_yes_required': explicit_yes_required,
                'group': str(group) if group else None,
                'allow_never': allow_never
            }
            
            self.log(f"Sending confirmation request to webapp: {confirmation_data}")
            
            # Make synchronous RPC call to webapp - this will block until response
            # We need to run the async call in a synchronous context
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # If we're already in an async context, we need to use run_until_complete
                    # But that won't work if the loop is already running, so we'll use a different approach
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(asyncio.run, self._async_confirmation_request(confirmation_data))
                        response = future.result()
                else:
                    response = loop.run_until_complete(self._async_confirmation_request(confirmation_data))
            except RuntimeError:
                # No event loop, create one
                response = asyncio.run(self._async_confirmation_request(confirmation_data))
            
            self.log(f"Received response from webapp: {response}")
            return response
            
        except Exception as e:
            self.log(f"Error in confirm_ask_wrapper: {e}")
            # Fall back to original method on error
            return self.original_confirm_ask(question, default, subject, explicit_yes_required, group, allow_never)
    
    async def _async_confirmation_request(self, confirmation_data):
        """Make the async RPC call to the webapp"""
        return await self.get_call()['PromptView.confirmation_request'](confirmation_data)
    
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
        asyncio.create_task(self.send_to_webapp(message))
        
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
            asyncio.create_task(self.send_stream_update(content, final))
            
            # Call original method immediately
            self.log("Calling original mdstream.update")
            return original_update(content, final)
        
        mdstream.update = update_wrapper
        return mdstream
        
    # Command output wrapper methods
    def tool_output_wrapper(self, message = ''):
        """Intercept standard informational output"""
        self.log(f"tool_output_wrapper called with message: {message}")
        
        # Send to webapp - fire and forget
        asyncio.create_task(self.send_to_webapp_command('output', message))
        
        # Call original method
        return self.original_tool_output(message)
    
    def tool_error_wrapper(self, message = ''):
        """Intercept error messages"""
        self.log(f"tool_error_wrapper called with message: {message}")
        
        # Send to webapp - fire and forget
        asyncio.create_task(self.send_to_webapp_command('error', message))
        
        # Call original method
        return self.original_tool_error(message)
    
    def tool_warning_wrapper(self, message = ''):
        """Intercept warning messages"""
        self.log(f"tool_warning_wrapper called with message: {message}")
        
        # Send to webapp - fire and forget
        asyncio.create_task(self.send_to_webapp_command('warning', message))
        
        # Call original method
        return self.original_tool_warning(message)
    
    def print_wrapper(self, *args, **kwargs):
        """Intercept print calls"""
        # Convert args to string message
        message = ' '.join(str(arg) for arg in args)
        
        # Log debug information
        self.log(f"print_wrapper called with message: {message}")
        
        # Send to webapp - fire and forget
        asyncio.create_task(self.send_to_webapp_command('print', message))
        
        # Call original method
        return self.original_print(*args, **kwargs)
    
    async def send_to_webapp(self, message):
        """Send completed response to webapp - OPTIMIZED VERSION"""
        self.log(f"send_to_webapp called with message length: {len(str(message))}")
        print(f"IOWrapper: send_to_webapp called with message length: {len(str(message))}")
        
        try:
            # Fire and forget - don't wait for response
            self.log("About to call PromptView.streamWrite")
            asyncio.create_task(self.get_call()['PromptView.streamWrite'](message))
            self.log("streamWrite call initiated, calling streamComplete")
            
            asyncio.create_task(self.get_call()['PromptView.streamComplete']())
            self.log("streamComplete call initiated")
            
        except Exception as e:
            err_msg = f"Error sending to webapp: {e}"
            self.log(f"{err_msg}\n{type(e)}\n{e.__traceback__}")
            print(err_msg)
            
            # Try to notify the webapp about the error - fire and forget
            try:
                asyncio.create_task(self.get_call()['PromptView.streamError'](str(e)))
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
            asyncio.create_task(self.get_call()['PromptView.streamWrite'](content, final))
            self.log("streamWrite call initiated")
            
            if final:
                self.log("Final chunk, calling streamComplete")
                # Fire and forget - don't wait for response
                asyncio.create_task(self.get_call()['PromptView.streamComplete']())
                self.log("streamComplete call initiated")
        except Exception as e:
            err_msg = f"Error sending stream update to webapp: {e}"
            self.log(f"{err_msg}\n{type(e)}")
            print(err_msg)
            
            # Try to notify the webapp about the error - fire and forget
            try:
                asyncio.create_task(self.get_call()['PromptView.streamError'](str(e)))
                self.log("Sent error notification to webapp")
            except Exception as e2:
                self.log(f"Failed to send error notification: {e2}")
                
    async def send_to_webapp_command(self, msg_type, message):
        """Send command output to webapp - OPTIMIZED VERSION"""
        self.log(f"send_to_webapp_command called with type: {msg_type}, message: {message}")
        
        try:
            # Fire and forget - don't wait for response
            asyncio.create_task(self.get_call()['Commands.displayCommandOutput'](msg_type, message))
            self.log("displayCommandOutput call initiated")
        except Exception as e:
            err_msg = f"Error sending command output to webapp: {e}"
            self.log(f"{err_msg}\n{type(e)}")
            print(err_msg)
