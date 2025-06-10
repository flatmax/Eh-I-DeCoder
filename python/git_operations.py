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

    def commit_staged_changes(self, message="Rebase commit"):
        """Commit all staged changes"""
        self.repo.log(f"commit_staged_changes called with message: {message}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"commit_staged_changes returning error: {error_msg}")
            return error_msg
        
        try:
            # Set up environment to prevent interactive editors
            env = os.environ.copy()
            env['GIT_EDITOR'] = 'true'  # Use 'true' command which does nothing
            env['EDITOR'] = 'true'
            env['VISUAL'] = 'true'
            
            result = subprocess.run([
                'git', 'commit', '-m', message
            ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True, env=env)
            
            if result.returncode == 0:
                self.repo.log("Staged changes committed successfully")
                return {"success": True, "message": "Staged changes committed successfully"}
            else:
                error_msg = {"error": f"Failed to commit staged changes: {result.stderr}"}
                self.repo.log(f"commit_staged_changes returning error: {error_msg}")
                return error_msg
                
        except Exception as e:
            error_msg = {"error": f"Error committing staged changes: {e}"}
            self.repo.log(f"commit_staged_changes returning error: {error_msg}")
            return error_msg

    def commit_amend(self):
        """Amend the previous commit with staged changes"""
        self.repo.log("commit_amend called")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"commit_amend returning error: {error_msg}")
            return error_msg
        
        try:
            # Set up environment to prevent interactive editors
            env = os.environ.copy()
            env['GIT_EDITOR'] = 'true'  # Use 'true' command which does nothing
            env['EDITOR'] = 'true'
            env['VISUAL'] = 'true'
            
            result = subprocess.run([
                'git', 'commit', '--amend', '--no-edit'
            ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True, env=env)
            
            if result.returncode == 0:
                self.repo.log("Commit amended successfully")
                return {"success": True, "message": "Commit amended successfully"}
            else:
                error_msg = {"error": f"Failed to amend commit: {result.stderr}"}
                self.repo.log(f"commit_amend returning error: {error_msg}")
                return error_msg
                
        except Exception as e:
            error_msg = {"error": f"Error amending commit: {e}"}
            self.repo.log(f"commit_amend returning error: {error_msg}")
            return error_msg

    def get_raw_git_status(self):
        """Get the raw git status output as it appears in the terminal"""
        self.repo.log("get_raw_git_status called")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"get_raw_git_status returning error: {error_msg}")
            return error_msg
        
        try:
            # Run git status command to get the raw output
            result = subprocess.run([
                'git', 'status'
            ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True)
            
            if result.returncode == 0:
                raw_status = result.stdout.strip()
                self.repo.log(f"Raw git status output length: {len(raw_status)}")
                return {"success": True, "raw_status": raw_status}
            else:
                error_msg = {"error": f"Git status command failed: {result.stderr}"}
                self.repo.log(f"get_raw_git_status returning error: {error_msg}")
                return error_msg
                
        except Exception as e:
            error_msg = {"error": f"Error getting raw git status: {e}"}
            self.repo.log(f"get_raw_git_status returning error: {error_msg}")
            return error_msg

    # Interactive rebase methods - updated for webapp integration
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

    def _is_git_operation_active(self):
        """Check if there's an active Git operation that would be waiting for editor input"""
        git_dir = self.repo.repo.git_dir
        
        # Check for active rebase
        if (os.path.exists(os.path.join(git_dir, 'rebase-merge')) or 
            os.path.exists(os.path.join(git_dir, 'rebase-apply'))):
            return True
            
        # Check for active merge
        if os.path.exists(os.path.join(git_dir, 'MERGE_HEAD')):
            return True
            
        # Check for active cherry-pick
        if os.path.exists(os.path.join(git_dir, 'CHERRY_PICK_HEAD')):
            return True
            
        # Check for active revert
        if os.path.exists(os.path.join(git_dir, 'REVERT_HEAD')):
            return True
            
        # Check if Git is currently running (this is harder to detect reliably)
        # We can check for lock files that indicate active Git operations
        lock_files = [
            'index.lock',
            'HEAD.lock',
            'config.lock'
        ]
        
        for lock_file in lock_files:
            if os.path.exists(os.path.join(git_dir, lock_file)):
                return True
                
        return False

    def get_git_editor_status(self):
        """Get comprehensive Git editor status - detects what Git is waiting for"""
        self.repo.log("get_git_editor_status called")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"get_git_editor_status returning error: {error_msg}")
            return error_msg
        
        try:
            git_dir = self.repo.repo.git_dir
            working_dir = self.repo.repo.working_tree_dir
            
            # First check if there's actually an active Git operation
            if not self._is_git_operation_active():
                self.repo.log("No active Git operation detected - ignoring editor files")
                return {
                    'waiting_for_editor': False,
                    'primary_file': None,
                    'all_files': [],
                    'count': 0
                }
            
            # Check for various Git editor scenarios
            editor_files = []
            
            # 1. Rebase todo file (interactive rebase)
            rebase_merge_dir = os.path.join(git_dir, 'rebase-merge')
            if os.path.exists(rebase_merge_dir):
                todo_file = os.path.join(rebase_merge_dir, 'git-rebase-todo')
                if os.path.exists(todo_file):
                    with open(todo_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    if content.strip():
                        editor_files.append({
                            'type': 'rebase_todo',
                            'file': 'git-rebase-todo',
                            'path': todo_file,
                            'content': content,
                            'description': 'Interactive Rebase Todo File',
                            'instructions': 'Edit the rebase plan. Available commands: pick, drop, squash, edit, reword'
                        })
            
            # 2. Commit message editing (COMMIT_EDITMSG) - only if there's an active operation
            commit_msg_file = os.path.join(git_dir, 'COMMIT_EDITMSG')
            if os.path.exists(commit_msg_file):
                # Additional check: only consider this if we have staged changes or are in a special state
                try:
                    # Check if there are staged changes
                    staged_files = [item.a_path for item in self.repo.repo.index.diff("HEAD")]
                    has_staged_changes = len(staged_files) > 0
                    
                    # Check if we're in a commit-like state
                    in_commit_state = (
                        os.path.exists(os.path.join(git_dir, 'MERGE_HEAD')) or
                        os.path.exists(os.path.join(git_dir, 'CHERRY_PICK_HEAD')) or
                        os.path.exists(os.path.join(git_dir, 'REVERT_HEAD'))
                    )
                    
                    if has_staged_changes or in_commit_state:
                        with open(commit_msg_file, 'r', encoding='utf-8') as f:
                            content = f.read()
                        editor_files.append({
                            'type': 'commit_message',
                            'file': 'COMMIT_EDITMSG',
                            'path': commit_msg_file,
                            'content': content,
                            'description': 'Commit Message',
                            'instructions': 'Edit the commit message. Lines starting with # are comments and will be ignored.'
                        })
                    else:
                        self.repo.log("COMMIT_EDITMSG exists but no staged changes or active commit state - ignoring")
                        
                except Exception as e:
                    self.repo.log(f"Error checking staged changes: {e}")
            
            # 3. Merge commit message (MERGE_MSG) - only if MERGE_HEAD exists
            if os.path.exists(os.path.join(git_dir, 'MERGE_HEAD')):
                merge_msg_file = os.path.join(git_dir, 'MERGE_MSG')
                if os.path.exists(merge_msg_file):
                    with open(merge_msg_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    editor_files.append({
                        'type': 'merge_message',
                        'file': 'MERGE_MSG',
                        'path': merge_msg_file,
                        'content': content,
                        'description': 'Merge Commit Message',
                        'instructions': 'Edit the merge commit message. This will be used for the merge commit.'
                    })
            
            # 4. Squash commit message (SQUASH_MSG)
            squash_msg_file = os.path.join(git_dir, 'SQUASH_MSG')
            if os.path.exists(squash_msg_file):
                with open(squash_msg_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                editor_files.append({
                    'type': 'squash_message',
                    'file': 'SQUASH_MSG',
                    'path': squash_msg_file,
                    'content': content,
                    'description': 'Squash Commit Message',
                    'instructions': 'Edit the commit message for the squashed commits.'
                })
            
            # 5. Tag message (TAG_EDITMSG)
            tag_msg_file = os.path.join(git_dir, 'TAG_EDITMSG')
            if os.path.exists(tag_msg_file):
                with open(tag_msg_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                editor_files.append({
                    'type': 'tag_message',
                    'file': 'TAG_EDITMSG',
                    'path': tag_msg_file,
                    'content': content,
                    'description': 'Tag Message',
                    'instructions': 'Edit the tag message.'
                })
            
            # 6. Git config editing (if .git/config.edit exists - custom indicator)
            config_edit_file = os.path.join(git_dir, 'config.edit')
            if os.path.exists(config_edit_file):
                config_file = os.path.join(git_dir, 'config')
                if os.path.exists(config_file):
                    with open(config_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    editor_files.append({
                        'type': 'config',
                        'file': 'config',
                        'path': config_file,
                        'content': content,
                        'description': 'Git Configuration',
                        'instructions': 'Edit the Git configuration file.'
                    })
            
            # Determine overall status
            if editor_files:
                # Prioritize by importance
                primary_file = editor_files[0]
                for ef in editor_files:
                    if ef['type'] == 'rebase_todo':
                        primary_file = ef
                        break
                    elif ef['type'] in ['commit_message', 'merge_message'] and primary_file['type'] not in ['rebase_todo']:
                        primary_file = ef
                
                result = {
                    'waiting_for_editor': True,
                    'primary_file': primary_file,
                    'all_files': editor_files,
                    'count': len(editor_files)
                }
            else:
                result = {
                    'waiting_for_editor': False,
                    'primary_file': None,
                    'all_files': [],
                    'count': 0
                }
            
            self.repo.log(f"get_git_editor_status returning: waiting={result['waiting_for_editor']}, count={result['count']}")
            return result
            
        except Exception as e:
            error_msg = {"error": f"Error getting Git editor status: {e}"}
            self.repo.log(f"get_git_editor_status returning error: {error_msg}")
            return error_msg

    def get_rebase_status(self):
        """Get the current rebase status and todo file content"""
        self.repo.log("get_rebase_status called")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"get_rebase_status returning error: {error_msg}")
            return error_msg
        
        try:
            git_dir = self.repo.repo.git_dir
            rebase_merge_dir = os.path.join(git_dir, 'rebase-merge')
            rebase_apply_dir = os.path.join(git_dir, 'rebase-apply')
            
            self.repo.log(f"Checking for rebase directories:")
            self.repo.log(f"  rebase-merge: {rebase_merge_dir} (exists: {os.path.exists(rebase_merge_dir)})")
            self.repo.log(f"  rebase-apply: {rebase_apply_dir} (exists: {os.path.exists(rebase_apply_dir)})")
            
            # Check if we're in a rebase
            if os.path.exists(rebase_merge_dir):
                # Interactive rebase
                todo_file = os.path.join(rebase_merge_dir, 'git-rebase-todo')
                done_file = os.path.join(rebase_merge_dir, 'done')
                head_name_file = os.path.join(rebase_merge_dir, 'head-name')
                onto_file = os.path.join(rebase_merge_dir, 'onto')
                
                self.repo.log(f"Interactive rebase detected. Checking files:")
                self.repo.log(f"  todo file: {todo_file} (exists: {os.path.exists(todo_file)})")
                self.repo.log(f"  done file: {done_file} (exists: {os.path.exists(done_file)})")
                
                todo_content = ""
                done_content = ""
                head_name = ""
                onto = ""
                
                if os.path.exists(todo_file):
                    with open(todo_file, 'r', encoding='utf-8') as f:
                        todo_content = f.read()
                    self.repo.log(f"Todo file content length: {len(todo_content)}")
                    if todo_content.strip():
                        self.repo.log(f"Todo file content preview: {todo_content[:200]}...")
                    else:
                        self.repo.log("Todo file is empty or contains only whitespace")
                
                if os.path.exists(done_file):
                    with open(done_file, 'r', encoding='utf-8') as f:
                        done_content = f.read()
                    self.repo.log(f"Done file content length: {len(done_content)}")
                
                if os.path.exists(head_name_file):
                    with open(head_name_file, 'r', encoding='utf-8') as f:
                        head_name = f.read().strip()
                    self.repo.log(f"Head name: {head_name}")
                
                if os.path.exists(onto_file):
                    with open(onto_file, 'r', encoding='utf-8') as f:
                        onto = f.read().strip()
                    self.repo.log(f"Onto: {onto}")
                
                # Check if we have todo content or if the rebase is waiting for editor
                has_todo_content = bool(todo_content.strip())
                
                # Get comprehensive editor status
                editor_status = self.get_git_editor_status()
                
                result = {
                    "in_rebase": True,
                    "rebase_type": "interactive",
                    "todo_content": todo_content,
                    "done_content": done_content,
                    "head_name": head_name,
                    "onto": onto,
                    "todo_file_path": todo_file,
                    "has_todo_content": has_todo_content,
                    "editor_status": editor_status
                }
                
                self.repo.log(f"Returning rebase status: in_rebase=True, has_todo_content={has_todo_content}")
                return result
                
            elif os.path.exists(rebase_apply_dir):
                # Non-interactive rebase
                self.repo.log("Non-interactive rebase detected")
                editor_status = self.get_git_editor_status()
                return {
                    "in_rebase": True,
                    "rebase_type": "apply",
                    "message": "Non-interactive rebase in progress",
                    "editor_status": editor_status
                }
            else:
                self.repo.log("No rebase in progress")
                editor_status = self.get_git_editor_status()
                return {
                    "in_rebase": False,
                    "editor_status": editor_status
                }
                
        except Exception as e:
            error_msg = {"error": f"Error getting rebase status: {e}"}
            self.repo.log(f"get_rebase_status returning error: {error_msg}")
            return error_msg

    def save_git_editor_file(self, file_type, content):
        """Save content to the appropriate Git editor file"""
        self.repo.log(f"save_git_editor_file called for type: {file_type}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"save_git_editor_file returning error: {error_msg}")
            return error_msg
        
        try:
            git_dir = self.repo.repo.git_dir
            
            # Map file types to actual file paths
            file_map = {
                'rebase_todo': os.path.join(git_dir, 'rebase-merge', 'git-rebase-todo'),
                'commit_message': os.path.join(git_dir, 'COMMIT_EDITMSG'),
                'merge_message': os.path.join(git_dir, 'MERGE_MSG'),
                'squash_message': os.path.join(git_dir, 'SQUASH_MSG'),
                'tag_message': os.path.join(git_dir, 'TAG_EDITMSG'),
                'config': os.path.join(git_dir, 'config')
            }
            
            if file_type not in file_map:
                error_msg = {"error": f"Unknown file type: {file_type}"}
                self.repo.log(f"save_git_editor_file returning error: {error_msg}")
                return error_msg
            
            file_path = file_map[file_type]
            
            # Check if the file exists (should exist if Git is waiting for it)
            if not os.path.exists(file_path):
                error_msg = {"error": f"Git editor file not found: {file_path}"}
                self.repo.log(f"save_git_editor_file returning error: {error_msg}")
                return error_msg
            
            # Save the content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            self.repo.log(f"Git editor file saved successfully: {file_path}")
            
            # For rebase todo, continue the rebase automatically
            if file_type == 'rebase_todo':
                return self._continue_after_rebase_todo_save()
            
            return {"success": True, "message": f"Git editor file saved successfully"}
            
        except Exception as e:
            error_msg = {"error": f"Error saving Git editor file: {e}"}
            self.repo.log(f"save_git_editor_file returning error: {error_msg}")
            return error_msg

    def _continue_after_rebase_todo_save(self):
        """Continue rebase after saving todo file"""
        try:
            self.repo.log("Attempting to continue rebase after saving todo file")
            
            # Set up environment to prevent interactive editors
            env = os.environ.copy()
            env['GIT_EDITOR'] = 'true'
            env['EDITOR'] = 'true'
            env['VISUAL'] = 'true'
            env['GIT_SEQUENCE_EDITOR'] = 'true'
            
            result = subprocess.run([
                'git', 'rebase', '--continue'
            ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True, 
              input='', timeout=30, env=env)
            
            self.repo.log(f"Git rebase --continue result: returncode={result.returncode}")
            self.repo.log(f"Git rebase --continue stdout: {result.stdout}")
            self.repo.log(f"Git rebase --continue stderr: {result.stderr}")
            
            if result.returncode == 0:
                self.repo.log("Rebase continued automatically after saving todo file")
            else:
                self.repo.log(f"Rebase continue returned non-zero: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            self.repo.log("Rebase continue timed out - this may be normal")
        except Exception as e:
            self.repo.log(f"Error continuing rebase after todo save: {e}")
        
        return {"success": True, "message": "Rebase todo file saved successfully"}

    def save_rebase_todo(self, todo_content):
        """Save the rebase todo file content"""
        return self.save_git_editor_file('rebase_todo', todo_content)

    def execute_rebase(self, rebase_plan=None):
        """Execute the interactive rebase with the given plan or continue existing rebase"""
        self.repo.log(f"execute_rebase called")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"execute_rebase returning error: {error_msg}")
            return error_msg
        
        try:
            # Check if we're already in a rebase
            rebase_status = self.get_rebase_status()
            
            if rebase_status.get("in_rebase"):
                # Continue existing rebase
                self.repo.log("Continuing existing rebase")
                return self.continue_rebase()
            
            # Start new rebase if rebase_plan is provided
            if not rebase_plan:
                error_msg = {"error": "No rebase plan provided and no active rebase found"}
                self.repo.log(f"execute_rebase returning error: {error_msg}")
                return error_msg
            
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
                # Set up environment for interactive rebase - prevent any editors
                env = os.environ.copy()
                env['GIT_SEQUENCE_EDITOR'] = f'cp {script_path}'
                env['GIT_EDITOR'] = 'true'  # Use 'true' command which does nothing
                env['EDITOR'] = 'true'
                env['VISUAL'] = 'true'
                
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
            # Set up environment to prevent interactive editors
            env = os.environ.copy()
            env['GIT_EDITOR'] = 'true'  # Use 'true' command which does nothing
            env['EDITOR'] = 'true'
            env['VISUAL'] = 'true'
            env['GIT_SEQUENCE_EDITOR'] = 'true'
            
            result = subprocess.run([
                'git', 'rebase', '--continue'
            ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True, env=env)
            
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
            # Set up environment to prevent interactive editors
            env = os.environ.copy()
            env['GIT_EDITOR'] = 'true'  # Use 'true' command which does nothing
            env['EDITOR'] = 'true'
            env['VISUAL'] = 'true'
            env['GIT_SEQUENCE_EDITOR'] = 'true'
            
            result = subprocess.run([
                'git', 'rebase', '--abort'
            ], cwd=self.repo.repo.working_tree_dir, capture_output=True, text=True, env=env)
            
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
