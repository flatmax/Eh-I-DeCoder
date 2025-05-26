"""
Custom input/output classes for PromptSession that use simple stdio
instead of the complex prompt_toolkit input/output system.
"""

import sys
import select
from typing import Optional, TextIO
from datetime import datetime

from prompt_toolkit.cursor_shapes import CursorShape
from prompt_toolkit.data_structures import Size

class SimpleStdInput:
    """Simple input class that uses sys.stdin directly"""
    
    def __init__(self, stdin: Optional[TextIO] = None, log_file: Optional[str] = None):
        self.stdin = stdin or sys.stdin
        self._closed = False
        self.log_file = log_file
        self._log("SimpleStdInput initialized")
    
    def _log(self, message):
        """Write a log message to the log file with timestamp if log_file is provided"""
        if self.log_file:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
            try:
                with open(self.log_file, 'a') as f:
                    f.write(f"[{timestamp}] [SimpleStdInput] {message}\n")
            except Exception:
                # Silently ignore logging errors to avoid breaking the main functionality
                pass
    
    def __getattr__(self, name):
        """Handle calls to methods that aren't explicitly defined"""
        self._log(f"__getattr__ called for attribute: {name}")
        
        # Check if the attribute exists on stdin
        if hasattr(self.stdin, name):
            attr = getattr(self.stdin, name)
            self._log(f"Found attribute {name} on stdin: {attr}")
            
            # If it's callable, wrap it with logging
            if callable(attr):
                def wrapper(*args, **kwargs):
                    self._log(f"Calling stdin.{name}(*{args}, **{kwargs})")
                    result = attr(*args, **kwargs)
                    self._log(f"stdin.{name} returned: {result}")
                    return result
                return wrapper
            else:
                return attr
        else:
            self._log(f"Attribute {name} not found on stdin")
            raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")
    
    def fileno(self):
        """Return the file descriptor of stdin"""
        self._log("fileno() called")
        result = self.stdin.fileno()
        self._log(f"fileno() returning: {result}")
        return result
    
    # def read(self, count: int = -1) -> str:
    #     """Read from stdin"""
    #     if self._closed:
    #         raise ValueError("I/O operation on closed input")
    #     result = self.stdin.read(count)
    #     return result
    
    # def readline(self) -> str:
    #     """Read a line from stdin"""
    #     if self._closed:
    #         raise ValueError("I/O operation on closed input")
    #     result = self.stdin.readline()
    #     return result
    
    def read_keys(self):
        """Read available keys from stdin"""
        self._log("read_keys() called")
        if self._closed:
            self._log("read_keys() - input is closed, raising ValueError")
            raise ValueError("I/O operation on closed input")
        
        # Check if data is available to read without blocking
        if select.select([self.stdin], [], [], 0) == ([self.stdin], [], []):
            # Data is available, read it
            data = self.stdin.read(1)  # Read one character at a time
            self._log(f"read_keys: {repr(data)}")
            return data
        else:
            # No data available
            self._log("read_keys: no data available")
            return ""
    
    def flush_keys(self):
        """Flush any input left in the stdin buffer"""
        self._log("flush_keys() called")
        if self._closed:
            self._log("flush_keys() - input is closed, raising ValueError")
            raise ValueError("I/O operation on closed input")
        
        flushed_data = ""
        # Keep reading until no more data is available
        while select.select([self.stdin], [], [], 0) == ([self.stdin], [], []):
            char = self.stdin.read(1)
            if not char:
                break
            flushed_data += char
        
        if flushed_data:
            self._log(f"flush_keys: {repr(flushed_data)}")
        else:
            self._log("flush_keys: no data to flush")
        
        return flushed_data
    
    def close(self):
        """Close the input"""
        self._log("close() called")
        self._closed = True
    
    def __enter__(self):
        self._log("__enter__() called")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self._log(f"__exit__() called with exc_type: {exc_type}")
        self.close()


class SimpleStdOutput:
    """Simple output class that uses sys.stdout directly"""
    
    def __init__(self, stdout: Optional[TextIO] = None, log_file: Optional[str] = None):
        self.stdout = stdout or sys.stdout
        self._closed = False
        self.log_file = log_file
        self._log("SimpleStdOutput initialized")
    
    def _log(self, message):
        """Write a log message to the log file with timestamp if log_file is provided"""
        if self.log_file:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
            try:
                with open(self.log_file, 'a') as f:
                    f.write(f"[{timestamp}] [SimpleStdOutput] {message}\n")
            except Exception:
                # Silently ignore logging errors to avoid breaking the main functionality
                pass
    
    def __getattr__(self, name):
        """Handle calls to methods that aren't explicitly defined"""
        self._log(f"__getattr__ called for attribute: {name}")
        
        # Check if the attribute exists on stdout
        if hasattr(self.stdout, name):
            attr = getattr(self.stdout, name)
            self._log(f"Found attribute {name} on stdout: {attr}")
            
            # If it's callable, wrap it with logging
            if callable(attr):
                def wrapper(*args, **kwargs):
                    self._log(f"Calling stdout.{name}(*{args}, **{kwargs})")
                    result = attr(*args, **kwargs)
                    self._log(f"stdout.{name} returned: {result}")
                    return result
                return wrapper
            else:
                return attr
        else:
            self._log(f"Attribute {name} not found on stdout")
            raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")
    
    @property
    def responds_to_cpr(self) -> bool:
        self._log("responds_to_cpr property accessed")
        return False  # We don't need this on Windows.

    def cursor_backward(self, amount: int) -> None:
        self._log(f"cursor_backward() called with amount: {amount}")
        pass

    def hide_cursor(self) -> None:
        self._log("hide_cursor() called")
        pass

    def show_cursor(self) -> None:
        self._log("show_cursor() called")
        pass

    def set_cursor_shape(self, cursor_shape: CursorShape) -> None:
        self._log(f"set_cursor_shape() called with cursor_shape: {cursor_shape}")
        pass

    def reset_cursor_shape(self) -> None:
        self._log("reset_cursor_shape() called")
        pass

    def ask_for_cpr(self) -> None:
        self._log("ask_for_cpr() called")
        pass

    def bell(self) -> None:
        self._log("bell() called")
        pass

    def enable_bracketed_paste(self) -> None:
        self._log("enable_bracketed_paste() called")
        pass

    def disable_bracketed_paste(self) -> None:
        self._log("disable_bracketed_paste() called")
        pass

    def scroll_buffer_to_prompt(self) -> None:
        self._log("scroll_buffer_to_prompt() called")
        pass

    def get_size(self) -> Size:
        self._log("get_size() called (Size version)")
        result = Size(rows=4, columns=80)
        self._log(f"get_size() returning Size: {result}")
        return result

    def fileno(self):
        """Return the file descriptor of stdout"""
        self._log("fileno() called")
        result = self.stdout.fileno()
        self._log(f"fileno() returning: {result}")
        return result
    
    def write(self, data: str) -> int:
        """Write to stdout"""
        self._log(f"write() called with data: {repr(data)}")
        if self._closed:
            self._log("write() - output is closed, raising ValueError")
            raise ValueError("I/O operation on closed output")
        # Log what we're writing
        self._log(f"write: {repr(data)}")
        # Prepend tag to the data before writing
        tagged_data = f"[SimpleStdOutput] {data}"
        result = self.stdout.write(tagged_data)
        self._log(f"write() returning: {result}")
        return result
    
    def write_raw(self, data: str) -> int:
        """Write to stdout"""
        self._log(f"write_raw() called with data: {repr(data)}")
        if self._closed:
            self._log("write_raw() - output is closed, raising ValueError")
            raise ValueError("I/O operation on closed output")
        # Log what we're writing
        self._log(f"write_raw: {repr(data)}")
        # Prepend tag to the data before writing
        tagged_data = f"[SimpleStdOutput] {data}"
        result = self.stdout.write(tagged_data)
        self._log(f"write_raw() returning: {result}")
        return result
    
    def flush(self):
        """Flush stdout"""
        self._log("flush() called")
        if self._closed:
            self._log("flush() - output is closed, raising ValueError")
            raise ValueError("I/O operation on closed output")
        self._log("flush called")
        self.stdout.flush()
        self._log("flush() completed")

    def get_size(self):
        self._log("get_size() called (int version)")
        result = 60
        self._log(f"get_size() returning: {result}")
        return result
                                                                                                                                                            
    def encoding(self) -> str:
        self._log("encoding() called")
        result = "utf-8"
        self._log(f"encoding() returning: {result}")
        return result
                                                                                                                                                            
    # Implement other required methods with appropriate behavior                                                                                            
    def set_title(self, title: str) -> None:
        self._log(f"set_title() called with title: {repr(title)}")
        pass  # or send to external app                                                                                                                     
                                                                                                                                                            
    def clear_title(self) -> None:
        self._log("clear_title() called")
        pass                                                                                                                                                

    def close(self):
        """Close the output"""
        self._log("close() called")
        self._closed = True
    
    def __enter__(self):
        self._log("__enter__() called")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self._log(f"__exit__() called with exc_type: {exc_type}")
        self.close()


class SimpleStdIO:
    """Combined input/output class for simple stdio operations"""
    
    def __init__(self, stdin: Optional[TextIO] = None, stdout: Optional[TextIO] = None):
        self.log_file = '/tmp/simple_std_io.log'
        with open(self.log_file, 'w') as f:
            log_timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
            f.write(f"[{log_timestamp}] SimpleStdIO log initialized\n")

        self.log(f"SimpleStdIO initialized with io_instance: {self}")
        self.input = SimpleStdInput(stdin, self.log_file)
        self.output = SimpleStdOutput(stdout, self.log_file)
        self.log("SimpleStdIO initialization completed")
    
    def log(self, message):
        """Write a log message to the log file with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
        with open(self.log_file, 'a') as f:
            f.write(f"[{timestamp}] {message}\n")
    
    def close(self):
        """Close both input and output"""
        self.log("Closing SimpleStdIO")
        self.input.close()
        self.output.close()
        self.log("SimpleStdIO closed")
    
    def __enter__(self):
        self.log("SimpleStdIO context entered")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.log(f"SimpleStdIO context exited with exc_type: {exc_type}")
        self.close()
