#!/usr/bin/env python3
"""
webapp_server.py - Utilities for managing the webapp development server
"""
import os
import subprocess
import webbrowser
import time
import socket

npm_process = None

def is_port_in_use(port):
    """Check if a port is already in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return False
        except OSError:
            return True

def start_npm_dev_server(webapp_port=9876):
    """Start npm dev server if not already running"""
    global npm_process
    
    if is_port_in_use(webapp_port):
        print(f"Port {webapp_port} is already in use - assuming dev server is running")
        return True
    
    # Find webapp directory
    webapp_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'webapp')
    if not os.path.exists(webapp_dir):
        print(f"Warning: webapp directory not found at {webapp_dir}")
        return False
    
    package_json = os.path.join(webapp_dir, 'package.json')
    if not os.path.exists(package_json):
        print(f"Warning: package.json not found at {package_json}")
        return False
    
    print(f"Starting npm dev server on port {webapp_port}...")
    try:
        # Set environment variable for the port
        env = os.environ.copy()
        env['PORT'] = str(webapp_port)
        
        npm_process = subprocess.Popen(
            ['npm', 'start'],
            cwd=webapp_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Give the server a moment to start
        time.sleep(3)
        
        # Check if process is still running
        if npm_process.poll() is None:
            print(f"npm dev server started successfully on port {webapp_port}")
            return True
        else:
            stdout, stderr = npm_process.communicate()
            print(f"npm start failed:")
            print(f"stdout: {stdout}")
            print(f"stderr: {stderr}")
            return False
            
    except FileNotFoundError:
        print("Error: npm not found. Please install Node.js and npm.")
        return False
    except Exception as e:
        print(f"Error starting npm dev server: {e}")
        return False

def open_browser(webapp_port=9876, aider_port=8999, lsp_port=None):
    """Open the webapp in the default browser with the aider port and optional LSP port as parameters"""
    url = f"http://localhost:{webapp_port}/?port={aider_port}"
    if lsp_port:
        url += f"&lsp={lsp_port}"
    
    print(f"Opening browser to {url}")
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"Failed to open browser: {e}")
        print(f"Please manually open: {url}")

def cleanup_npm_process():
    """Clean up the npm process"""
    global npm_process
    if npm_process and npm_process.poll() is None:
        print("Cleaning up npm dev server...")
        npm_process.terminate()
        try:
            npm_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            npm_process.kill()
