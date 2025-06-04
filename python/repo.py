import git
import os
import re
from eh_i_decoder.base_wrapper import BaseWrapper


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
            
            status = {
                "branch": branch_name,
                "is_dirty": is_dirty,
                "untracked_files": untracked_files,
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
    
    def get_file_content(self, file_path, version='working'):
        """Get the content of a file from either HEAD or working directory"""
        self.log(f"get_file_content called for {file_path}, version: {version}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.log(f"get_file_content returning error: {error_msg}")
            return error_msg
        
        try:
            if version == 'HEAD':
                # Get file content from HEAD commit
                try:
                    blob = self.repo.head.commit.tree[file_path]
                    content = blob.data_stream.read().decode('utf-8')
                    self.log(f"HEAD content loaded for {file_path}, length: {len(content)}")
                    return content
                except KeyError:
                    # File doesn't exist in HEAD (new file)
                    self.log(f"File {file_path} not found in HEAD (new file)")
                    return ""
            elif version == 'working':
                # Get file content from working directory
                full_path = os.path.join(self.repo.working_tree_dir, file_path)
                if os.path.exists(full_path):
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    self.log(f"Working content loaded for {file_path}, length: {len(content)}")
                    return content
                else:
                    self.log(f"File {file_path} not found in working directory")
                    return ""
            else:
                error_msg = {"error": f"Invalid version: {version}. Use 'HEAD' or 'working'"}
                self.log(f"get_file_content returning error: {error_msg}")
                return error_msg
                
        except UnicodeDecodeError as e:
            error_msg = {"error": f"File {file_path} contains binary data or invalid encoding: {e}"}
            self.log(f"get_file_content returning error: {error_msg}")
            return error_msg
        except Exception as e:
            error_msg = {"error": f"Error reading file {file_path}: {e}"}
            self.log(f"get_file_content returning error: {error_msg}")
            return error_msg
            
    def save_file_content(self, file_path, content):
        """Save file content to disk in the working directory"""
        self.log(f"save_file_content called for {file_path}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
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
            
            self.log(f"File {file_path} saved successfully")
            return {"status": "success", "message": f"File {file_path} saved successfully"}
            
        except Exception as e:
            error_msg = {"error": f"Error saving file {file_path}: {e}"}
            self.log(f"save_file_content returning error: {error_msg}")
            return error_msg
            
    def search_files(self, query, word=False, regex=False):
        """Search for content in repository files
        
        Args:
            query (str): The search string or pattern
            word (bool): If True, search for whole word matches
            regex (bool): If True, treat query as a regular expression
            
        Returns:
            dict: A dictionary with results or error information
        """
        self.log(f"search_files called with query: '{query}', word: {word}, regex: {regex}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.log(f"search_files returning error: {error_msg}")
            return error_msg
            
        try:
            results = []
            repo_root = self.repo.working_tree_dir
            
            # Prepare the search pattern based on parameters
            if regex:
                try:
                    if word:
                        # For word+regex, we'll add word boundary assertions
                        pattern = re.compile(r'\b' + query + r'\b')
                    else:
                        pattern = re.compile(query)
                except re.error as e:
                    return {"error": f"Invalid regular expression: {e}"}
            else:
                if word:
                    # For word-only search, prepare for whole word matching
                    pattern = None  # We'll handle this separately
                else:
                    # For plain text search, escape regex special chars
                    pattern = re.compile(re.escape(query))
            
            # Walk through all files in the repository
            for root, _, files in os.walk(repo_root):
                for file in files:
                    full_path = os.path.join(root, file)
                    
                    # Skip binary files, .git directory, and very large files
                    rel_path = os.path.relpath(full_path, repo_root)
                    if (rel_path.startswith('.git/') or 
                        os.path.getsize(full_path) > 1024 * 1024):  # Skip files > 1MB
                        continue
                    
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            lines = f.readlines()
                    except UnicodeDecodeError:
                        # Skip binary files that couldn't be decoded as utf-8
                        continue
                    
                    file_matches = []
                    for line_num, line in enumerate(lines, 1):
                        if regex or not word:
                            # Use regex pattern for both regex mode and plain text mode
                            if pattern.search(line):
                                file_matches.append({
                                    "line_num": line_num,
                                    "line": line.rstrip('\n')
                                })
                        else:
                            # For word-only search, do manual word boundary checking
                            words = re.findall(r'\b\w+\b', line)
                            if query in words:
                                file_matches.append({
                                    "line_num": line_num,
                                    "line": line.rstrip('\n')
                                })
                    
                    if file_matches:
                        results.append({
                            "file": rel_path,
                            "matches": file_matches
                        })
            
            self.log(f"search_files found {len(results)} files with matches")
            # Return the results directly without nesting them in a "results" key
            # This matches the structure expected by the frontend
            return results
            
        except Exception as e:
            error_msg = {"error": f"Error during search: {e}"}
            self.log(f"search_files returning error: {error_msg}")
            return error_msg
