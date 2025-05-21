import asyncio
import os
import time
from datetime import datetime

class IOWrapper:
    """Wrapper for InputOutput that intercepts LLM responses for webapp display"""
    
    def __init__(self, io_instance, commands_instance=None):
        self.io = io_instance
        self.commands = commands_instance
        self.log_file = '/tmp/io_wrapper.log'
        self.log(f"IOWrapper initialized with io_instance: {io_instance}")
        
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
        self.stream_updates = []
        
        # Set up command output interception if commands_instance provided
        # if commands_instance:
            # self.log(f"Setting up command output interception for: {commands_instance}")
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
    
    def log(self, message):
        """Write a log message to the log file with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
        with open(self.log_file, 'a') as f:
            f.write(f"[{timestamp}] {message}\n")
    
    def assistant_output_wrapper(self, message, pretty=None):
        # Log debug information
        self.log(f"assistant_output_wrapper called with message type: {type(message)}")
        self.log(f"message content (first 100 chars): {str(message)[:100]}")
        
        # Also print to console
        print(f"IOWrapper: assistant_output_wrapper called with message type: {type(message)}")
        print(f"IOWrapper: message content (first 100 chars): {str(message)[:100]}")
        
        # Store the message for webapp
        self.last_response = message
        
        # Send to webapp
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
            
            if final:
                # Store for webapp
                self.stream_updates.append((content, final))
                
                # Send to webapp
                asyncio.create_task(self.send_stream_update(content, final))
            
            # Call original method
            self.log("Calling original mdstream.update")
            return original_update(content, final)
        
        mdstream.update = update_wrapper
        return mdstream
        
    # Command output wrapper methods
    def tool_output_wrapper(self, message = ''):
        """Intercept standard informational output"""
        self.log(f"tool_output_wrapper called with message: {message}")
        
        # Send to webapp
        asyncio.create_task(self.send_to_webapp_command('output', message))
        
        # Call original method
        return self.original_tool_output(message)
    
    def tool_error_wrapper(self, message = ''):
        """Intercept error messages"""
        self.log(f"tool_error_wrapper called with message: {message}")
        
        # Send to webapp
        asyncio.create_task(self.send_to_webapp_command('error', message))
        
        # Call original method
        return self.original_tool_error(message)
    
    def tool_warning_wrapper(self, message = ''):
        """Intercept warning messages"""
        self.log(f"tool_warning_wrapper called with message: {message}")
        
        # Send to webapp
        asyncio.create_task(self.send_to_webapp_command('warning', message))
        
        # Call original method
        return self.original_tool_warning(message)
    
    def print_wrapper(self, *args, **kwargs):
        """Intercept print calls"""
        # Convert args to string message
        message = ' '.join(str(arg) for arg in args)
        
        # Log debug information
        self.log(f"print_wrapper called with message: {message}")
        
        # Send to webapp
        asyncio.create_task(self.send_to_webapp_command('print', message))
        
        # Call original method
        return self.original_print(*args, **kwargs)
    
    async def send_to_webapp(self, message):
        """Send completed response to webapp"""
        self.log(f"send_to_webapp called with message length: {len(str(message))}")
        print(f"IOWrapper: send_to_webapp called with message length: {len(str(message))}")
        
        try:
            # Call directly through the server to all connected clients
            self.log("About to call PromptView.streamWrite")
            response = await self.get_call()['PromptView.streamWrite'](message)
            self.log(f"streamWrite completed with response: {response}, calling streamComplete")
            
            complete_response = await self.get_call()['PromptView.streamComplete']()
            self.log(f"streamComplete completed with response: {complete_response}")
            
        except Exception as e:
            err_msg = f"Error sending to webapp: {e}"
            self.log(f"{err_msg}\n{type(e)}\n{e.__traceback__}")
            print(err_msg)
            
            # Try to notify the webapp about the error
            try:
                await self.get_call()['PromptView.streamError'](str(e))
                self.log("Sent error notification to webapp")
            except Exception as e2:
                self.log(f"Failed to send error notification: {e2}")
    
    async def send_stream_update(self, content, final):
        """Send streaming update to webapp"""
        self.log(f"send_stream_update called with content length: {len(content) if content else 0}, final: {final}")
        
        try:
            self.log("Calling PromptView.streamWrite with content and final param")
            response = await self.get_call()['PromptView.streamWrite'](content, final)
            self.log(f"streamWrite response: {response}")
            
            if final:
                self.log("Final chunk, calling streamComplete")
                complete_response = await self.get_call()['PromptView.streamComplete']()
                self.log(f"streamComplete response: {complete_response}")
        except Exception as e:
            err_msg = f"Error sending stream update to webapp: {e}"
            self.log(f"{err_msg}\n{type(e)}")
            print(err_msg)
            
            # Try to notify the webapp about the error
            try:
                await self.get_call()['PromptView.streamError'](str(e))
                self.log("Sent error notification to webapp")
            except Exception as e2:
                self.log(f"Failed to send error notification: {e2}")
                
    async def send_to_webapp_command(self, msg_type, message):
        """Send command output to webapp"""
        self.log(f"send_to_webapp_command called with type: {msg_type}, message: {message}")
        
        try:
            # Call method in Commands.js to display the message
            response = await self.get_call()['Commands.displayCommandOutput'](msg_type, message)
            self.log(f"displayCommandOutput response: {response}")
        except Exception as e:
            err_msg = f"Error sending command output to webapp: {e}"
            self.log(f"{err_msg}\n{type(e)}")
            print(err_msg)
