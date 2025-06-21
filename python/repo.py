import git
import os
import asyncio
import subprocess
import mimetypes
try:
    from .base_wrapper import BaseWrapper
    from .logger import Logger
    from .git_monitor import GitMonitor
    from .git_operations import GitOperations
    from .git_search import GitSearch
except ImportError:
    from base_wrapper import BaseWrapper
    from logger import Logger
    from git_monitor import GitMonitor
    from git_operations import GitOperations
    from git_search import GitSearch


class Repo(BaseWrapper):
    """Wrapper for Git repository operations using GitPython"""
    
    def __init__(self, repo_path=None):
        super().__init__()

        self.repo_path = repo_path or '.'
        self.repo = None
        self._git_change_callbacks = []
        self._line_count_cache = {}
        
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
            
            # Get the branch name, handling detached HEAD state
            try:
                branch_name = self.repo.active_branch.name
                self.log(f"Active branch: {branch_name}")
            except TypeError:
                # Handle detached HEAD state (common during rebase)
                try:
                    # Try to get the current commit hash
                    current_commit = self.repo.head.commit.hexsha
                    branch_name = f"detached-{current_commit[:7]}"
                    self.log(f"Detached HEAD state, using: {branch_name}")
                except Exception as e:
                    self.log(f"Error getting commit hash in detached state: {e}")
                    branch_name = "detached-HEAD"
            
            # Get repository status information
            is_dirty = self.repo.is_dirty()
            untracked_files = self.repo.untracked_files
            
            # Get modified and staged files, handling potential errors
            try:
                modified_files = [item.a_path for item in self.repo.index.diff(None)]
            except Exception as e:
                self.log(f"Error getting modified files: {e}")
                modified_files = []
            
            try:
                staged_files = [item.a_path for item in self.repo.index.diff("HEAD")]
            except Exception as e:
                self.log(f"Error getting staged files: {e}")
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
                "repo_root": self.repo.working_tree_dir
            }
            
            self.log(f"get_status returning: {status}")
            
            return status
        except Exception as e:
            error_msg = {"error": str(e)}
            self.log(f"Error getting repository status: {e}")
            return error_msg
    
    def get_file_line_counts(self, file_paths):
        """Get line counts for a list of files"""
        self.log(f"get_file_line_counts called with {len(file_paths)} files")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.log(f"get_file_line_counts returning error: {error_msg}")
            return error_msg
        
        try:
            line_counts = {}
            repo_root = self.repo.working_tree_dir
            
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
                    if not self._is_text_file(abs_path):
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
                    self.log(f"Error counting lines for {file_path}: {e}")
                    line_counts[file_path] = 0
            
            self.log(f"get_file_line_counts returning counts for {len(line_counts)} files")
            return line_counts
            
        except Exception as e:
            error_msg = {"error": f"Error getting file line counts: {e}"}
            self.log(f"get_file_line_counts returning error: {error_msg}")
            return error_msg
    
    def _is_text_file(self, file_path):
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
            self.log(f"Error checking if file is text: {e}")
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
            self.log(f"Error counting lines in {file_path}: {e}")
            return 0
    
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
    
    def get_commit_history(self, max_count=50, branch=None, skip=0):
        """Get commit history with detailed information - optimized for performance with pagination support"""
        self.log(f"get_commit_history called with max_count: {max_count}, branch: {branch}, skip: {skip}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.log(f"get_commit_history returning error: {error_msg}")
            return error_msg
        
        try:
            commits = []
            
            # Use current branch if no branch specified - much faster than --all
            if branch is None:
                try:
                    branch = self.repo.active_branch.name
                    self.log(f"Using current branch: {branch}")
                except TypeError:
                    # Fallback to HEAD if no active branch (detached HEAD)
                    branch = 'HEAD'
                    self.log("Using HEAD (detached state)")
            
            # Get commits from specified branch with skip and max_count for pagination
            for commit in self.repo.iter_commits(branch, max_count=max_count, skip=skip):
                commit_data = {
                    'hash': commit.hexsha,
                    'author': commit.author.name,
                    'email': commit.author.email,
                    'date': commit.committed_datetime.isoformat(),
                    'message': commit.message.strip(),
                    'branch': branch  # Use the branch we're iterating over
                }
                commits.append(commit_data)
            
            self.log(f"get_commit_history returning {len(commits)} commits from branch {branch} (skip: {skip})")
            return commits
            
        except Exception as e:
            error_msg = {"error": f"Error getting commit history: {e}"}
            self.log(f"get_commit_history returning error: {error_msg}")
            return error_msg
    
    def get_changed_files(self, from_commit, to_commit):
        """Get list of files changed between two commits"""
        self.log(f"get_changed_files called with from_commit: {from_commit}, to_commit: {to_commit}")
        
        if not self.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"get_changed_files returning error: {error_msg}")
            return error_msg
        
        try:
            # Get the commit objects
            from_commit_obj = self.repo.commit(from_commit)
            to_commit_obj = self.repo.commit(to_commit)
            
            # Get the diff between the commits
            diff = from_commit_obj.diff(to_commit_obj)
            
            # Extract file paths from the diff
            changed_files = []
            for diff_item in diff:
                # Handle different types of changes (added, deleted, modified, renamed)
                if diff_item.a_path:
                    changed_files.append(diff_item.a_path)
                if diff_item.b_path and diff_item.b_path != diff_item.a_path:
                    changed_files.append(diff_item.b_path)
            
            # Remove duplicates and sort
            changed_files = sorted(list(set(changed_files)))
            
            self.log(f"get_changed_files returning {len(changed_files)} files")
            return changed_files
            
        except Exception as e:
            error_msg = {"error": f"Error getting changed files: {e}"}
            self.log(f"get_changed_files returning error: {error_msg}")
            return error_msg
    
    # Delegate methods to component modules
    def get_file_content(self, file_path, version='working'):
        """Get the content of a file from either HEAD, working directory, or specific commit"""
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
                # Treat version as a commit hash
                try:
                    commit = self.repo.commit(version)
                    blob = commit.tree[file_path]
                    content = blob.data_stream.read().decode('utf-8')
                    self.log(f"Content loaded for {file_path} at commit {version[:8]}, length: {len(content)}")
                    return content
                except (KeyError, git.exc.BadName):
                    # File doesn't exist in this commit
                    self.log(f"File {file_path} not found in commit {version}")
                    return ""
                
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

    # Interactive rebase methods - updated for webapp integration
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

    def _notify_file_saved(self, file_path):
        """Notify DiffEditor about file save events"""
        self.log(f"_notify_file_saved called for file: {file_path}")

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
                self.log(f"Successfully called DiffEditor.reloadIfCurrentFile for file: {file_path}")
            except Exception as e:
                self.log(f"Error calling DiffEditor.reloadIfCurrentFile: {e}")
            
        except Exception as e:
            self.log(f"Error in _notify_file_saved: {e}")
