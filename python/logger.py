import logging
import os
from datetime import datetime
import inspect
import traceback

class Logger:
    """Centralized logger for the application."""
    
    _loggers = {}  # Cache of logger instances
    DEFAULT_LOG_DIR = '/tmp'
    DEFAULT_LOGGER_NAME = 'app'
    
    @classmethod
    def configure(cls, log_dir=None, default_name=None):
        """Configure global logger settings
        
        Args:
            log_dir (str): Directory to store log files
            default_name (str): Default logger name when none specified
        """
        if log_dir:
            cls.DEFAULT_LOG_DIR = log_dir
            
        if default_name:
            cls.DEFAULT_LOGGER_NAME = default_name
    
    @classmethod
    def get_logger(cls, name=None, log_file=None):
        """Get a logger instance by name.
        
        Args:
            name (str): Logger name, defaults to the calling class name
            log_file (str): Path to log file, defaults to /tmp/{name}.log
            
        Returns:
            Logger: A configured logger instance
        """
        # If name is not provided, try to determine it from the calling class
        if name is None:
            # Walk up the stack to find a reasonable logger name
            stack = inspect.stack()
            
            # Start from 2 to skip this function and its caller
            for frame_info in stack[2:]:
                # Try to get self argument from locals
                local_self = frame_info.frame.f_locals.get('self')
                if local_self is not None:
                    name = local_self.__class__.__name__
                    break
                
                # Try the module name
                module_name = frame_info.frame.f_globals.get('__name__')
                if module_name and module_name != '__main__':
                    name = module_name.split('.')[-1]  # Take the last part of the module name
                    break
            
            # If we still don't have a name, use the default
            if name is None:
                name = cls.DEFAULT_LOGGER_NAME
        
        # Check if we already have a logger for this name
        if name in cls._loggers:
            return cls._loggers[name]
        
        # Create a new logger
        logger = logging.getLogger(name)
        logger.setLevel(logging.DEBUG)
        
        # Determine log file if not provided
        if log_file is None:
            log_file = os.path.join(cls.DEFAULT_LOG_DIR, f"{name.lower()}.log")
        
        # Create file handler
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        
        # Create console handler with a higher log level
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.WARNING)  # Only warnings and errors to console
        
        # Create formatter and add it to the handlers
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)
        
        # Add the handlers to the logger
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        
        # Store in cache
        cls._loggers[name] = logger
        
        return logger
    
    @classmethod
    def log(cls, message, level='info', name=None, log_file=None):
        """Log a message with the specified level.
        
        Args:
            message (str): The message to log
            level (str): Log level (debug, info, warning, error, critical)
            name (str): Logger name (optional)
            log_file (str): Path to log file (optional)
        """
        logger = cls.get_logger(name, log_file)
        
        level = level.lower()
        if level == 'debug':
            logger.debug(message)
        elif level == 'info':
            logger.info(message)
        elif level == 'warning':
            logger.warning(message)
        elif level == 'error':
            logger.error(message)
        elif level == 'critical':
            logger.critical(message)
        else:
            logger.info(message)  # Default to info level
            
    @classmethod
    def debug(cls, message, name=None, log_file=None):
        cls.log(message, 'debug', name, log_file)
        
    @classmethod
    def info(cls, message, name=None, log_file=None):
        cls.log(message, 'info', name, log_file)
        
    @classmethod
    def warning(cls, message, name=None, log_file=None):
        cls.log(message, 'warning', name, log_file)
        
    @classmethod
    def error(cls, message, name=None, log_file=None):
        cls.log(message, 'error', name, log_file)
        
    @classmethod
    def critical(cls, message, name=None, log_file=None):
        cls.log(message, 'critical', name, log_file)
    
    @classmethod
    def register_class(cls, class_instance, log_file=None):
        """Register a class to use a specific logger
        
        Args:
            class_instance: The class instance to register
            log_file: Optional specific log file path
        """
        class_name = class_instance.__class__.__name__
        
        if log_file is None:
            log_file = os.path.join(cls.DEFAULT_LOG_DIR, f"{class_name.lower()}.log")
            
        # Create and cache logger for this class
        cls.get_logger(class_name, log_file)
        return True
