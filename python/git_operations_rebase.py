import os
import subprocess
import tempfile


class GitRebaseOperations:
    """Handles Git rebase operations including interactive rebase and conflict resolution"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
    
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
                from .git_operations_editor import GitEditorOperations
                editor_ops = GitEditorOperations(self.repo)
                editor_status = editor_ops.get_git_editor_status()
                
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
                from .git_operations_editor import GitEditorOperations
                editor_ops = GitEditorOperations(self.repo)
                editor_status = editor_ops.get_git_editor_status()
                return {
                    "in_rebase": True,
                    "rebase_type": "apply",
                    "message": "Non-interactive rebase in progress",
                    "editor_status": editor_status
                }
            else:
                self.repo.log("No rebase in progress")
                from .git_operations_editor import GitEditorOperations
                editor_ops = GitEditorOperations(self.repo)
                editor_status = editor_ops.get_git_editor_status()
                return {
                    "in_rebase": False,
                    "editor_status": editor_status
                }
                
        except Exception as e:
            error_msg = {"error": f"Error getting rebase status: {e}"}
            self.repo.log(f"get_rebase_status returning error: {error_msg}")
            return error_msg

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
