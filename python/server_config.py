#!/usr/bin/env python3
"""
server_config.py - Centralized server configuration management
"""
import argparse
import os
import sys
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

@dataclass
class ServerConfig:
    """Centralized configuration for all server components"""
    
    # Core server settings
    aider_port: int = 8999
    webapp_port: int = 9876
    lsp_port: Optional[int] = None
    
    # Feature flags
    no_browser: bool = False
    no_lsp: bool = False
    
    # Aider arguments (passed through)
    aider_args: List[str] = field(default_factory=list)
    
    # Derived paths
    repo_root: str = field(init=False)
    webapp_dir: str = field(init=False)
    
    # Runtime state
    actual_aider_port: Optional[int] = field(default=None, init=False)
    actual_webapp_port: Optional[int] = field(default=None, init=False)
    actual_lsp_port: Optional[int] = field(default=None, init=False)
    
    def __post_init__(self):
        """Initialize derived paths after object creation"""
        # Set repo root to parent of python directory
        python_dir = os.path.dirname(__file__)
        self.repo_root = os.path.dirname(python_dir)
        
        # Set webapp directory
        self.webapp_dir = os.path.join(self.repo_root, 'webapp')
    
    @classmethod
    def from_args(cls, args: Optional[List[str]] = None) -> 'ServerConfig':
        """Create configuration from command line arguments"""
        if args is None:
            args = sys.argv[1:]
        
        parser = argparse.ArgumentParser(
            description="Run Aider with JSON-RPC server",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  # Start with default settings
  aider-server --no-show-model-warnings --no-auto-commits
  
  # Specify different ports
  aider-server --port 8080 --webapp-port 3000 --lsp-port 9001
  
  # Disable LSP features
  aider-server --no-lsp
  
  # Prevent automatic browser opening
  aider-server --no-browser
  
  # Pass Aider arguments (model, API keys, etc.)
  aider-server --model deepseek --api-key deepseek=<your-key>
  aider-server --model gpt-4 --api-key openai=<your-key>
  
  # Combine server options with Aider arguments
  aider-server --port 8080 --no-browser --model gpt-4 --api-key openai=<your-key>
            """
        )
        
        # Server configuration arguments
        parser.add_argument(
            "--port", 
            type=int, 
            default=8999, 
            help="Port for JSON-RPC server (default: 8999)"
        )
        parser.add_argument(
            "--webapp-port", 
            type=int, 
            default=9876, 
            help="Port for webapp dev server (default: 9876)"
        )
        parser.add_argument(
            "--lsp-port", 
            type=int, 
            help="Port for LSP server (auto-detected if not specified)"
        )
        parser.add_argument(
            "--no-browser", 
            action="store_true", 
            help="Don't open browser automatically"
        )
        parser.add_argument(
            "--no-lsp", 
            action="store_true", 
            help="Don't start LSP server"
        )
        
        # Parse known args, leaving the rest for Aider
        parsed_args, unknown_args = parser.parse_known_args(args)
        
        return cls(
            aider_port=parsed_args.port,
            webapp_port=parsed_args.webapp_port,
            lsp_port=parsed_args.lsp_port,
            no_browser=parsed_args.no_browser,
            no_lsp=parsed_args.no_lsp,
            aider_args=unknown_args
        )
    
    def get_webapp_config(self) -> Dict[str, Any]:
        """Get configuration for webapp server"""
        return {
            'webapp_dir': self.webapp_dir,
            'port': self.actual_webapp_port or self.webapp_port,
            'aider_port': self.actual_aider_port or self.aider_port,
            'lsp_port': self.actual_lsp_port,
            'no_browser': self.no_browser
        }
    
    def get_lsp_config(self) -> Dict[str, Any]:
        """Get configuration for LSP server"""
        return {
            'webapp_dir': self.webapp_dir,
            'port': self.actual_lsp_port or self.lsp_port,
            'workspace_root': self.repo_root,
            'enabled': not self.no_lsp
        }
    
    def get_aider_config(self) -> Dict[str, Any]:
        """Get configuration for Aider server"""
        return {
            'port': self.actual_aider_port or self.aider_port,
            'args': self.aider_args
        }
    
    def update_actual_ports(self, aider_port: Optional[int] = None, 
                           webapp_port: Optional[int] = None, 
                           lsp_port: Optional[int] = None):
        """Update actual ports used by servers"""
        if aider_port is not None:
            self.actual_aider_port = aider_port
        if webapp_port is not None:
            self.actual_webapp_port = webapp_port
        if lsp_port is not None:
            self.actual_lsp_port = lsp_port
    
    def get_browser_url(self) -> str:
        """Get the URL to open in browser"""
        webapp_port = self.actual_webapp_port or self.webapp_port
        aider_port = self.actual_aider_port or self.aider_port
        lsp_port = self.actual_lsp_port
        
        url = f"http://localhost:{webapp_port}/?port={aider_port}"
        if lsp_port:
            url += f"&lsp={lsp_port}"
        
        return url
    
    def should_open_browser(self) -> bool:
        """Check if browser should be opened"""
        return not self.no_browser
    
    def is_lsp_enabled(self) -> bool:
        """Check if LSP server should be started"""
        return not self.no_lsp
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of errors"""
        errors = []
        
        # Check port ranges
        if not (1024 <= self.aider_port <= 65535):
            errors.append(f"Aider port {self.aider_port} must be between 1024 and 65535")
        
        if not (1024 <= self.webapp_port <= 65535):
            errors.append(f"Webapp port {self.webapp_port} must be between 1024 and 65535")
        
        if self.lsp_port is not None and not (1024 <= self.lsp_port <= 65535):
            errors.append(f"LSP port {self.lsp_port} must be between 1024 and 65535")
        
        # Check for port conflicts
        ports = [self.aider_port, self.webapp_port]
        if self.lsp_port is not None:
            ports.append(self.lsp_port)
        
        if len(ports) != len(set(ports)):
            errors.append("Port conflict: All server ports must be different")
        
        # Check if webapp directory exists
        if not os.path.exists(self.webapp_dir):
            errors.append(f"Webapp directory not found: {self.webapp_dir}")
        
        # Check if package.json exists
        package_json = os.path.join(self.webapp_dir, 'package.json')
        if not os.path.exists(package_json):
            errors.append(f"package.json not found: {package_json}")
        
        return errors
    
    def print_summary(self):
        """Print configuration summary"""
        print(f"Starting servers on ports: Aider={self.actual_aider_port or self.aider_port}, Webapp={self.actual_webapp_port or self.webapp_port}", end="")
        if self.is_lsp_enabled():
            lsp_port = self.actual_lsp_port or self.lsp_port or "auto"
            print(f", LSP={lsp_port}")
        else:
            print(" (LSP disabled)")
