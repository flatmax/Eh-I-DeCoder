import git
import os
import re
import asyncio
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from eh_i_decoder.base_wrapper import BaseWrapper
from eh_i_decoder.logger import Logger


class GitChangeHandler(FileSystemEventHandler):
    """File system event handler that triggers on Git repository changes"""
    
    def __init__(self, repo_instance):
        super().__init__()
        self.repo = repo_instance
        self.last_event_time = 0
        self.debounce_interval = 0.5  # seconds
    
    def on_any_event(self, event):
        # Ignore events in .git directory except for index and HEAD changes
        if ".git" in event.src_path:
            important_git_files = [
                os.path.join(self.repo.repo.git_dir, "index"),
                os.path.join(self.repo.repo.git_dir, "HEAD"),
                os.path.join(self.repo.repo.git_dir, "refs")
            ]
            
            is_important = any(path in event.src_path for path in important_git_files)
            if not is_important:
                return
        
        # Debounce events to avoid multiple rapid notifications
        current_time = time.time()
        if current_time - self.last_event_time < self.debounce_interval:
            return
            
        self.last_event_time = current_time
        self.repo.log(f"Git change detected: {event.src_path}")
        self.repo._notify_git_change()


class Repo(BaseWrapper):
    """Wrapper for Git repository operations using GitPython"""
    
    def __init__(self, repo_path=None):
        super().__init__()

        self.repo_path = repo_path or '.'
        self.repo = None
        self._git_change_callbacks = []
        self._observer = None
        self._event_handler = None
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
            
    def stage_file(self, file_path):
        """Stage a specific file in the repository"""
        self.log(f"stage_file called for {file_path}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.log(f"stage_file returning error: {error_msg}")
            return error_msg
            
        try:
            # Construct the full path
            full_path = os.path.join(self.repo.working_tree_dir, file_path)
            
            # Check if file exists
            if not os.path.exists(full_path):
                error_msg = {"error": f"File {file_path} does not exist"}
                self.log(f"stage_file returning error: {error_msg}")
                return error_msg
                
            # Stage the file
            self.log(f"Staging file: {file_path}")
            self.repo.git.add(file_path)
            
            self.log(f"File {file_path} staged successfully")
            return {"status": "success", "message": f"File {file_path} staged successfully"}
            
        except Exception as e:
            error_msg = {"error": f"Error staging file {file_path}: {e}"}
            self.log(f"stage_file returning error: {error_msg}")
            return error_msg
    
    def unstage_file(self, file_path):
        """Unstage a specific file in the repository"""
        self.log(f"unstage_file called for {file_path}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.log(f"unstage_file returning error: {error_msg}")
            return error_msg
            
        try:
            # Check if file is staged
            staged_files = [item.a_path for item in self.repo.index.diff("HEAD")]
            if file_path not in staged_files:
                error_msg = {"error": f"File {file_path} is not staged"}
                self.log(f"unstage_file returning error: {error_msg}")
                return error_msg
                
            # Unstage the file (restore index)
            self.log(f"Unstaging file: {file_path}")
            self.repo.git.restore('--staged', file_path)
            
            self.log(f"File {file_path} unstaged successfully")
            return {"status": "success", "message": f"File {file_path} unstaged successfully"}
            
        except Exception as e:
            error_msg = {"error": f"Error unstaging file {file_path}: {e}"}
            self.log(f"unstage_file returning error: {error_msg}")
            return error_msg
            
    def discard_changes(self, file_path):
        """Discard changes to a specific file in the repository by checking it out from HEAD"""
        self.log(f"discard_changes called for {file_path}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.log(f"discard_changes returning error: {error_msg}")
            return error_msg
            
        try:
            # Check if file is modified
            modified_files = [item.a_path for item in self.repo.index.diff(None)]
            if file_path not in modified_files:
                error_msg = {"error": f"File {file_path} has no changes to discard"}
                self.log(f"discard_changes returning error: {error_msg}")
                return error_msg
                
            # Discard the changes by checking out from HEAD or index
            self.log(f"Discarding changes to file: {file_path}")
            # This will restore the file to its state in the index (if it's there) or HEAD
            self.repo.git.restore(file_path)
            
            self.log(f"Changes to file {file_path} discarded successfully")
            return {"status": "success", "message": f"Changes to file {file_path} discarded successfully"}
            
        except Exception as e:
            error_msg = {"error": f"Error discarding changes to file {file_path}: {e}"}
            self.log(f"discard_changes returning error: {error_msg}")
            return error_msg
            
    def commit_file(self, file_path, commit_message):
        """Commit a specific file to the repository"""
        self.log(f"commit_file called for {file_path} with message: {commit_message}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.log(f"commit_file returning error: {error_msg}")
            return error_msg
            
        try:
            # Construct the full path
            full_path = os.path.join(self.repo.working_tree_dir, file_path)
            
            # Check if file exists
            if not os.path.exists(full_path):
                error_msg = {"error": f"File {file_path} does not exist"}
                self.log(f"commit_file returning error: {error_msg}")
                return error_msg
                
            # Stage the file
            self.log(f"Staging file: {file_path}")
            self.repo.git.add(file_path)
            
            # Commit the staged changes
            self.log(f"Committing file with message: {commit_message}")
            commit_result = self.repo.git.commit('-m', commit_message)
            
            self.log(f"File {file_path} committed successfully: {commit_result}")
            return {"status": "success", "message": f"File {file_path} committed successfully", "details": commit_result}
            
        except Exception as e:
            error_msg = {"error": f"Error committing file {file_path}: {e}"}
            self.log(f"commit_file returning error: {error_msg}")
            return error_msg
            
    def search_files(self, query, word=False, regex=False, respect_gitignore=True, ignore_case=False):
        """Search for content in repository files
        
        Args:
            query (str): The search string or pattern
            word (bool): If True, search for whole word matches
            regex (bool): If True, treat query as a regular expression
            respect_gitignore (bool): If True, skip files ignored by .gitignore
            ignore_case (bool): If True, perform case-insensitive search
            
        Returns:
            dict: A dictionary with results or error information
        """
        self.log(f"search_files called with query: '{query}', word: {word}, regex: {regex}, respect_gitignore: {respect_gitignore}, ignore_case: {ignore_case}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.log(f"search_files returning error: {error_msg}")
            return error_msg
        
        try:
            # Use the optimized git grep implementation for faster searches
            return self._search_with_git_grep(query, word, regex, respect_gitignore, ignore_case)
        except git.exc.GitCommandError as e:
            # If git grep fails, fall back to the Python implementation
            self.log(f"Git grep failed with error: {e}. Falling back to Python implementation.")
            return self._search_with_python(query, word, regex, respect_gitignore, ignore_case)
        except Exception as e:
            error_msg = {"error": f"Error during search: {e}"}
            self.log(f"search_files returning error: {error_msg}")
            return error_msg
    
    def _search_with_git_grep(self, query, word=False, regex=False, respect_gitignore=True, ignore_case=False):
        """Search for content in repository files using Git's built-in grep command"""
        self.log(f"_search_with_git_grep called with query: '{query}', word: {word}, regex: {regex}, respect_gitignore: {respect_gitignore}, ignore_case: {ignore_case}")
        
        # Build git grep arguments
        git_args = ["-n"]  # -n to show line numbers
        
        if ignore_case:
            git_args.append("-i")  # --ignore-case
        
        if word:
            git_args.append("-w")  # --word-regexp
        
        if regex:
            # git grep uses basic regex by default, -E for extended regex
            git_args.append("-E")  # --extended-regexp
        else:
            # For plain text, git grep treats it literally
            git_args.append("-F")  # --fixed-strings (literal string)
        
        # Set up gitignore handling
        if not respect_gitignore:
            # If not respecting gitignore, search all files including ignored ones
            git_args.append("--no-index")
        else:
            # Default git grep behavior respects gitignore for tracked files
            # Add --untracked to include untracked files that aren't ignored
            git_args.append("--untracked")
            git_args.append("--exclude-standard")
        
        # Always skip binary files
        git_args.append("-I")  # --binary-files=without-match
        
        # Add the query as the last argument
        git_args.append(query)
        
        try:
            # Execute git grep and get results
            grep_output = self.repo.git.grep(git_args, as_process=False)
            
            # Process results into the expected format
            consolidated_results = {}
            
            for line in grep_output.splitlines():
                # Format is "path/to/file:line_num:line_content"
                parts = line.split(':', 2)
                if len(parts) == 3:
                    file_path, line_num_str, line_content = parts
                    try:
                        line_num = int(line_num_str)
                        
                        # Add to consolidated results dictionary
                        if file_path not in consolidated_results:
                            consolidated_results[file_path] = {
                                "file": file_path,
                                "matches": []
                            }
                        
                        consolidated_results[file_path]["matches"].append({
                            "line_num": line_num,
                            "line": line_content.rstrip('\n')
                        })
                    except ValueError:
                        self.log(f"Warning: Could not parse line number from git grep output: {line}")
            
            # Convert dict to list for final results
            final_results = list(consolidated_results.values())
            self.log(f"_search_with_git_grep found {len(final_results)} files with matches")
            return final_results
            
        except git.exc.GitCommandError as e:
            # git grep returns exit code 1 if no matches found
            if e.status == 1:
                self.log("_search_with_git_grep: No matches found")
                return []
            # For other errors, re-raise to fall back to Python implementation
            raise
    
    def start_git_monitor(self, interval=None):
        """Start monitoring the git repository for changes"""
        if not self.repo:
            self.log("Cannot start git monitor: No git repository available")
            return {"error": "No git repository available"}
            
        if self._observer and self._observer.is_alive():
            self.log("Git monitor is already running")
            return {"status": "info", "message": "Git monitor already running"}
            
        self.log(f"Starting git monitor using watchdog")
        
        # Create the event handler and file system observer
        self._event_handler = GitChangeHandler(self)
        self._observer = Observer()
        
        # Schedule monitoring for both the git directory and working tree
        working_tree_path = self.repo.working_tree_dir
        git_dir_path = self.repo.git_dir
        
        # Monitor the working directory
        self._observer.schedule(self._event_handler, working_tree_path, recursive=True)
        
        # Also monitor the .git directory for index changes
        self._observer.schedule(self._event_handler, git_dir_path, recursive=False)
        
        # Start the observer
        self._observer.start()
        return {"status": "success", "message": "Git monitor started"}
            
    def stop_git_monitor(self):
        """Stop the git repository monitor"""
        if not self._observer or not self._observer.is_alive():
            self.log("Git monitor is not running")
            return {"status": "info", "message": "Git monitor not running"}
            
        self.log("Stopping git monitor")
        self._observer.stop()
        self._observer.join(timeout=1.0)
        self._observer = None
        self._event_handler = None
        return {"status": "success", "message": "Git monitor stopped"}
    
    def _notify_git_change(self):
        """Notify RepoTree component about git state changes"""
        self.log("Git state changed, notifying RepoTree")
        
        try:
            # Get the current git status
            st = self.get_status()
            
            # Notify RepoTree using _safe_create_task
            self._safe_create_task(self.get_call()['RepoTree.loadGitStatus'](st))
            
        except Exception as e:
            self.log(f"Error in _notify_git_change: {e}")
    
    def _search_with_python(self, query, word=False, regex=False, respect_gitignore=True, ignore_case=False):
        """Fallback search implementation using Python when git grep fails"""
        self.log(f"_search_with_python called with query: '{query}', word: {word}, regex: {regex}, respect_gitignore: {respect_gitignore}, ignore_case: {ignore_case}")
        
        try:
            results = []
            repo_root = self.repo.working_tree_dir
            
            # Prepare the search pattern based on parameters
            if regex:
                try:
                    if word:
                        # For word+regex, we'll add word boundary assertions
                        pattern = re.compile(r'\b' + query + r'\b', re.IGNORECASE if ignore_case else 0)
                    else:
                        pattern = re.compile(query, re.IGNORECASE if ignore_case else 0)
                except re.error as e:
                    return {"error": f"Invalid regular expression: {e}"}
            else:
                if word:
                    # For word-only search, prepare for whole word matching
                    pattern = None  # We'll handle this separately
                else:
                    # For plain text search, escape regex special chars
                    pattern = re.compile(re.escape(query), re.IGNORECASE if ignore_case else 0)
            
            # Walk through all files in the repository
            for root, _, files in os.walk(repo_root):
                for file in files:
                    full_path = os.path.join(root, file)
                    
                    # Get relative path
                    rel_path = os.path.relpath(full_path, repo_root)
                
                    # Skip binary files, .git directory, and very large files
                    if (rel_path.startswith('.git/') or 
                        os.path.getsize(full_path) > 1024 * 1024):  # Skip files > 1MB
                        continue
                
                    # Check if file is ignored by gitignore
                    if respect_gitignore:
                        try:
                            # Use git's check-ignore command to see if file is ignored
                            self.repo.git.check_ignore(rel_path)
                            # If we reach here, the file is ignored (command succeeded)
                            self.log(f"Skipping ignored file: {rel_path}")
                            continue
                        except git.exc.GitCommandError:
                            # File is not ignored (command failed)
                            pass
                    
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
                            if ignore_case:
                                # Case-insensitive comparison
                                if any(query.lower() == word.lower() for word in words):
                                    file_matches.append({
                                        "line_num": line_num,
                                        "line": line.rstrip('\n')
                                    })
                            elif query in words:
                                file_matches.append({
                                    "line_num": line_num,
                                    "line": line.rstrip('\n')
                                })
                    
                    if file_matches:
                        results.append({
                            "file": rel_path,
                            "matches": file_matches
                        })
            
            self.log(f"_search_with_python found {len(results)} files with matches")
            return results
            
        except Exception as e:
            error_msg = {"error": f"Error during Python search: {e}"}
            self.log(f"_search_with_python returning error: {error_msg}")
            return error_msg
