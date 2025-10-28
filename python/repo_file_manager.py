import os
import stat
import sys
try:
    from .exceptions import GitError, GitRepositoryError, FileOperationError, create_error_response
    from .repo_history import RepoHistory
except ImportError:
    from exceptions import GitError, GitRepositoryError, FileOperationError, create_error_response
    from repo_history import RepoHistory


class RepoFileManager:
    """Handles file creation and management operations in the repository"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
    
    def _ensure_repo(self):
        """Ensure repository is available, raise exception if not"""
        if not self.repo.repo:
            raise GitRepositoryError("No Git repository available")
    
    def create_file(self, file_path, content=""):
        """Create a new file in the repository and stage it"""
        try:
            self._ensure_repo()
            
            # Get the absolute path within the repository
            if os.path.isabs(file_path):
                # If absolute path, make sure it's within the repo
                repo_root = self.repo.repo.working_tree_dir
                if not file_path.startswith(repo_root):
                    raise FileOperationError(f"File path {file_path} is outside repository")
                abs_path = file_path
            else:
                # If relative path, make it relative to repo root
                abs_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
            
            # Check if file already exists
            if os.path.exists(abs_path):
                raise FileOperationError(f"File {file_path} already exists")
            
            # Create directory structure if it doesn't exist
            dir_path = os.path.dirname(abs_path)
            if dir_path and not os.path.exists(dir_path):
                os.makedirs(dir_path, exist_ok=True)
            
            # Create the file with the specified content
            with open(abs_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Explicitly set file permissions to be writable
            # This ensures the file is not read-only after creation
            current_permissions = os.stat(abs_path).st_mode
            # Add write permission for owner, group, and others
            writable_permissions = current_permissions | stat.S_IWUSR | stat.S_IWGRP | stat.S_IWOTH
            os.chmod(abs_path, writable_permissions)
            
            # Stage the newly created file
            try:
                self.repo.repo.index.add([file_path])
                return {"success": f"File {file_path} created and staged successfully"}
            except Exception as stage_error:
                return {"success": f"File {file_path} created successfully but failed to stage: {stage_error}"}
            
        except Exception as e:
            return create_error_response(e)
    
    def get_file_content(self, file_path, version='working'):
        """Get the content of a file from either HEAD, working directory, or specific commit"""
        # Force output to stderr for debugging
        print(f"[REPO_FILE_MANAGER] get_file_content called: file_path={file_path}, version={version}", file=sys.stderr, flush=True)
        
        try:
            self._ensure_repo()
            
            if version == 'HEAD':
                # Get file content from HEAD commit
                print(f"[REPO_FILE_MANAGER] Attempting to read {file_path} from HEAD", file=sys.stderr, flush=True)
                try:
                    blob = self.repo.repo.head.commit.tree[file_path]
                    print(f"[REPO_FILE_MANAGER] Found blob for {file_path} in HEAD", file=sys.stderr, flush=True)
                    content = blob.data_stream.read().decode('utf-8')
                    print(f"[REPO_FILE_MANAGER] Successfully loaded HEAD content for {file_path}, length: {len(content)}", file=sys.stderr, flush=True)
                    self.repo.log(f"Successfully loaded HEAD content for {file_path}, length: {len(content)}")
                    return content
                except KeyError as e:
                    # File doesn't exist in HEAD (new file)
                    print(f"[REPO_FILE_MANAGER] KeyError: File {file_path} doesn't exist in HEAD (new file), returning empty string", file=sys.stderr, flush=True)
                    self.repo.log(f"File {file_path} doesn't exist in HEAD (new file), returning empty string")
                    return ""
                except Exception as e:
                    # Log any other errors when reading from HEAD
                    print(f"[REPO_FILE_MANAGER] Exception reading {file_path} from HEAD: {type(e).__name__}: {e}", file=sys.stderr, flush=True)
                    self.repo.log(f"Error reading {file_path} from HEAD: {type(e).__name__}: {e}")
                    # Return empty string for any HEAD read errors (common on sshfs mounts)
                    return ""
            elif version == 'working':
                # Get file content from working directory
                full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
                print(f"[REPO_FILE_MANAGER] Attempting to read {file_path} from working directory: {full_path}", file=sys.stderr, flush=True)
                if os.path.exists(full_path):
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        print(f"[REPO_FILE_MANAGER] Successfully loaded working content for {file_path}, length: {len(content)}", file=sys.stderr, flush=True)
                        self.repo.log(f"Successfully loaded working content for {file_path}, length: {len(content)}")
                        return content
                    except Exception as e:
                        print(f"[REPO_FILE_MANAGER] Error reading {file_path} from working directory: {type(e).__name__}: {e}", file=sys.stderr, flush=True)
                        self.repo.log(f"Error reading {file_path} from working directory: {type(e).__name__}: {e}")
                        raise FileOperationError(f"Could not read file {file_path}: {e}")
                else:
                    print(f"[REPO_FILE_MANAGER] File {file_path} doesn't exist in working directory", file=sys.stderr, flush=True)
                    self.repo.log(f"File {file_path} doesn't exist in working directory")
                    return ""
            else:
                # Delegate to history module for specific commit
                print(f"[REPO_FILE_MANAGER] Delegating to history module for commit {version}", file=sys.stderr, flush=True)
                history = RepoHistory(self.repo)
                return history.get_file_content_at_commit(file_path, version)
                
        except UnicodeDecodeError as e:
            print(f"[REPO_FILE_MANAGER] Unicode decode error for {file_path}: {e}", file=sys.stderr, flush=True)
            self.repo.log(f"Unicode decode error for {file_path}: {e}")
            return create_error_response(FileOperationError(f"File {file_path} contains binary data or invalid encoding: {e}"))
        except Exception as e:
            print(f"[REPO_FILE_MANAGER] Unexpected error in get_file_content for {file_path} (version={version}): {type(e).__name__}: {e}", file=sys.stderr, flush=True)
            self.repo.log(f"Unexpected error in get_file_content for {file_path} (version={version}): {type(e).__name__}: {e}")
            return create_error_response(e)
