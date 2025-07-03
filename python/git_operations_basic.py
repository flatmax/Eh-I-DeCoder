import os
import subprocess
try:
    from .exceptions import GitError, GitRepositoryError, FileOperationError
except ImportError:
    from exceptions import GitError, GitRepositoryError, FileOperationError

class GitBasicOperations:
    """Handles basic Git operations like staging, committing, and file management"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
    
    def _ensure_repo(self):
        """Ensure repository is available, raise exception if not"""
        if not self.repo.repo:
            raise GitRepositoryError("No Git repository available")
    
    def get_file_content(self, file_path, version='working'):
        """Get the content of a file from either HEAD or working directory"""
        try:
            self._ensure_repo()
            
            if version == 'HEAD':
                # Get file content from HEAD commit
                try:
                    blob = self.repo.repo.head.commit.tree[file_path]
                    content = blob.data_stream.read().decode('utf-8')
                    return content
                except KeyError:
                    # File doesn't exist in HEAD (new file)
                    return ""
            elif version == 'working':
                # Get file content from working directory
                full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
                if os.path.exists(full_path):
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    return content
                else:
                    return ""
            else:
                raise ValueError(f"Invalid version: {version}. Use 'HEAD' or 'working'")
                
        except UnicodeDecodeError as e:
            raise FileOperationError(f"File {file_path} contains binary data or invalid encoding: {e}")
        except Exception as e:
            if isinstance(e, (GitRepositoryError, FileOperationError)):
                raise
            raise FileOperationError(f"Error reading file {file_path}: {e}")
            
    def save_file_content(self, file_path, content):
        """Save file content to disk in the working directory"""
        try:
            self._ensure_repo()
            
            # Construct the full path
            full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            # Write content to file
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return {"status": "success", "message": f"File {file_path} saved successfully"}
            
        except Exception as e:
            if isinstance(e, GitRepositoryError):
                raise
            raise FileOperationError(f"Error saving file {file_path}: {e}")

    def delete_file(self, file_path):
        """Delete a file from the working directory"""
        try:
            self._ensure_repo()
            
            # Construct the full path
            full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
            
            # Check if file exists
            if not os.path.exists(full_path):
                raise FileOperationError(f"File {file_path} does not exist")
            
            # Check if it's actually a file (not a directory)
            if not os.path.isfile(full_path):
                raise FileOperationError(f"Path {file_path} is not a file")
            
            # Delete the file
            os.remove(full_path)
            
            return {"status": "success", "message": f"File {file_path} deleted successfully"}
            
        except Exception as e:
            if isinstance(e, (GitRepositoryError, FileOperationError)):
                raise
            raise FileOperationError(f"Error deleting file {file_path}: {e}")
            
    def stage_file(self, file_path):
        """Stage a specific file in the repository"""
        try:
            self._ensure_repo()
            
            # Construct the full path
            full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
            
            # Check if file exists
            if not os.path.exists(full_path):
                raise FileOperationError(f"File {file_path} does not exist")
                
            # Stage the file
            self.repo.repo.git.add(file_path)
            
            return {"status": "success", "message": f"File {file_path} staged successfully"}
            
        except Exception as e:
            if isinstance(e, (GitRepositoryError, FileOperationError)):
                raise
            raise GitError(f"Error staging file {file_path}: {e}")
    
    def unstage_file(self, file_path):
        """Unstage a specific file in the repository"""
        try:
            self._ensure_repo()
            
            # Check if file is staged
            staged_files = [item.a_path for item in self.repo.repo.index.diff("HEAD")]
            if file_path not in staged_files:
                raise GitError(f"File {file_path} is not staged")
                
            # Unstage the file (restore index)
            self.repo.repo.git.restore('--staged', file_path)
            
            return {"status": "success", "message": f"File {file_path} unstaged successfully"}
            
        except Exception as e:
            if isinstance(e, (GitRepositoryError, GitError)):
                raise
            raise GitError(f"Error unstaging file {file_path}: {e}")
            
    def discard_changes(self, file_path):
        """Discard changes to a specific file in the repository by checking it out from HEAD"""
        try:
            self._ensure_repo()
            
            # Check if file is modified
            modified_files = [item.a_path for item in self.repo.repo.index.diff(None)]
            if file_path not in modified_files:
                raise GitError(f"File {file_path} has no changes to discard")
                
            # Discard the changes by checking out from HEAD or index
            # This will restore the file to its state in the index (if it's there) or HEAD
            self.repo.repo.git.restore(file_path)
            
            return {"status": "success", "message": f"Changes to file {file_path} discarded successfully"}
            
        except Exception as e:
            if isinstance(e, (GitRepositoryError, GitError)):
                raise
            raise GitError(f"Error discarding changes to file {file_path}: {e}")
            
    def commit_file(self, file_path, commit_message):
        """Commit a specific file to the repository"""
        try:
            self._ensure_repo()
            
            # Construct the full path
            full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
            
            # Check if file exists
            if not os.path.exists(full_path):
                raise FileOperationError(f"File {file_path} does not exist")
                
            # Stage the file
            self.repo.repo.git.add(file_path)
            
            # Commit the staged changes
            commit_result = self.repo.repo.git.commit('-m', commit_message)
            
            return {"status": "success", "message": f"File {file_path} committed successfully", "details": commit_result}
            
        except Exception as e:
            if isinstance(e, (GitRepositoryError, FileOperationError)):
                raise
            raise GitError(f"Error committing file {file_path}: {e}")

    def commit_staged_changes(self, message="Rebase commit"):
        """Commit all staged changes"""
        try:
            self._ensure_repo()
            
            # Set up environment to prevent interactive editors
            env = os.environ.copy()
            env['GIT_EDITOR'] = 'true'  # Use 'true' command which does nothing
            env['EDITOR'] = 'true'
            env['VISUAL'] = 'true'
            
            result = subprocess.run([
                'git', 'commit', '-m', message
            ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True, env=env)
            
            if result.returncode == 0:
                return {"success": True, "message": "Staged changes committed successfully"}
            else:
                raise GitError(f"Failed to commit staged changes: {result.stderr}")
                
        except Exception as e:
            if isinstance(e, (GitRepositoryError, GitError)):
                raise
            raise GitError(f"Error committing staged changes: {e}")

    def commit_amend(self):
        """Amend the previous commit with staged changes"""
        try:
            self._ensure_repo()
            
            # Set up environment to prevent interactive editors
            env = os.environ.copy()
            env['GIT_EDITOR'] = 'true'  # Use 'true' command which does nothing
            env['EDITOR'] = 'true'
            env['VISUAL'] = 'true'
            
            result = subprocess.run([
                'git', 'commit', '--amend', '--no-edit'
            ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True, env=env)
            
            if result.returncode == 0:
                return {"success": True, "message": "Commit amended successfully"}
            else:
                raise GitError(f"Failed to amend commit: {result.stderr}")
                
        except Exception as e:
            if isinstance(e, (GitRepositoryError, GitError)):
                raise
            raise GitError(f"Error amending commit: {e}")

    def get_raw_git_status(self):
        """Get the raw git status output as it appears in the terminal"""
        try:
            self._ensure_repo()
            
            # Run git status command to get the raw output
            result = subprocess.run([
                'git', 'status'
            ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True)
            
            if result.returncode == 0:
                raw_status = result.stdout.strip()
                return {"success": True, "raw_status": raw_status}
            else:
                raise GitError(f"Git status command failed: {result.stderr}")
                
        except Exception as e:
            if isinstance(e, (GitRepositoryError, GitError)):
                raise
            raise GitError(f"Error getting raw git status: {e}")
