import os
import subprocess
import mimetypes
try:
    from .exceptions import GitError, GitRepositoryError
except ImportError:
    from exceptions import GitError, GitRepositoryError


class FileAnalyzer:
    """Handles file analysis operations like line counting and text file detection"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
        self._line_count_cache = {}
    
    def get_file_line_counts(self, file_paths):
        """Get line counts for a list of files"""
        try:
            if not self.repo.repo:
                raise GitRepositoryError("No Git repository available")
            
            line_counts = {}
            repo_root = self.repo.repo.working_tree_dir
            
            for file_path in file_paths:
                try:
                    # Check cache first
                    abs_path = os.path.join(repo_root, file_path)
                    
                    # Get file modification time for cache validation
                    if os.path.exists(abs_path):
                        mtime = os.path.getmtime(abs_path)
                        cache_key = f"{file_path}:{mtime}"
                        
                        if cache_key in self._line_count_cache:
                            line_counts[file_path] = self._line_count_cache[cache_key]
                            continue
                    
                    # Check if file is likely to be text
                    if not self.is_text_file(abs_path):
                        line_counts[file_path] = 0
                        continue
                    
                    # Try to get line count efficiently
                    line_count = self._count_file_lines(abs_path)
                    line_counts[file_path] = line_count
                    
                    # Cache the result
                    if os.path.exists(abs_path):
                        mtime = os.path.getmtime(abs_path)
                        cache_key = f"{file_path}:{mtime}"
                        self._line_count_cache[cache_key] = line_count
                    
                except Exception as e:
                    line_counts[file_path] = 0
            
            return line_counts
            
        except Exception as e:
            if isinstance(e, GitRepositoryError):
                raise
            raise GitError(f"Error getting file line counts: {e}")
    
    def is_text_file(self, file_path):
        """Check if a file is likely to be a text file"""
        try:
            if not os.path.exists(file_path):
                return False
            
            # Check file size - skip very large files
            file_size = os.path.getsize(file_path)
            if file_size > 10 * 1024 * 1024:  # 10MB limit
                return False
            
            # Use mimetypes to guess if it's text
            mime_type, _ = mimetypes.guess_type(file_path)
            if mime_type and mime_type.startswith('text/'):
                return True
            
            # Check common text file extensions
            text_extensions = {
                '.txt', '.py', '.js', '.html', '.css', '.json', '.xml', '.yaml', '.yml',
                '.md', '.rst', '.csv', '.tsv', '.log', '.conf', '.cfg', '.ini',
                '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
                '.c', '.cpp', '.h', '.hpp', '.java', '.cs', '.php', '.rb', '.go',
                '.rs', '.swift', '.kt', '.scala', '.clj', '.hs', '.ml', '.fs',
                '.sql', '.r', '.m', '.pl', '.lua', '.tcl', '.vim', '.el'
            }
            
            _, ext = os.path.splitext(file_path.lower())
            if ext in text_extensions:
                return True
            
            # For files without extension or unknown extensions, 
            # read a small sample to check if it's text
            try:
                with open(file_path, 'rb') as f:
                    sample = f.read(1024)  # Read first 1KB
                    # Check if sample contains mostly printable characters
                    if sample:
                        text_chars = sum(1 for byte in sample if 32 <= byte <= 126 or byte in [9, 10, 13])
                        return text_chars / len(sample) > 0.7  # 70% printable characters
            except:
                pass
            
            return False
            
        except Exception as e:
            return False
    
    def _count_file_lines(self, file_path):
        """Count lines in a file efficiently"""
        try:
            # Try using wc -l on Unix systems for speed
            if os.name != 'nt':  # Not Windows
                try:
                    result = subprocess.run(['wc', '-l', file_path], 
                                          capture_output=True, text=True, timeout=5)
                    if result.returncode == 0:
                        return int(result.stdout.split()[0])
                except (subprocess.TimeoutExpired, subprocess.SubprocessError, ValueError):
                    pass
            
            # Fallback to Python implementation
            line_count = 0
            with open(file_path, 'rb') as f:
                for line in f:
                    line_count += 1
            
            return line_count
            
        except Exception as e:
            return 0
