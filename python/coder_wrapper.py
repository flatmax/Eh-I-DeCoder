import asyncio

class CoderWrapper:
    """
    A simple wrapper for Aider's Coder class that provides access to its run method.
    """
    
    def __init__(self, coder):
        """
        Initialize the wrapper with a Coder instance.
        
        Args:
            coder: An instance of Aider's Coder class
        """
        self.coder = coder
        
    def run(self, with_message=None, preproc=True):
        """
        Call the coder's run method with the provided arguments in a non-blocking way.
        
        Args:
            with_message: Optional message to process
            preproc: Whether to preprocess the message (default: True)
            
        Returns:
            None - the call is processed asynchronously
        """
        # Create a task that runs in the background
        asyncio.create_task(self._run_async(with_message, preproc))
        return None  # Return immediately
        
    async def _run_async(self, with_message=None, preproc=True):
        """
        Internal async method to call the coder's run method.
        
        Args:
            with_message: Optional message to process
            preproc: Whether to preprocess the message (default: True)
        """
        return self.coder.run(with_message=with_message, preproc=preproc)
