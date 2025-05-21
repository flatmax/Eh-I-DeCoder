import asyncio
from datetime import datetime

class CommandsWrapper:
    """
    Wrapper for Commands that intercepts tool output methods for webapp display
    This is similar to IOWrapper but focused on command outputs
    """
    
    def __init__(self, commands_instance):
        self.commands = commands_instance
        self.log_file = '/tmp/commands_wrapper.log'
        self.log(f"CommandsWrapper initialized with commands_instance: {commands_instance}")
        
        # Store the original methods
        self.original_tool_output = commands_instance.tool_output
        self.original_tool_error = commands_instance.tool_error
        self.original_tool_warning = commands_instance.tool_warning
        self.original_print = commands_instance.print
        
        # Replace with our wrapper methods
        commands_instance.tool_output = self.tool_output_wrapper
        commands_instance.tool_error = self.tool_error_wrapper
        commands_instance.tool_warning = self.tool_warning_wrapper
        commands_instance.print = self.print_wrapper
        
    def log(self, message):
        """Write a log message to the log file with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
        with open(self.log_file, 'a') as f:
            f.write(f"[{timestamp}] {message}\n")
    
    def tool_output_wrapper(self, message):
        """Intercept standard informational output"""
        self.log(f"tool_output_wrapper called with message: {message}")
        
        # Send to webapp
        asyncio.create_task(self.send_to_webapp('output', message))
        
        # Call original method
        return self.original_tool_output(message)
    
    def tool_error_wrapper(self, message):
        """Intercept error messages"""
        self.log(f"tool_error_wrapper called with message: {message}")
        
        # Send to webapp
        asyncio.create_task(self.send_to_webapp('error', message))
        
        # Call original method
        return self.original_tool_error(message)
    
    def tool_warning_wrapper(self, message):
        """Intercept warning messages"""
        self.log(f"tool_warning_wrapper called with message: {message}")
        
        # Send to webapp
        asyncio.create_task(self.send_to_webapp('warning', message))
        
        # Call original method
        return self.original_tool_warning(message)
    
    def print_wrapper(self, *args, **kwargs):
        """Intercept print calls"""
        # Convert args to string message
        message = ' '.join(str(arg) for arg in args)
        
        # Log debug information
        self.log(f"print_wrapper called with message: {message}")
        
        # Send to webapp
        asyncio.create_task(self.send_to_webapp('print', message))
        
        # Call original method
        return self.original_print(*args, **kwargs)
    
    async def send_to_webapp(self, msg_type, message):
        """Send command output to webapp"""
        self.log(f"send_to_webapp called with type: {msg_type}, message: {message}")
        
        try:
            # Call method in Commands.js to display the message
            response = await self.get_call()['Commands.displayCommandOutput'](msg_type, message)
            self.log(f"displayCommandOutput response: {response}")
        except Exception as e:
            err_msg = f"Error sending to webapp: {e}"
            self.log(f"{err_msg}\n{type(e)}")
            print(err_msg)
