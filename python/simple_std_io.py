"""
Custom input/output classes for PromptSession that use simple stdio
instead of the complex prompt_toolkit input/output system.
"""

import sys
from typing import Optional, TextIO


class SimpleStdInput:
    """Simple input class that uses sys.stdin directly"""
    
    def __init__(self, stdin: Optional[TextIO] = None):
        self.stdin = stdin or sys.stdin
        self._closed = False
    
    def fileno(self):
        """Return the file descriptor of stdin"""
        return self.stdin.fileno()
    
    def read(self, count: int = -1) -> str:
        """Read from stdin"""
        if self._closed:
            raise ValueError("I/O operation on closed input")
        return self.stdin.read(count)
    
    def readline(self) -> str:
        """Read a line from stdin"""
        if self._closed:
            raise ValueError("I/O operation on closed input")
        return self.stdin.readline()
    
    def close(self):
        """Close the input"""
        self._closed = True
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class SimpleStdOutput:
    """Simple output class that uses sys.stdout directly"""
    
    def __init__(self, stdout: Optional[TextIO] = None):
        self.stdout = stdout or sys.stdout
        self._closed = False
    
    def fileno(self):
        """Return the file descriptor of stdout"""
        return self.stdout.fileno()
    
    def write(self, data: str) -> int:
        """Write to stdout"""
        if self._closed:
            raise ValueError("I/O operation on closed output")
        return self.stdout.write(data)
    
    def flush(self):
        """Flush stdout"""
        if self._closed:
            raise ValueError("I/O operation on closed output")
        self.stdout.flush()
    
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
        self.input = SimpleStdInput(stdin)
        self.output = SimpleStdOutput(stdout)
    
    def close(self):
        """Close both input and output"""
        self.input.close()
        self.output.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
