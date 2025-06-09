import os
import subprocess
import tempfile


class GitOperations:
    """Handles basic Git operations like staging, committing, and file management"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
    
    def get_file_content(self, file_path, version='working'):
        """Get the content of a file from either HEAD or working directory"""
        self.repo.log(f"get_file_content called for {file_path}, version: {version}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"get_file_content returning error: {error_msg}")
            return error_msg
        
        try:
            if version == 'HEAD':
                # Get file content from HEAD commit
                try:
                    blob = self.repo.repo.head.commit.tree[file_path]
                    content = blob.data_stream.read().decode('utf-8')
                    self.repo.log(f"HEAD content loaded for {file_path}, length: {len(content)}")
                    return content
                except KeyError:
                    # File doesn't exist in HEAD (new file)
                    self.repo.log(f"File {file_path} not found in HEAD (new file)")
                    return ""
            elif version == 'working':
                # Get file content from working directory
                full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
                if os.path.exists(full_path):
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    self.repo.log(f"Working content loaded for {file_path}, length: {len(content)}")
                    return content
                else:
                    self.repo.log(f"File {file_path} not found in working directory")
                    return ""
            else:
                error_msg = {"error": f"Invalid version: {version}. Use 'HEAD' or 'working'"}
                self.repo.log(f"get_file_content returning error: {error_msg}")
                return error_msg
                
        except UnicodeDecodeError as e:
            error_msg = {"error": f"File {file_path} contains binary data or invalid encoding: {e}"}
            self.repo.log(f"get_file_content returning error: {error_msg}")
            return error_msg
        except Exception as e:
            error_msg = {"error": f"Error reading file {file_path}: {e}"}
            self.repo.log(f"get_file_content returning error: {error_msg}")
            return error_msg
            
    def save_file_content(self, file_path, content):
        """Save file content to disk in the working directory"""
        self.repo.log(f"save_file_content called for {file_path}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"save_file_content returning error: {error_msg}")
            return error_msg
        
        try:
            # Construct the full path
            full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            # Write content to file
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            self.repo.log(f"File {file_path} saved successfully")
            return {"status": "success", "message": f"File {file_path} saved successfully"}
            
        except Exception as e:
            error_msg = {"error": f"Error saving file {file_path}: {e}"}
            self.repo.log(f"save_file_content returning error: {error_msg}")
            return error_msg

    def delete_file(self, file_path):
        """Delete a file from the working directory"""
        self.repo.log(f"delete_file called for {file_path}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"delete_file returning error: {error_msg}")
            return error_msg
        
        try:
            # Construct the full path
            full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
            
            # Check if file exists
            if not os.path.exists(full_path):
                error_msg = {"error": f"File {file_path} does not exist"}
                self.repo.log(f"delete_file returning error: {error_msg}")
                return error_msg
            
            # Check if it's actually a file (not a directory)
            if not os.path.isfile(full_path):
                error_msg = {"error": f"Path {file_path} is not a file"}
                self.repo.log(f"delete_file returning error: {error_msg}")
                return error_msg
            
            # Delete the file
            os.remove(full_path)
            
            self.repo.log(f"File {file_path} deleted successfully")
            return {"status": "success", "message": f"File {file_path} deleted successfully"}
            
        except Exception as e:
            error_msg = {"error": f"Error deleting file {file_path}: {e}"}
            self.repo.log(f"delete_file returning error: {error_msg}")
            return error_msg
            
    def stage_file(self, file_path):
        """Stage a specific file in the repository"""
        self.repo.log(f"stage_file called for {file_path}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"stage_file returning error: {error_msg}")
            return error_msg
            
        try:
            # Construct the full path
            full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
            
            # Check if file exists
            if not os.path.exists(full_path):
                error_msg = {"error": f"File {file_path} does not exist"}
                self.repo.log(f"stage_file returning error: {error_msg}")
                return error_msg
                
            # Stage the file
            self.repo.log(f"Staging file: {file_path}")
            self.repo.repo.git.add(file_path)
            
            self.repo.log(f"File {file_path} staged successfully")
            return {"status": "success", "message": f"File {file_path} staged successfully"}
            
        except Exception as e:
            error_msg = {"error": f"Error staging file {file_path}: {e}"}
            self.repo.log(f"stage_file returning error: {error_msg}")
            return error_msg
    
    def unstage_file(self, file_path):
        """Unstage a specific file in the repository"""
        self.repo.log(f"unstage_file called for {file_path}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"unstage_file returning error: {error_msg}")
            return error_msg
            
        try:
            # Check if file is staged
            staged_files = [item.a_path for item in self.repo.repo.index.diff("HEAD")]
            if file_path not in staged_files:
                error_msg = {"error": f"File {file_path} is not staged"}
                self.repo.log(f"unstage_file returning error: {error_msg}")
                return error_msg
                
            # Unstage the file (restore index)
            self.repo.log(f"Unstaging file: {file_path}")
            self.repo.repo.git.restore('--staged', file_path)
            
            self.repo.log(f"File {file_path} unstaged successfully")
            return {"status": "success", "message": f"File {file_path} unstaged successfully"}
            
        except Exception as e:
            error_msg = {"error": f"Error unstaging file {file_path}: {e}"}
            self.repo.log(f"unstage_file returning error: {error_msg}")
            return error_msg
            
    def discard_changes(self, file_path):
        """Discard changes to a specific file in the repository by checking it out from HEAD"""
        self.repo.log(f"discard_changes called for {file_path}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"discard_changes returning error: {error_msg}")
            return error_msg
            
        try:
            # Check if file is modified
            modified_files = [item.a_path for item in self.repo.repo.index.diff(None)]
            if file_path not in modified_files:
                error_msg = {"error": f"File {file_path} has no changes to discard"}
                self.repo.log(f"discard_changes returning error: {error_msg}")
                return error_msg
                
            # Discard the changes by checking out from HEAD or index
            self.repo.log(f"Discarding changes to file: {file_path}")
            # This will restore the file to its state in the index (if it's there) or HEAD
            self.repo.repo.git.restore(file_path)
            
            self.repo.log(f"Changes to file {file_path} discarded successfully")
            return {"status": "success", "message": f"Changes to file {file_path} discarded successfully"}
            
        except Exception as e:
            error_msg = {"error": f"Error discarding changes to file {file_path}: {e}"}
            self.repo.log(f"discard_changes returning error: {error_msg}")
            return error_msg
            
    def commit_file(self, file_path, commit_message):
        """Commit a specific file to the repository"""
        self.repo.log(f"commit_file called for {file_path} with message: {commit_message}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"commit_file returning error: {error_msg}")
            return error_msg
            
        try:
            # Construct the full path
            full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
            
            # Check if file exists
            if not os.path.exists(full_path):
                error_msg = {"error": f"File {file_path} does not exist"}
                self.repo.log(f"commit_file returning error: {error_msg}")
                return error_msg
                
            # Stage the file
            self.repo.log(f"Staging file: {file_path}")
            self.repo.repo.git.add(file_path)
            
            # Commit the staged changes
            self.repo.log(f"Committing file with message: {commit_message}")
            commit_result = self.repo.repo.git.commit('-m', commit_message)
            
            self.repo.log(f"File {file_path} committed successfully: {commit_result}")
            return {"status": "success", "message": f"File {file_path} committed successfully", "details": commit_result}
            
        except Exception as e:
            error_msg = {"error": f"Error committing file {file_path}: {e}"}
            self.repo.log(f"commit_file returning error: {error_msg}")
            return error_msg

    # Interactive rebase methods
    def start_interactive_rebase(self, from_commit, to_commit):
        """Start an interactive rebase between two commits"""
        self.repo.log(f"start_interactive_rebase called with from_commit: {from_commit}, to_commit: {to_commit}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"start_interactive_rebase returning error: {error_msg}")
            return error_msg
        
        try:
            # Get commits between from_commit and to_commit
            commits = []
            for commit in self.repo.repo.iter_commits(f"{from_commit}..{to_commit}"):
                commits.append({
                    'hash': commit.hexsha,
                    'message': commit.message.strip(),
                    'author': commit.author.name,
                    'date': commit.committed_datetime.isoformat(),
                    'action': 'pick'  # default action
                })
            
            # Reverse to get chronological order (oldest first)
            commits.reverse()
            
            self.repo.log(f"Found {len(commits)} commits for interactive rebase")
            return {"success": True, "commits": commits}
            
        except Exception as e:
            error_msg = {"error": f"Error starting interactive rebase: {e}"}
            self.repo.log(f"start_interactive_rebase returning error: {error_msg}")
            return error_msg

    def execute_rebase(self, rebase_plan):
        """Execute the interactive rebase with the given plan"""
        self.repo.log(f"execute_rebase called with {len(rebase_plan)} commits")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"execute_rebase returning error: {error_msg}")
            return error_msg
        
        try:
            # Create a temporary rebase script
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                for commit in rebase_plan:
                    action = commit.get('action', 'pick')
                    commit_hash = commit['hash']
                    message = commit.get('message', '').replace('\n', ' ')
                    
                    if action == 'drop':
                        continue  # Skip dropped commits
                    
                    f.write(f"{action} {commit_hash} {message}\n")
                
                script_path = f.name
            
            try:
                # Set up environment for interactive rebase
                env = os.environ.copy()
                env['GIT_SEQUENCE_EDITOR'] = f'cp {script_path}'
                
                # Start the rebase
                result = subprocess.run([
                    'git', 'rebase', '-i', '--autosquash', f"{rebase_plan[0]['hash']}^"
                ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True, env=env)
                
                if result.returncode == 0:
                    self.repo.log("Interactive rebase completed successfully")
                    return {"success": True}
                else:
                    # Check if there are conflicts
                    status_result = subprocess.run([
                        'git', 'status', '--porcelain'
                    ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True)
                    
                    conflict_files = []
                    if status_result.returncode == 0:
                        for line in status_result.stdout.strip().split('\n'):
                            if line.startswith('UU ') or line.startswith('AA ') or line.startswith('DD '):
                                conflict_files.append(line[3:])
                    
                    if conflict_files:
                        self.repo.log(f"Rebase conflicts detected in files: {conflict_files}")
                        return {
                            "success": False,
                            "conflicts": conflict_files,
                            "currentStep": 1,
                            "error": "Conflicts detected during rebase"
                        }
                    else:
                        error_msg = {"error": f"Rebase failed: {result.stderr}"}
                        self.repo.log(f"execute_rebase returning error: {error_msg}")
                        return error_msg
                        
            finally:
                # Clean up temporary file
                try:
                    os.unlink(script_path)
                except:
                    pass
                    
        except Exception as e:
            error_msg = {"error": f"Error executing rebase: {e}"}
            self.repo.log(f"execute_rebase returning error: {error_msg}")
            return error_msg

    def get_conflict_content(self, file_path):
        """Get the conflict content for a file (ours, theirs, and merged)"""
        self.repo.log(f"get_conflict_content called for {file_path}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"get_conflict_content returning error: {error_msg}")
            return error_msg
        
        try:
            full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
            
            # Get the merged content with conflict markers
            merged_content = ""
            if os.path.exists(full_path):
                with open(full_path, 'r', encoding='utf-8') as f:
                    merged_content = f.read()
            
            # Get "ours" version (current branch)
            ours_content = ""
            try:
                result = subprocess.run([
                    'git', 'show', f':2:{file_path}'
                ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True)
                if result.returncode == 0:
                    ours_content = result.stdout
            except:
                pass
            
            # Get "theirs" version (incoming branch)
            theirs_content = ""
            try:
                result = subprocess.run([
                    'git', 'show', f':3:{file_path}'
                ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True)
                if result.returncode == 0:
                    theirs_content = result.stdout
            except:
                pass
            
            return {
                "success": True,
                "ours": ours_content,
                "theirs": theirs_content,
                "merged": merged_content
            }
            
        except Exception as e:
            error_msg = {"error": f"Error getting conflict content: {e}"}
            self.repo.log(f"get_conflict_content returning error: {error_msg}")
            return error_msg

    def resolve_conflict(self, file_path, resolved_content):
        """Resolve a conflict by saving the resolved content and staging the file"""
        self.repo.log(f"resolve_conflict called for {file_path}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"resolve_conflict returning error: {error_msg}")
            return error_msg
        
        try:
            full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
            
            # Write the resolved content
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(resolved_content)
            
            # Stage the resolved file
            self.repo.repo.git.add(file_path)
            
            self.repo.log(f"Conflict resolved and staged for {file_path}")
            return {"success": True, "message": f"Conflict resolved for {file_path}"}
            
        except Exception as e:
            error_msg = {"error": f"Error resolving conflict: {e}"}
            self.repo.log(f"resolve_conflict returning error: {error_msg}")
            return error_msg

    def continue_rebase(self):
        """Continue the rebase after resolving conflicts"""
        self.repo.log("continue_rebase called")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"continue_rebase returning error: {error_msg}")
            return error_msg
        
        try:
            result = subprocess.run([
                'git', 'rebase', '--continue'
            ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True)
            
            if result.returncode == 0:
                self.repo.log("Rebase continued successfully")
                return {"success": True}
            else:
                # Check for more conflicts
                status_result = subprocess.run([
                    'git', 'status', '--porcelain'
                ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True)
                
                conflict_files = []
                if status_result.returncode == 0:
                    for line in status_result.stdout.strip().split('\n'):
                        if line.startswith('UU ') or line.startswith('AA ') or line.startswith('DD '):
                            conflict_files.append(line[3:])
                
                if conflict_files:
                    self.repo.log(f"More conflicts detected: {conflict_files}")
                    return {
                        "success": False,
                        "conflicts": conflict_files,
                        "error": "More conflicts detected"
                    }
                else:
                    error_msg = {"error": f"Failed to continue rebase: {result.stderr}"}
                    self.repo.log(f"continue_rebase returning error: {error_msg}")
                    return error_msg
                    
        except Exception as e:
            error_msg = {"error": f"Error continuing rebase: {e}"}
            self.repo.log(f"continue_rebase returning error: {error_msg}")
            return error_msg

    def abort_rebase(self):
        """Abort the current rebase"""
        self.repo.log("abort_rebase called")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"abort_rebase returning error: {error_msg}")
            return error_msg
        
        try:
            result = subprocess.run([
                'git', 'rebase', '--abort'
            ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True)
            
            if result.returncode == 0:
                self.repo.log("Rebase aborted successfully")
                return {"success": True, "message": "Rebase aborted successfully"}
            else:
                error_msg = {"error": f"Failed to abort rebase: {result.stderr}"}
                self.repo.log(f"abort_rebase returning error: {error_msg}")
                return error_msg
                
        except Exception as e:
            error_msg = {"error": f"Error aborting rebase: {e}"}
            self.repo.log(f"abort_rebase returning error: {error_msg}")
            return error_msg
