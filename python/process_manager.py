#!/usr/bin/env python3
"""
process_manager.py - Shared utilities for managing external processes
"""
import os
import subprocess
import time
import threading

class ProcessManager:
    """Manages external processes with common patterns for startup, monitoring, and cleanup"""
    
    def __init__(self, name, command, args=None, cwd=None, env_vars=None):
        self.name = name
        self.command = command
        self.args = args or []
        self.cwd = cwd
        self.env_vars = env_vars or {}
        self.process = None
        self.logging_threads = []
    
    def start(self, startup_delay=3, check_port=None):
        """
        Start the process with optional port checking
        
        Args:
            startup_delay: Time to wait after starting before checking status
            check_port: Port to check if process is listening (optional)
        
        Returns:
            bool: True if process started successfully, False otherwise
        """
        if self.is_running():
            print(f"{self.name}: Process already running")
            return True
        
        print(f"{self.name}: Starting process...")
        
        try:
            # Prepare environment
            env = os.environ.copy()
            env.update(self.env_vars)
            
            # Start process
            self.process = subprocess.Popen(
                [self.command] + self.args,
                cwd=self.cwd,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            print(f"{self.name}: Process started with PID: {self.process.pid}")
            
            # Set up logging threads
            self._setup_logging()
            
            # Give the process time to start
            if startup_delay > 0:
                print(f"{self.name}: Waiting {startup_delay} seconds for process to start...")
                time.sleep(startup_delay)
            
            # Check if process is still running
            if self.process.poll() is None:
                print(f"{self.name}: Process started successfully")
                
                # Optional port check
                if check_port:
                    return self._check_port_listening(check_port)
                
                return True
            else:
                print(f"{self.name}: Process failed to start or exited prematurely")
                self._cleanup_logging_threads()
                return False
                
        except FileNotFoundError:
            print(f"{self.name}: Error: {self.command} not found. Please install the required software.")
            return False
        except Exception as e:
            print(f"{self.name}: Error starting process: {e}")
            return False
    
    def _check_port_listening(self, port):
        """Check if the process is listening on the specified port"""
        try:
            from .port_utils import is_port_in_use
        except ImportError:
            from port_utils import is_port_in_use
        
        print(f"{self.name}: Testing if port {port} is listening...")
        if is_port_in_use(port):
            print(f"{self.name}: Confirmed - process is listening on port {port}")
            return True
        else:
            print(f"{self.name}: Warning - process is running but port {port} is not listening yet")
            # Give it a bit more time
            time.sleep(2)
            if is_port_in_use(port):
                print(f"{self.name}: Process is now listening on port {port}")
                return True
            else:
                print(f"{self.name}: Process failed to bind to port {port}")
                return False
    
    def _setup_logging(self):
        """Set up logging threads for stdout and stderr"""
        if self.process:
            stdout_thread = threading.Thread(
                target=self._log_stream, 
                args=(self.process.stdout, f"{self.name}-STDOUT")
            )
            stderr_thread = threading.Thread(
                target=self._log_stream, 
                args=(self.process.stderr, f"{self.name}-STDERR")
            )
            
            stdout_thread.daemon = True
            stderr_thread.daemon = True
            
            stdout_thread.start()
            stderr_thread.start()
            
            self.logging_threads = [stdout_thread, stderr_thread]
            print(f"{self.name}: Started logging threads for process output")
    
    def _log_stream(self, stream, log_prefix):
        """Reads from a stream and logs its output"""
        try:
            for line in iter(stream.readline, ''):
                print(f"[{log_prefix}] {line.strip()}", flush=True)
        except ValueError:
            # This can happen if the stream is closed while reading
            pass
        finally:
            stream.close()
    
    def _cleanup_logging_threads(self, timeout=1):
        """Clean up logging threads"""
        for thread in self.logging_threads:
            if thread.is_alive():
                thread.join(timeout=timeout)
        self.logging_threads = []
    
    def is_running(self):
        """Check if the process is currently running"""
        return self.process is not None and self.process.poll() is None
    
    def get_pid(self):
        """Get the process ID if running"""
        return self.process.pid if self.process else None
    
    def cleanup(self, timeout=5):
        """Clean up the process and associated resources"""
        if not self.is_running():
            if self.process:
                print(f"{self.name}: Process already terminated with code {self.process.poll()}")
            else:
                print(f"{self.name}: No process to clean up")
            return
        
        print(f"{self.name}: Cleaning up process...")
        print(f"{self.name}: Terminating process with PID: {self.process.pid}")
        
        try:
            self.process.terminate()
            print(f"{self.name}: Waiting for process to terminate...")
            self.process.wait(timeout=timeout)
            print(f"{self.name}: Process terminated successfully")
        except subprocess.TimeoutExpired:
            print(f"{self.name}: Process did not terminate gracefully, killing it...")
            self.process.kill()
            print(f"{self.name}: Process killed")
        except Exception as e:
            print(f"{self.name}: Error during cleanup: {e}")
        finally:
            # Clean up logging threads
            self._cleanup_logging_threads()
            self.process = None

class NPMProcessManager(ProcessManager):
    """Specialized ProcessManager for npm processes"""
    
    def __init__(self, name, script, cwd, port=None):
        super().__init__(name, 'npm', ['run', script], cwd)
        if port:
            self.env_vars['PORT'] = str(port)
            self.env_vars['LSP_PORT'] = str(port)
    
    def start_with_port_check(self, port, startup_delay=3):
        """Start npm process and check if it's listening on the specified port"""
        try:
            from .port_utils import is_port_in_use
        except ImportError:
            from port_utils import is_port_in_use
        
        if is_port_in_use(port):
            print(f"{self.name}: Port {port} is already in use - assuming server is running")
            return True
        
        return self.start(startup_delay=startup_delay, check_port=port)

class WebappProcessManager(NPMProcessManager):
    """Specialized ProcessManager for webapp dev server"""
    
    def __init__(self, webapp_dir, port=9876):
        super().__init__("Webapp Dev Server", 'start', webapp_dir, port)
    
    def start_dev_server(self):
        """Start the webapp development server"""
        # Check if webapp directory and package.json exist
        if not os.path.exists(self.cwd):
            print(f"{self.name}: Warning: webapp directory not found at {self.cwd}")
            return False
        
        package_json = os.path.join(self.cwd, 'package.json')
        if not os.path.exists(package_json):
            print(f"{self.name}: Warning: package.json not found at {package_json}")
            return False
        
        port = int(self.env_vars.get('PORT', 9876))
        return self.start_with_port_check(port)

class LSPProcessManager(NPMProcessManager):
    """Specialized ProcessManager for LSP server"""
    
    def __init__(self, webapp_dir, lsp_port, workspace_root):
        super().__init__("LSP Server", 'lsp', webapp_dir, lsp_port)
        self.env_vars['LSP_PORT'] = str(lsp_port)
        self.env_vars['WORKSPACE_ROOT'] = workspace_root
    
    def start_lsp_server(self):
        """Start the LSP server"""
        # Check if webapp directory and package.json exist
        if not os.path.exists(self.cwd):
            print(f"{self.name}: Warning: webapp directory not found at {self.cwd}")
            return None
        
        package_json = os.path.join(self.cwd, 'package.json')
        if not os.path.exists(package_json):
            print(f"{self.name}: Warning: package.json not found at {package_json}")
            return None
        
        lsp_port = int(self.env_vars['LSP_PORT'])
        workspace_root = self.env_vars['WORKSPACE_ROOT']
        
        print(f"{self.name}: Environment variables set - LSP_PORT={lsp_port}, WORKSPACE_ROOT={workspace_root}")
        print(f"{self.name}: Executing 'npm run lsp' in directory: {self.cwd}")
        
        if self.start_with_port_check(lsp_port):
            return lsp_port
        else:
            return None
