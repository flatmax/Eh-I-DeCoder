"""
Custom exceptions for standardized error handling across the application
"""
from typing import Optional, Dict, Any, Union
import json

class BaseError(Exception):
    """Base exception class for all custom exceptions"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for JSON serialization"""
        return {
            "error": self.message,
            "type": self.__class__.__name__,
            "details": self.details
        }
    
    def to_json(self) -> str:
        """Convert exception to JSON string"""
        return json.dumps(self.to_dict())
    
    def __str__(self) -> str:
        """String representation of the error"""
        if self.details:
            return f"{self.message} - Details: {self.details}"
        return self.message

class GitError(BaseError):
    """Raised when Git operations fail"""
    pass

class GitRepositoryError(GitError):
    """Raised when Git repository is not available or invalid"""
    pass

class FileOperationError(BaseError):
    """Raised when file operations fail"""
    pass

class ProcessError(BaseError):
    """Raised when external process operations fail"""
    pass

class ConnectionError(BaseError):
    """Raised when connection-related operations fail"""
    pass

class ConfigurationError(BaseError):
    """Raised when configuration is invalid"""
    pass

class LSPError(BaseError):
    """Raised when LSP operations fail"""
    pass

class WebappError(BaseError):
    """Raised when webapp operations fail"""
    pass

class ValidationError(BaseError):
    """Raised when validation fails"""
    pass

# Error response helper
def create_error_response(error: Union[BaseError, Exception]) -> Dict[str, Any]:
    """Create a standardized error response dictionary"""
    if isinstance(error, BaseError):
        return error.to_dict()
    else:
        return {
            "error": str(error),
            "type": error.__class__.__name__,
            "details": {}
        }
