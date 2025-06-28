#!/usr/bin/env python3
"""
lsp_server.py - Utilities for managing the LSP server
"""
import os
import subprocess
import time
import socket

lsp_process = None

def is_port_in_use(port):
    """Check if a port is already in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return False
        except OSError:
            return True

def find_available_port(start_port=9000, max_attempts=1000):
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('', port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"Could not find an available port in range {start_port}-{start_port + max_attempts}")

def start_lsp_server(lsp_port=None):
    """Start the LSP server using npm run and return its port"""
    global lsp_process
    
    # Find an available port if none specified
    if lsp_port is None:
        try:
            lsp_port = find_available_port(9000)
        except RuntimeError as e:
            print(f"Error finding available port for LSP server: {e}")
            return None
    
    # Check if port is already in use
    if is_port_in_use(lsp_port):
        print(f"Port {lsp_port} is already in use - assuming LSP server is running")
        return lsp_port
    
    # Find webapp directory
    webapp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'webapp')
    if not os.path.exists(webapp_dir):
        print(f"Warning: webapp directory not found at {webapp_dir}")
        return None
    
    package_json = os.path.join(webapp_dir, 'package.json')
    if not os.path.exists(package_json):
        print(f"Warning: package.json not found at {package_json}")
        return None
    
    print(f"Starting LSP server on port {lsp_port}...")
    try:
        # Set environment variables for the LSP server
        env = os.environ.copy()
        env['LSP_PORT'] = str(lsp_port)
        env['WORKSPACE_ROOT'] = os.getcwd()
        
        lsp_process = subprocess.Popen(
            ['npm', 'run', 'lsp'],
            cwd=webapp_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Give the server a moment to start
        time.sleep(3)
        
        # Check if process is still running
        if lsp_process.poll() is None:
            print(f"LSP server started successfully on port {lsp_port}")
            return lsp_port
        else:
            stdout, stderr = lsp_process.communicate()
            print(f"npm run lsp failed:")
            print(f"stdout: {stdout}")
            print(f"stderr: {stderr}")
            return None
            
    except FileNotFoundError:
        print("Error: npm not found. Please install Node.js and npm.")
        return None
    except Exception as e:
        print(f"Error starting LSP server: {e}")
        return None

def cleanup_lsp_process():
    """Clean up the LSP process"""
    global lsp_process
    if lsp_process and lsp_process.poll() is None:
        print("Cleaning up LSP server...")
        lsp_process.terminate()
        try:
            lsp_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            lsp_process.kill()
