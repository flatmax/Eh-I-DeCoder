import os
import git
try:
    from .exceptions import GitError, GitRepositoryError, create_error_response
except ImportError:
    from exceptions import GitError, GitRepositoryError, create_error_response


class RepoInfo:
    """Handles basic repository information and status"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
    
    def _ensure_repo(self):
        """Ensure repository is available, raise exception if not"""
        if not self.repo.repo:
            raise GitRepositoryError("No Git repository available")
    
    def get_repo_name(self):
        """Get the name of the repository (top-level directory name)"""
        try:
            self._ensure_repo()
            
            # Get the repository root directory path
            repo_root = self.repo.repo.working_tree_dir
            if repo_root:
                # Extract just the directory name (not the full path)
                repo_name = os.path.basename(repo_root)
                return repo_name
            else:
                raise GitError("Could not determine repository root")
        except Exception as e:
            return create_error_response(e)
    
    def get_repo_root(self):
        """Get the absolute path to the repository root directory"""
        try:
            self._ensure_repo()
            
            repo_root = self.repo.repo.working_tree_dir
            if repo_root:
                return repo_root
            else:
                raise GitError("Could not determine repository root")
        except Exception as e:
            return create_error_response(e)
    
    def get_status(self):
        """Get the current status of the repository"""
        try:
            self._ensure_repo()
            
            # Get the branch name, handling detached HEAD state
            try:
                branch_name = self.repo.repo.active_branch.name
            except TypeError:
                # Handle detached HEAD state (common during rebase)
                try:
                    # Try to get the current commit hash
                    current_commit = self.repo.repo.head.commit.hexsha
                    branch_name = f"detached-{current_commit[:7]}"
                except Exception as e:
                    branch_name = "detached-HEAD"
            
            # Get repository status information
            is_dirty = self.repo.repo.is_dirty()
            untracked_files = self.repo.repo.untracked_files
            
            # Get modified and staged files, handling potential errors
            try:
                modified_files = [item.a_path for item in self.repo.repo.index.diff(None)]
            except Exception as e:
                self.repo.log(f"Error getting modified files: {e}")
                modified_files = []
            
            try:
                staged_files = [item.a_path for item in self.repo.repo.index.diff("HEAD")]
            except Exception as e:
                self.repo.log(f"Error getting staged files: {e}")
                staged_files = []
            
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
                "repo_root": self.repo.repo.working_tree_dir
            }
            
            return status
        except Exception as e:
            return create_error_response(e)
