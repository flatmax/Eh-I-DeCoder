#!/usr/bin/env python3
"""
process_manager.py - Simplified process management utilities
"""
import os
import subprocess
import time
import threading
from contextlib import contextmanager

try:
    from .exceptions import ProcessError
except ImportError:
    from exceptions import ProcessError

class ProcessManager:
    """Manages external processes with simplified patterns"""
    
    def __init__(self, name, command, args=None, cwd=None, env_vars=None):
        self.name = name
        self.command = command
        self.args = args or []
        self.cwd = cwd
        self.env_vars = env_vars or {}
        self.process = None
    
    def start(self, startup_delay=3, check_port=None):
        """Start the process with optional port checking"""
        if self.is_running():
            return True
        
        try:
            env = {**os.environ, **self.env_vars}
            self.process = subprocess.Popen(
                [self.command] + self.args,
                cwd=self.cwd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            self._start_logging()
            
            if startup_delay > 0:
                time.sleep(startup_delay)
            
            if not self.is_running():
                print(f"{self.name}: Failed to start")
                raise ProcessError(f"{self.name} failed to start")
                
            if check_port:
                return self._check_port(check_port)
                
            return True
                
        except FileNotFoundError:
            error_msg = f"{self.name}: Error: {self.command} not found"
            print(error_msg)
            raise ProcessError(error_msg)
        except Exception as e:
            error_msg = f"{self.name}: Error: {e}"
            print(error_msg)
            raise ProcessError(error_msg)
    
    def _check_port(self, port):
        """Check if process is listening on port"""
        try:
            from .port_utils import is_port_in_use
        except ImportError:
            from port_utils import is_port_in_use
        
        for _ in range(2):  # Try twice
            if is_port_in_use(port):
                return True
            time.sleep(2)
        
        error_msg = f"{self.name}: Failed to bind to port {port}"
        print(error_msg)
        raise ProcessError(error_msg)
    
    def _start_logging(self):
        """Start logging threads for stdout/stderr"""
        for stream, label in [(self.process.stdout, 'OUT'), (self.process.stderr, 'ERR')]:
            thread = threading.Thread(
                target=lambda s, l: [print(f"[{self.name}-{l}] {line.strip()}") 
                                    for line in iter(s.readline, '')],
                args=(stream, label),
                daemon=True
            )
            thread.start()
    
    def is_running(self):
        """Check if process is running"""
        return self.process and self.process.poll() is None
    
    def cleanup(self, timeout=5):
        """Clean up the process"""
        if not self.is_running():
            return
        
        try:
            self.process.terminate()
            self.process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            print(f"{self.name}: Force killing...")
            try:
                self.process.kill()
                self.process.wait(timeout=2)
            except Exception as e:
                print(f"{self.name}: Failed to kill process: {e}")
        except Exception as e:
            print(f"{self.name}: Cleanup error: {e}")
        finally:
            self.process = None

class NPMProcessManager(ProcessManager):
    """Specialized ProcessManager for npm processes"""
    
    def __init__(self, name, script, cwd, port=None):
        env_vars = {'PORT': str(port), 'LSP_PORT': str(port)} if port else {}
        super().__init__(name, 'npm', ['run', script], cwd, env_vars)
        self.port = port
    
    def start_with_port_check(self, startup_delay=3):
        """Start npm process and check port"""
        if not self.port:
            return self.start(startup_delay)
            
        try:
            from .port_utils import is_port_in_use
        except ImportError:
            from port_utils import is_port_in_use
        
        if is_port_in_use(self.port):
            return True
        
        try:
            return self.start(startup_delay, self.port)
        except ProcessError:
            # Re-raise with context
            raise

class WebappProcessManager(NPMProcessManager):
    """Webapp dev server manager"""
    
    def __init__(self, webapp_dir, port=9876):
        super().__init__("Webapp Dev Server", 'start', webapp_dir, port)
    
    def start_dev_server(self):
        """Start the webapp development server"""
        for path in [self.cwd, os.path.join(self.cwd, 'package.json')]:
            if not os.path.exists(path):
                error_msg = f"{self.name}: Missing {path}"
                print(error_msg)
                raise ProcessError(error_msg)
        
        try:
            return self.start_with_port_check()
        except ProcessError:
            # Re-raise with context
            raise

class LSPProcessManager(NPMProcessManager):
    """LSP server manager"""
    
    def __init__(self, webapp_dir, lsp_port, workspace_root):
        super().__init__("LSP Server", 'lsp', webapp_dir, lsp_port)
        self.env_vars['WORKSPACE_ROOT'] = workspace_root
    
    def start_lsp_server(self):
        """Start the LSP server"""
        for path in [self.cwd, os.path.join(self.cwd, 'package.json')]:
            if not os.path.exists(path):
                error_msg = f"{self.name}: Missing {path}"
                print(error_msg)
                raise ProcessError(error_msg)
        
        try:
            success = self.start_with_port_check()
            return self.port if success else None
        except ProcessError:
            # Return None instead of re-raising for LSP (optional component)
            return None
