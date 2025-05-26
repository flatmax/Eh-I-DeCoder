"""
Custom input/output classes for PromptSession that use simple stdio
instead of the complex prompt_toolkit input/output system.
"""

import sys
import select
from typing import Optional, TextIO
from datetime import datetime


class SimpleStdInput:
    """Simple input class that uses sys.stdin directly"""
    
    def __init__(self, stdin: Optional[TextIO] = None, log_file: Optional[str] = None):
        self.stdin = stdin or sys.stdin
        self._closed = False
        self.log_file = log_file
    
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
    
    def fileno(self):
        """Return the file descriptor of stdin"""
        return self.stdin.fileno()
    
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
        if self._closed:
            raise ValueError("I/O operation on closed input")
        
        # Check if data is available to read without blocking
        if select.select([self.stdin], [], [], 0) == ([self.stdin], [], []):
            # Data is available, read it
            data = self.stdin.read(1)  # Read one character at a time
            self._log(f"read_keys: {repr(data)}")
            return data
        else:
            # No data available
            return ""
    
    def flush_keys(self):
        """Flush any input left in the stdin buffer"""
        if self._closed:
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
        
        return flushed_data
    
    def close(self):
        """Close the input"""
        self._closed = True
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class SimpleStdOutput:
    """Simple output class that uses sys.stdout directly"""
    
    def __init__(self, stdout: Optional[TextIO] = None, log_file: Optional[str] = None):
        self.stdout = stdout or sys.stdout
        self._closed = False
        self.log_file = log_file
    
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
    
    def fileno(self):
        """Return the file descriptor of stdout"""
        return self.stdout.fileno()
    
    def write(self, data: str) -> int:
        """Write to stdout"""
        if self._closed:
            raise ValueError("I/O operation on closed output")
        # Log what we're writing
        self._log(f"write: {repr(data)}")
        # Prepend tag to the data before writing
        tagged_data = f"[SimpleStdOutput] {data}"
        return self.stdout.write(tagged_data)
    
    def write_raw(self, data: str) -> int:
        """Write to stdout"""
        if self._closed:
            raise ValueError("I/O operation on closed output")
        # Log what we're writing
        self._log(f"write: {repr(data)}")
        # Prepend tag to the data before writing
        tagged_data = f"[SimpleStdOutput] {data}"
        return self.stdout.write(tagged_data)
    
    def flush(self):
        """Flush stdout"""
        if self._closed:
            raise ValueError("I/O operation on closed output")
        self._log("flush called")
        self.stdout.flush()

    def get_size(self):                                                                                                                             
        return 60                                                                                                        
                                                                                                                                                            
    def encoding(self) -> str:                                                                                                                              
        return "utf-8"                                                                                                                                      
                                                                                                                                                            
    # Implement other required methods with appropriate behavior                                                                                            
    def set_title(self, title: str) -> None:                                                                                                                
        pass  # or send to external app                                                                                                                     
                                                                                                                                                            
    def clear_title(self) -> None:                                                                                                                          
        pass                                                                                                                                                

    def close(self):
        """Close the output"""
        self._closed = True
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class SimpleStdIO:
    """Combined input/output class for simple stdio operations"""
    
    def __init__(self, stdin: Optional[TextIO] = None, stdout: Optional[TextIO] = None):
        self.log_file = '/tmp/simple_std_io.log'
        self.log(f"SimpleStdIO initialized with io_instance: {self}")
        self.input = SimpleStdInput(stdin, self.log_file)
        self.output = SimpleStdOutput(stdout, self.log_file)
    
    def log(self, message):
        """Write a log message to the log file with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
        with open(self.log_file, 'a') as f:
            f.write(f"[{timestamp}] {message}\n")
    
    def close(self):
        """Close both input and output"""
        self._log("Closing SimpleStdIO")
        self.input.close()
        self.output.close()
    
    def __enter__(self):
        self._log("SimpleStdIO context entered")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self._log("SimpleStdIO context exited")
        self.close()
