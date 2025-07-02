import os
import asyncio

try:
    from .base_wrapper import BaseWrapper
    from .logger import Logger
    from .exceptions import FileOperationError
except ImportError:
    from base_wrapper import BaseWrapper
    from logger import Logger
    from exceptions import FileOperationError

class ChatHistory(BaseWrapper):
    """Handles chat history file operations for the webapp"""
    
    def __init__(self, chat_history_file='.aider.chat.history.md'):
        super().__init__()
        
        # If the path is relative, make it relative to the repository root
        if not os.path.isabs(chat_history_file):
            # Find the repository root by looking for .git directory
            repo_root = self._find_repo_root()
            if repo_root:
                self.chat_history_file = os.path.join(repo_root, chat_history_file)
            else:
                # Fallback to current directory if no repo root found
                self.chat_history_file = os.path.abspath(chat_history_file)
        else:
            self.chat_history_file = chat_history_file
            
        self.chunk_size = 50000  # Characters per chunk
    
    def _find_repo_root(self):
        """Find the repository root by looking for .git directory"""
        current_dir = os.getcwd()
        
        while current_dir != os.path.dirname(current_dir):  # Stop at filesystem root
            if os.path.exists(os.path.join(current_dir, '.git')):
                return current_dir
            current_dir = os.path.dirname(current_dir)
        
        return None
    
    def get_file_size(self):
        """Get the size of the chat history file"""
        try:
            if os.path.exists(self.chat_history_file):
                size = os.path.getsize(self.chat_history_file)
                return size
            return 0
        except Exception as e:
            Logger.error(f"Error getting file size: {e}")
            raise FileOperationError(f"Error getting file size: {e}")
    
    def load_chunk(self, start_pos=None, chunk_size=None):
        """Load a chunk of the chat history file from the end or a specific position
        
        Args:
            start_pos: Position to start reading from (None means from end)
            chunk_size: Size of chunk to read (None uses default)
            
        Returns:
            dict with 'content', 'start_pos', 'end_pos', 'has_more', 'file_size'
        """
        try:
            if not os.path.exists(self.chat_history_file):
                return {
                    'content': '',
                    'start_pos': 0,
                    'end_pos': 0,
                    'has_more': False,
                    'file_size': 0
                }
            
            file_size = self.get_file_size()
            
            if file_size == 0:
                return {
                    'content': '',
                    'start_pos': 0,
                    'end_pos': 0,
                    'has_more': False,
                    'file_size': 0
                }
            
            chunk_size = chunk_size or self.chunk_size
            
            with open(self.chat_history_file, 'r', encoding='utf-8') as f:
                if start_pos is None:
                    # Load from the end
                    start_pos = max(0, file_size - chunk_size)
                
                # Ensure start_pos is within bounds
                start_pos = max(0, min(start_pos, file_size))
                
                f.seek(start_pos)
                content = f.read(chunk_size)
                
                # Calculate actual end position
                end_pos = min(start_pos + len(content.encode('utf-8')), file_size)
                
                # Check if there's more content before this chunk
                has_more = start_pos > 0
                
                result = {
                    'content': content,
                    'start_pos': start_pos,
                    'end_pos': end_pos,
                    'has_more': has_more,
                    'file_size': file_size
                }
                
                return result
                
        except Exception as e:
            Logger.error(f"Error loading chat history chunk: {e}")
            import traceback
            Logger.error(f"Traceback: {traceback.format_exc()}")
            raise FileOperationError(f"Error loading chat history: {str(e)}")
    
    def load_previous_chunk(self, current_start_pos, chunk_size=None):
        """Loa the previous chunk before the current start position
        
        Args:
            current_start_pos: Current start position
            chunk_size: Size of chunk to read (None uses default)
            
        Returns:
            dict with chunk data
        """
        chunk_size = chunk_size or self.chunk_size
        
        if current_start_pos <= 0:
            return {
                'content': '',
                'start_pos': 0,
                'end_pos': 0,
                'has_more': False,
                'file_size': self.get_file_size()
            }
        
        # Calculate new start position
        new_start_pos = max(0, current_start_pos - chunk_size)
        
        return self.load_chunk(new_start_pos, chunk_size)
    
    def get_latest_content(self, max_chars=None):
        """Get the latest content from the end of the file
        
        Args:
            max_chars: Maximum characters to return (None uses default chunk size)
            
        Returns:
            dict with latest content
        """
        max_chars = max_chars or self.chunk_size
        return self.load_chunk(None, max_chars)
    
    def load_previous_chunk_remote(self, current_start_pos, chunk_size=None):
        """Remote wrapper for load_previous_chunk"""
        return self.load_previous_chunk(current_start_pos, chunk_size)
    
    def search_content(self, query, max_results=100):
        """Search for content in the chat history file
        
        Args:
            query: Search query string
            max_results: Maximum number of results to return
            
        Returns:
            list of dicts with 'line_number', 'content', 'position'
        """
        try:
            if not os.path.exists(self.chat_history_file):
                return []
            
            results = []
            query_lower = query.lower()
            
            with open(self.chat_history_file, 'r', encoding='utf-8') as f:
                line_number = 0
                position = 0
                
                for line in f:
                    line_number += 1
                    if query_lower in line.lower():
                        results.append({
                            'line_number': line_number,
                            'content': line.strip(),
                            'position': position
                        })
                        
                        if len(results) >= max_results:
                            break
                    
                    position += len(line.encode('utf-8'))
            
            return results
            
        except Exception as e:
            Logger.error(f"Error searching chat history: {e}")
            import traceback
            Logger.error(f"Traceback: {traceback.format_exc()}")
            raise FileOperationError(f"Error searching chat history: {e}")
