import os
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
try:
    from .exceptions import GitError, GitRepositoryError
except ImportError:
    from exceptions import GitError, GitRepositoryError


class GitChangeHandler(FileSystemEventHandler):
    """File system event handler that triggers on Git repository changes"""
    
    def __init__(self, repo_instance):
        super().__init__()
        self.repo = repo_instance
        self.last_event_time = 0
        self.debounce_interval = 0.5  # seconds
    
    def on_any_event(self, event):
        # Only respond to events that actually change files
        # Ignore read-only events like 'opened', 'closed', 'accessed'
        if event.event_type in ['opened', 'closed', 'accessed', 'closed_no_write']:
            return
            
        # Ignore directory modification events - these are too noisy
        if event.event_type == 'modified' and event.is_directory:
            return
            
        # Ignore .aider.chat.history.md file
        if ".aider.chat.history.md" in event.src_path:
            return
            
        # Handle events in .git directory with special filtering
        if ".git" in event.src_path:
            # Ignore .lock files ONLY in .git directory - these are temporary Git operation files
            if event.src_path.endswith('.lock'):
                return
                
            # Monitor important git files that indicate actual repository state changes
            important_git_patterns = [
                "index",           # Staging area changes
                "HEAD",            # Branch/commit changes
                "/refs/",          # Branch reference changes
                "/logs/",          # Reference logs
                "COMMIT_EDITMSG",  # Commit message file
                "MERGE_HEAD",      # Merge state
                "REBASE_HEAD"      # Rebase state
            ]
            
            # Check if this is an important git file
            is_important = any(pattern in event.src_path for pattern in important_git_patterns)
            if not is_important:
                return
        else:
            # For files outside .git directory, this could be a file save event
            # Check if it's a file modification (not creation or deletion)
            if event.event_type == 'modified' and not event.is_directory:
                # Notify MergeEditor about the file save
                self.repo._notify_file_saved(event.src_path)
        
        # Debounce events to avoid multiple rapid notifications
        current_time = time.time()
        if current_time - self.last_event_time < self.debounce_interval:
            return
            
        self.last_event_time = current_time
        self.repo._notify_git_change()


class GitMonitor:
    """Handles monitoring Git repository changes using file system events"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
        self._observer = None
        self._event_handler = None
    
    def start_git_monitor(self, interval=None):
        """Start monitoring the git repository for changes"""
        try:
            if not self.repo.repo:
                raise GitRepositoryError("No git repository available")
                
            if self._observer and self._observer.is_alive():
                return {"status": "info", "message": "Git monitor already running"}
                
            # Create the event handler and file system observer
            self._event_handler = GitChangeHandler(self.repo)
            self._observer = Observer()
            
            # Schedule monitoring for both the git directory and working tree
            working_tree_path = self.repo.repo.working_tree_dir
            git_dir_path = self.repo.repo.git_dir
            
            # Monitor the working directory
            self._observer.schedule(self._event_handler, working_tree_path, recursive=True)
            
            # Also monitor the .git directory for index changes
            self._observer.schedule(self._event_handler, git_dir_path, recursive=True)
            
            # Start the observer
            self._observer.start()
            return {"status": "success", "message": "Git monitor started"}
            
        except Exception as e:
            if isinstance(e, GitRepositoryError):
                raise
            raise GitError(f"Error starting git monitor: {e}")
            
    def stop_git_monitor(self):
        """Stop the git repository monitor"""
        try:
            if not self._observer or not self._observer.is_alive():
                return {"status": "info", "message": "Git monitor not running"}
                
            self._observer.stop()
            self._observer.join(timeout=1.0)
            self._observer = None
            self._event_handler = None
            return {"status": "success", "message": "Git monitor stopped"}
            
        except Exception as e:
            raise GitError(f"Error stopping git monitor: {e}")
