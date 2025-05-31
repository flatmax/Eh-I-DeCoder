import git
import os
from base_wrapper import BaseWrapper


class Repo(BaseWrapper):
    """Wrapper for Git repository operations using GitPython"""
    
    def __init__(self, repo_path=None):
        self.log_file = '/tmp/repo.log'
        super().__init__()

        self.repo_path = repo_path or '.'
        self.repo = None
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
        except git.exc.InvalidGitRepositoryError:
            self.log(f"No Git repository found at: {self.repo_path} or in parent directories")
            self.repo = None
        except Exception as e:
            self.log(f"Error initializing Git repository: {e}")
            self.repo = None
    
    def get_status(self):
        """Get the current status of the repository"""
        print("get_status called")
        self.log("get_status method called")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            print(f"get_status returning error: {error_msg}")
            self.log(f"get_status returning error: {error_msg}")
            return error_msg
        
        try:
            # Log the working directory for debugging
            print(f"Repository working directory: {self.repo.working_dir}")
            print(f"Repository root directory: {self.repo.working_tree_dir}")
            self.log(f"Repository working directory: {self.repo.working_dir}")
            self.log(f"Repository root directory: {self.repo.working_tree_dir}")
            
            # Get the status information
            branch_name = self.repo.active_branch.name
            is_dirty = self.repo.is_dirty()
            untracked_files = self.repo.untracked_files
            modified_files = [item.a_path for item in self.repo.index.diff(None)]
            staged_files = [item.a_path for item in self.repo.index.diff("HEAD")]
            
            status = {
                "branch": branch_name,
                "is_dirty": is_dirty,
                "untracked_files": untracked_files,
                "modified_files": modified_files,
                "staged_files": staged_files,
                "repo_root": self.repo.working_tree_dir
            }
            
            print(f"get_status returning: {status}")
            self.log(f"get_status returning: {status}")
            
            return status
        except Exception as e:
            error_msg = {"error": str(e)}
            print(f"Error in get_status: {e}")
            self.log(f"Error getting repository status: {e}")
            return error_msg
    
    def get_file_content(self, file_path, version='working'):
        """Get the content of a file from either HEAD or working directory"""
        print(f"get_file_content called for {file_path}, version: {version}")
        self.log(f"get_file_content called for {file_path}, version: {version}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            print(f"get_file_content returning error: {error_msg}")
            self.log(f"get_file_content returning error: {error_msg}")
            return error_msg
        
        try:
            if version == 'HEAD':
                # Get file content from HEAD commit
                try:
                    blob = self.repo.head.commit.tree[file_path]
                    content = blob.data_stream.read().decode('utf-8')
                    print(f"HEAD content loaded for {file_path}, length: {len(content)}")
                    self.log(f"HEAD content loaded for {file_path}, length: {len(content)}")
                    return content
                except KeyError:
                    # File doesn't exist in HEAD (new file)
                    print(f"File {file_path} not found in HEAD (new file)")
                    self.log(f"File {file_path} not found in HEAD (new file)")
                    return ""
            elif version == 'working':
                # Get file content from working directory
                full_path = os.path.join(self.repo.working_tree_dir, file_path)
                if os.path.exists(full_path):
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    print(f"Working content loaded for {file_path}, length: {len(content)}")
                    self.log(f"Working content loaded for {file_path}, length: {len(content)}")
                    return content
                else:
                    print(f"File {file_path} not found in working directory")
                    self.log(f"File {file_path} not found in working directory")
                    return ""
            else:
                error_msg = {"error": f"Invalid version: {version}. Use 'HEAD' or 'working'"}
                print(f"get_file_content returning error: {error_msg}")
                self.log(f"get_file_content returning error: {error_msg}")
                return error_msg
                
        except UnicodeDecodeError as e:
            error_msg = {"error": f"File {file_path} contains binary data or invalid encoding: {e}"}
            print(f"get_file_content returning error: {error_msg}")
            self.log(f"get_file_content returning error: {error_msg}")
            return error_msg
        except Exception as e:
            error_msg = {"error": f"Error reading file {file_path}: {e}"}
            print(f"get_file_content returning error: {error_msg}")
            self.log(f"get_file_content returning error: {error_msg}")
            return error_msg
            
    def save_file_content(self, file_path, content):
        """Save file content to disk in the working directory"""
        print(f"save_file_content called for {file_path}")
        self.log(f"save_file_content called for {file_path}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            print(f"save_file_content returning error: {error_msg}")
            self.log(f"save_file_content returning error: {error_msg}")
            return error_msg
        
        try:
            # Construct the full path
            full_path = os.path.join(self.repo.working_tree_dir, file_path)
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            # Write content to file
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"File {file_path} saved successfully")
            self.log(f"File {file_path} saved successfully")
            return {"status": "success", "message": f"File {file_path} saved successfully"}
            
        except Exception as e:
            error_msg = {"error": f"Error saving file {file_path}: {e}"}
            print(f"save_file_content returning error: {error_msg}")
            self.log(f"save_file_content returning error: {error_msg}")
            return error_msg
