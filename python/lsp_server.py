#!/usr/bin/env python3
"""
lsp_server.py - Utilities for managing the LSP server
"""
import os
import subprocess
import time
import threading

try:
    from .port_utils import is_port_in_use, find_available_port
except ImportError:
    from port_utils import is_port_in_use, find_available_port

lsp_process = None

def log_stream(stream, log_prefix):
    """Reads from a stream and logs its output."""
    try:
        for line in iter(stream.readline, ''):
            print(f"[{log_prefix}] {line.strip()}", flush=True)
    except ValueError:
        # This can happen if the stream is closed while reading
        pass
    finally:
        stream.close()

def start_lsp_server(lsp_port=None):
    """Start the LSP server using npm run and return its port"""
    global lsp_process
    
    print("LSP Python: Starting LSP server...")
    
    # Find an available port if none specified
    if lsp_port is None:
        try:
            lsp_port = find_available_port(9000)
            print(f"LSP Python: Auto-selected port {lsp_port}")
        except RuntimeError as e:
            print(f"LSP Python: Error finding available port for LSP server: {e}")
            return None
    else:
        print(f"LSP Python: Using specified port {lsp_port}")
    
    # Check if port is already in use
    if is_port_in_use(lsp_port):
        print(f"LSP Python: Port {lsp_port} is already in use - assuming LSP server is running")
        return lsp_port
    
    # Find webapp directory
    webapp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'webapp')
    print(f"LSP Python: Looking for webapp directory at: {webapp_dir}")
    
    if not os.path.exists(webapp_dir):
        print(f"LSP Python: Warning: webapp directory not found at {webapp_dir}")
        return None
    
    package_json = os.path.join(webapp_dir, 'package.json')
    print(f"LSP Python: Checking for package.json at: {package_json}")
    
    if not os.path.exists(package_json):
        print(f"LSP Python: Warning: package.json not found at {package_json}")
        return None
    
    print(f"LSP Python: Starting LSP server on port {lsp_port}...")
    try:
        # Set environment variables for the LSP server
        env = os.environ.copy()
        env['LSP_PORT'] = str(lsp_port)
        
        # Set workspace root to the repository root (parent of python directory)
        # This ensures the LSP server uses the correct base path
        repo_root = os.path.dirname(os.path.dirname(__file__))
        env['WORKSPACE_ROOT'] = repo_root
        
        print(f"LSP Python: Environment variables set - LSP_PORT={lsp_port}, WORKSPACE_ROOT={repo_root}")
        print(f"LSP Python: Executing 'npm run lsp' in directory: {webapp_dir}")
        
        lsp_process = subprocess.Popen(
            ['npm', 'run', 'lsp'],
            cwd=webapp_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        print(f"LSP Python: LSP process started with PID: {lsp_process.pid}")
        
        # Start threads to log stdout and stderr from the LSP server process
        stdout_thread = threading.Thread(target=log_stream, args=(lsp_process.stdout, "LSP-STDOUT"))
        stderr_thread = threading.Thread(target=log_stream, args=(lsp_process.stderr, "LSP-STDERR"))
        stdout_thread.daemon = True
        stderr_thread.daemon = True
        stdout_thread.start()
        stderr_thread.start()
        
        print("LSP Python: Started logging threads for LSP process output")
        
        # Give the server a moment to start.
        print("LSP Python: Waiting 3 seconds for LSP server to start...")
        time.sleep(3)
        
        # Check if process is still running
        poll_result = lsp_process.poll()
        if poll_result is None:
            print(f"LSP Python: LSP server process started successfully on port {lsp_port}")
            
            # Test if the port is actually listening
            print(f"LSP Python: Testing if port {lsp_port} is now listening...")
            if is_port_in_use(lsp_port):
                print(f"LSP Python: Confirmed - LSP server is listening on port {lsp_port}")
                return lsp_port
            else:
                print(f"LSP Python: Warning - LSP process is running but port {lsp_port} is not listening yet")
                # Give it a bit more time
                time.sleep(2)
                if is_port_in_use(lsp_port):
                    print(f"LSP Python: LSP server is now listening on port {lsp_port}")
                    return lsp_port
                else:
                    print(f"LSP Python: LSP server failed to bind to port {lsp_port}")
                    return None
        else:
            print(f"LSP Python: LSP server process failed to start or exited prematurely with code {poll_result}")
            # Wait briefly for logging threads to catch any final output
            stdout_thread.join(timeout=1)
            stderr_thread.join(timeout=1)
            return None
            
    except FileNotFoundError:
        print("LSP Python: Error: npm not found. Please install Node.js and npm.")
        return None
    except Exception as e:
        print(f"LSP Python: Error starting LSP server: {e}")
        return None

def cleanup_lsp_process():
    """Clean up the LSP process"""
    global lsp_process
    if lsp_process and lsp_process.poll() is None:
        print("LSP Python: Cleaning up LSP server...")
        print(f"LSP Python: Terminating LSP process with PID: {lsp_process.pid}")
        lsp_process.terminate()
        try:
            print("LSP Python: Waiting for LSP process to terminate...")
            lsp_process.wait(timeout=5)
            print("LSP Python: LSP process terminated successfully")
        except subprocess.TimeoutExpired:
            print("LSP Python: LSP process did not terminate gracefully, killing it...")
            lsp_process.kill()
            print("LSP Python: LSP process killed")
    else:
        if lsp_process:
            print(f"LSP Python: LSP process already terminated with code {lsp_process.poll()}")
        else:
            print("LSP Python: No LSP process to clean up")
