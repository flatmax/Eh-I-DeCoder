"""
Custom exceptions for standardized error handling across the application
"""

class BaseError(Exception):
    """Base exception class for all custom exceptions"""
    def __init__(self, message, details=None):
        super().__init__(message)
        self.message = message
        self.details = details or {}
    
    def to_dict(self):
        """Convert exception to dictionary for JSON serialization"""
        return {
            "error": self.message,
            "type": self.__class__.__name__,
            "details": self.details
        }

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
