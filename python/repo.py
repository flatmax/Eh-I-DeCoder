import git
import os
import asyncio
import subprocess
try:
    from .base_wrapper import BaseWrapper
    from .logger import Logger
    from .git_monitor import GitMonitor
    from .git_operations import GitOperations
    from .git_search import GitSearch
    from .file_analyzer import FileAnalyzer
    from .repo_info import RepoInfo
    from .repo_history import RepoHistory
    from .repo_file_manager import RepoFileManager
    from .exceptions import GitError, GitRepositoryError, FileOperationError, create_error_response
except ImportError:
    from base_wrapper import BaseWrapper
    from logger import Logger
    from git_monitor import GitMonitor
    from git_operations import GitOperations
    from git_search import GitSearch
    from file_analyzer import FileAnalyzer
    from repo_info import RepoInfo
    from repo_history import RepoHistory
    from repo_file_manager import RepoFileManager
    from exceptions import GitError, GitRepositoryError, FileOperationError, create_error_response


class Repo(BaseWrapper):
    """Wrapper for Git repository operations using GitPython"""
    
    def __init__(self, repo_path=None):
        super().__init__()

        self.repo_path = repo_path or '.'
        self.repo = None
        self._git_change_callbacks = []
        
        # Initialize component modules
        self.git_monitor = GitMonitor(self)
        self.git_operations = GitOperations(self)
        self.git_search = GitSearch(self)
        self.file_analyzer = FileAnalyzer(self)
        self.repo_info = RepoInfo(self)
        self.repo_history = RepoHistory(self)
        self.repo_file_manager = RepoFileManager(self)
        
        self._initialize_repo()
    
    def _initialize_repo(self):
        """Initialize the Git repository"""
        try:
            # This will search up the directory tree to find a Git repository
            self.repo = git.Repo(self.repo_path, search_parent_directories=True)
            
            # Start the git monitor after initializing the repository
            self.start_git_monitor()
        except git.exc.InvalidGitRepositoryError:
            self.log(f"No Git repository found at: {self.repo_path}")
            self.repo = None
        except Exception as e:
            self.log(f"Error initializing Git repository: {e}")
            self.repo = None
    
    def _ensure_repo(self):
        """Ensure repository is available, raise exception if not"""
        if not self.repo:
            raise GitRepositoryError("No Git repository available")
    
    # Repository information methods - delegate to repo_info
    def get_repo_name(self):
        """Get the name of the repository (top-level directory name)"""
        return self.repo_info.get_repo_name()
    
    def get_repo_root(self):
        """Get the absolute path to the repository root directory"""
        return self.repo_info.get_repo_root()
    
    def get_status(self):
        """Get the current status of the repository"""
        return self.repo_info.get_status()
    
    # History methods - delegate to repo_history
    def get_commit_history(self, max_count=50, branch=None, skip=0):
        """Get commit history with detailed information - optimized for performance with pagination support"""
        return self.repo_history.get_commit_history(max_count, branch, skip)
    
    def get_branches(self):
        """Get list of all branches in the repository"""
        return self.repo_history.get_branches()
    
    def get_branch_commit(self, branch_name):
        """Get the commit hash for a specific branch"""
        return self.repo_history.get_branch_commit(branch_name)
    
    def get_changed_files(self, from_commit, to_commit):
        """Get list of files changed between two commits"""
        return self.repo_history.get_changed_files(from_commit, to_commit)
    
    # File management methods - delegate to repo_file_manager
    def create_file(self, file_path, content=""):
        """Create a new file in the repository and stage it"""
        return self.repo_file_manager.create_file(file_path, content)
    
    def get_file_content(self, file_path, version='working'):
        """Get the content of a file from either HEAD, working directory, or specific commit"""
        return self.repo_file_manager.get_file_content(file_path, version)
    
    def rename_file(self, old_path, new_path):
        """Rename a file using Git mv command"""
        try:
            self._ensure_repo()
            
            # Get the repository root
            repo_root = self.repo.working_tree_dir
            
            # Construct full paths
            old_full_path = os.path.join(repo_root, old_path)
            new_full_path = os.path.join(repo_root, new_path)
            
            # Check if the old file exists
            if not os.path.exists(old_full_path):
                raise FileOperationError(f"File does not exist: {old_path}")
            
            # Check if the new path already exists
            if os.path.exists(new_full_path):
                raise FileOperationError(f"Target file already exists: {new_path}")
            
            # Ensure the parent directory of the new path exists
            new_dir = os.path.dirname(new_full_path)
            if new_dir and not os.path.exists(new_dir):
                os.makedirs(new_dir, exist_ok=True)
            
            # Use git mv to rename the file
            try:
                # Run git mv command
                result = subprocess.run(
                    ['git', 'mv', old_path, new_path],
                    cwd=repo_root,
                    capture_output=True,
                    text=True,
                    check=True
                )
                
                self.log(f"Successfully renamed file from {old_path} to {new_path}")
                
                # Notify about the change
                self._notify_git_change()
                
                return {
                    'success': True,
                    'old_path': old_path,
                    'new_path': new_path,
                    'message': f"File renamed from {old_path} to {new_path}"
                }
                
            except subprocess.CalledProcessError as e:
                error_msg = e.stderr.strip() if e.stderr else str(e)
                raise GitError(f"Git rename failed: {error_msg}")
                
        except Exception as e:
            self.log(f"Error renaming file: {e}")
            return create_error_response(e)
    
    # File analysis methods - delegate to file_analyzer
    def get_file_line_counts(self, file_paths):
        """Get line counts for a list of files"""
        try:
            return self.file_analyzer.get_file_line_counts(file_paths)
        except Exception as e:
            return create_error_response(e)
    
    # Git operations methods - delegate to git_operations
    def save_file_content(self, file_path, content):
        """Save file content to disk in the working directory"""
        return self.git_operations.save_file_content(file_path, content)

    def delete_file(self, file_path):
        """Delete a file from the working directory"""
        return self.git_operations.delete_file(file_path)
            
    def stage_file(self, file_path):
        """Stage a specific file in the repository"""
        return self.git_operations.stage_file(file_path)
    
    def unstage_file(self, file_path):
        """Unstage a specific file in the repository"""
        return self.git_operations.unstage_file(file_path)
            
    def discard_changes(self, file_path):
        """Discard changes to a specific file in the repository by checking it out from HEAD"""
        return self.git_operations.discard_changes(file_path)
            
    def commit_file(self, file_path, commit_message):
        """Commit a specific file to the repository"""
        return self.git_operations.commit_file(file_path, commit_message)

    def commit_staged_changes(self, message="Rebase commit"):
        """Commit all staged changes"""
        return self.git_operations.commit_staged_changes(message)

    def commit_amend(self):
        """Amend the previous commit with staged changes"""
        return self.git_operations.commit_amend()

    def get_raw_git_status(self):
        """Get the raw git status output as it appears in the terminal"""
        return self.git_operations.get_raw_git_status()

    # Interactive rebase methods - delegate to git_operations
    def start_interactive_rebase(self, from_commit, to_commit):
        """Start an interactive rebase between two commits"""
        return self.git_operations.start_interactive_rebase(from_commit, to_commit)

    def get_git_editor_status(self):
        """Get comprehensive Git editor status - detects what Git is waiting for"""
        return self.git_operations.get_git_editor_status()

    def get_rebase_status(self):
        """Get the current rebase status and todo file content"""
        return self.git_operations.get_rebase_status()

    def save_git_editor_file(self, file_type, content):
        """Save content to the appropriate Git editor file"""
        return self.git_operations.save_git_editor_file(file_type, content)

    def save_rebase_todo(self, todo_content):
        """Save the rebase todo file content"""
        return self.git_operations.save_rebase_todo(todo_content)

    def execute_rebase(self, rebase_plan=None):
        """Execute the interactive rebase with the given plan or continue existing rebase"""
        return self.git_operations.execute_rebase(rebase_plan)

    def get_conflict_content(self, file_path):
        """Get the conflict content for a file (ours, theirs, and merged)"""
        return self.git_operations.get_conflict_content(file_path)

    def resolve_conflict(self, file_path, resolved_content):
        """Resolve a conflict by saving the resolved content and staging the file"""
        return self.git_operations.resolve_conflict(file_path, resolved_content)

    def continue_rebase(self):
        """Continue the rebase after resolving conflicts"""
        return self.git_operations.continue_rebase()

    def abort_rebase(self):
        """Abort the current rebase"""
        return self.git_operations.abort_rebase()
    
    # Search methods - delegate to git_search        
    def search_files(self, query, word=False, regex=False, respect_gitignore=True, ignore_case=False):
        """Search for content in repository files"""
        try:
            return self.git_search.search_files(query, word, regex, respect_gitignore, ignore_case)
        except Exception as e:
            return create_error_response(e)
    
    # Git monitoring methods - delegate to git_monitor
    def start_git_monitor(self, interval=None):
        """Start monitoring the git repository for changes"""
        try:
            return self.git_monitor.start_git_monitor(interval)
        except Exception as e:
            return create_error_response(e)
            
    def stop_git_monitor(self):
        """Stop the git repository monitor"""
        try:
            return self.git_monitor.stop_git_monitor()
        except Exception as e:
            return create_error_response(e)
    
    # Notification methods
    def _notify_git_change(self):
        """Notify RepoTree component about git state changes"""
        try:
            # Notify RepoTree using _safe_create_task - call loadGitStatus which triggers a refresh
            self._safe_create_task(self.get_call()['RepoTree.loadGitStatus']({}))
            
        except Exception as e: 
            self.log(f"Error in _notify_git_change: {e}")

    def _notify_file_saved(self, file_path):
        """Notify DiffEditor about file save events"""
        try:
            # Convert absolute path to relative path if needed
            if os.path.isabs(file_path) and self.repo:
                repo_root = self.repo.working_tree_dir
                if file_path.startswith(repo_root):
                    # Convert to relative path
                    relative_path = os.path.relpath(file_path, repo_root)
                    # Normalize path separators
                    file_path = relative_path.replace(os.sep, '/')
            
            try:
                # Notify DiffEditor using _safe_create_task
                self._safe_create_task(self.get_call()['DiffEditor.reloadIfCurrentFile']({'filePath': file_path}))
            except Exception as e:
                self.log(f"Error calling DiffEditor.reloadIfCurrentFile: {e}")
            
        except Exception as e:
            self.log(f"Error in _notify_file_saved: {e}")
