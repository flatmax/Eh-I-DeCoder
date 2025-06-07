import git
import os
import asyncio
from eh_i_decoder.base_wrapper import BaseWrapper
from eh_i_decoder.logger import Logger
from .git_monitor import GitMonitor
from .git_operations import GitOperations
from .git_search import GitSearch


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
        
        self._initialize_repo()
    
    def _initialize_repo(self):
        """Initialize the Git repository"""
        try:
            # This will search up the directory tree to find a Git repository
            self.repo = git.Repo(self.repo_path, search_parent_directories=True)
            self.log(f"Initialized Git repository at: {self.repo_path}")
            self.log(f"Git directory: {self.repo.git_dir}")
            self.log(f"Working directory: {self.repo.working_dir}")
            self.log(f"Repository root: {self.repo.working_tree_dir}")
            
            # Start the git monitor after initializing the repository
            self.start_git_monitor()
        except git.exc.InvalidGitRepositoryError:
            self.log(f"No Git repository found at: {self.repo_path} or in parent directories")
            self.repo = None
        except Exception as e:
            self.log(f"Error initializing Git repository: {e}")
            self.repo = None
    
    def get_repo_name(self):
        """Get the name of the repository (top-level directory name)"""
        self.log("get_repo_name method called")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.log(f"get_repo_name returning error: {error_msg}")
            return error_msg
        
        try:
            # Get the repository root directory path
            repo_root = self.repo.working_tree_dir
            if repo_root:
                # Extract just the directory name (not the full path)
                repo_name = os.path.basename(repo_root)
                self.log(f"get_repo_name returning: {repo_name}")
                return repo_name
            else:
                error_msg = {"error": "Could not determine repository root"}
                self.log(f"get_repo_name returning error: {error_msg}")
                return error_msg
        except Exception as e:
            error_msg = {"error": f"Error getting repository name: {e}"}
            self.log(f"get_repo_name returning error: {error_msg}")
            return error_msg
    
    def get_status(self):
        """Get the current status of the repository"""
        self.log("get_status method called")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.log(f"get_status returning error: {error_msg}")
            return error_msg
        
        try:
            # Log the working directory for debugging
            self.log(f"Repository working directory: {self.repo.working_dir}")
            self.log(f"Repository root directory: {self.repo.working_tree_dir}")
            
            # Get the status information
            branch_name = self.repo.active_branch.name
            is_dirty = self.repo.is_dirty()
            untracked_files = self.repo.untracked_files
            modified_files = [item.a_path for item in self.repo.index.diff(None)]
            staged_files = [item.a_path for item in self.repo.index.diff("HEAD")]
            
            # Convert untracked files to relative paths (they should already be relative)
            # but ensure they're normalized
            normalized_untracked = []
            for file_path in untracked_files:
                # Normalize path separators and ensure it's relative
                normalized_path = os.path.normpath(file_path).replace(os.sep, '/')
                normalized_untracked.append(normalized_path)
            
            status = {
                "branch": branch_name,
                "is_dirty": is_dirty,
                "untracked_files": normalized_untracked,
                "modified_files": modified_files,
                "staged_files": staged_files,
                "repo_root": self.repo.working_tree_dir
            }
            
            self.log(f"get_status returning: {status}")
            
            return status
        except Exception as e:
            error_msg = {"error": str(e)}
            self.log(f"Error getting repository status: {e}")
            return error_msg
    
    def create_file(self, file_path, content=""):
        """Create a new file in the repository and stage it"""
        self.log(f"create_file method called with path: {file_path}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.log(f"create_file returning error: {error_msg}")
            return error_msg
        
        try:
            # Get the absolute path within the repository
            if os.path.isabs(file_path):
                # If absolute path, make sure it's within the repo
                repo_root = self.repo.working_tree_dir
                if not file_path.startswith(repo_root):
                    error_msg = {"error": f"File path {file_path} is outside repository"}
                    self.log(f"create_file returning error: {error_msg}")
                    return error_msg
                abs_path = file_path
            else:
                # If relative path, make it relative to repo root
                abs_path = os.path.join(self.repo.working_tree_dir, file_path)
            
            # Check if file already exists
            if os.path.exists(abs_path):
                error_msg = {"error": f"File {file_path} already exists"}
                self.log(f"create_file returning error: {error_msg}")
                return error_msg
            
            # Create directory structure if it doesn't exist
            dir_path = os.path.dirname(abs_path)
            if dir_path and not os.path.exists(dir_path):
                os.makedirs(dir_path, exist_ok=True)
                self.log(f"Created directory structure: {dir_path}")
            
            # Create the file with the specified content
            with open(abs_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Explicitly set file permissions to be writable
            # This ensures the file is not read-only after creation
            import stat
            current_permissions = os.stat(abs_path).st_mode
            # Add write permission for owner, group, and others
            writable_permissions = current_permissions | stat.S_IWUSR | stat.S_IWGRP | stat.S_IWOTH
            os.chmod(abs_path, writable_permissions)
            
            self.log(f"Successfully created file: {file_path}")
            
            # Stage the newly created file
            try:
                self.repo.index.add([file_path])
                self.log(f"Successfully staged file: {file_path}")
                return {"success": f"File {file_path} created and staged successfully"}
            except Exception as stage_error:
                self.log(f"File created but failed to stage: {stage_error}")
                return {"success": f"File {file_path} created successfully but failed to stage: {stage_error}"}
            
        except Exception as e:
            error_msg = {"error": f"Error creating file {file_path}: {e}"}
            self.log(f"create_file returning error: {error_msg}")
            return error_msg
    
    # Delegate methods to component modules
    def get_file_content(self, file_path, version='working'):
        """Get the content of a file from either HEAD or working directory"""
        return self.git_operations.get_file_content(file_path, version)
            
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
            
    def search_files(self, query, word=False, regex=False, respect_gitignore=True, ignore_case=False):
        """Search for content in repository files"""
        return self.git_search.search_files(query, word, regex, respect_gitignore, ignore_case)
    
    def start_git_monitor(self, interval=None):
        """Start monitoring the git repository for changes"""
        return self.git_monitor.start_git_monitor(interval)
            
    def stop_git_monitor(self):
        """Stop the git repository monitor"""
        return self.git_monitor.stop_git_monitor()
    
    def _notify_git_change(self):
        """Notify RepoTree component about git state changes"""
        self.log("Git state changed, notifying RepoTree")
        
        try:
            # Notify RepoTree using _safe_create_task - call loadGitStatus which triggers a refresh
            self._safe_create_task(self.get_call()['RepoTree.loadGitStatus']({}))
            
        except Exception as e:
            self.log(f"Error in _notify_git_change: {e}")
