import os
import subprocess
import tempfile

class GitRebaseOperations:
    """Handles Git rebase operations including interactive rebase and conflict resolution"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
    
    def start_interactive_rebase(self, from_commit, to_commit):
        """Start an interactive rebase between two commits"""
        if not self.repo.repo:
            return {"error": "No Git repository available"}
        
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
            
            return {"success": True, "commits": commits}
            
        except Exception as e:
            return {"error": f"Error starting interactive rebase: {e}"}

    def get_rebase_status(self):
        """Get the current rebase status and todo file content"""
        if not self.repo.repo:
            return {"error": "No Git repository available"}
        
        try:
            git_dir = self.repo.repo.git_dir
            rebase_merge_dir = os.path.join(git_dir, 'rebase-merge')
            rebase_apply_dir = os.path.join(git_dir, 'rebase-apply')
            
            # Check if we're in a rebase
            if os.path.exists(rebase_merge_dir):
                # Interactive rebase
                todo_file = os.path.join(rebase_merge_dir, 'git-rebase-todo')
                done_file = os.path.join(rebase_merge_dir, 'done')
                head_name_file = os.path.join(rebase_merge_dir, 'head-name')
                onto_file = os.path.join(rebase_merge_dir, 'onto')
                
                todo_content = ""
                done_content = ""
                head_name = ""
                onto = ""
                
                if os.path.exists(todo_file):
                    with open(todo_file, 'r', encoding='utf-8') as f:
                        todo_content = f.read()
                
                if os.path.exists(done_file):
                    with open(done_file, 'r', encoding='utf-8') as f:
                        done_content = f.read()
                
                if os.path.exists(head_name_file):
                    with open(head_name_file, 'r', encoding='utf-8') as f:
                        head_name = f.read().strip()
                
                if os.path.exists(onto_file):
                    with open(onto_file, 'r', encoding='utf-8') as f:
                        onto = f.read().strip()
                
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
                
                return result
                
            elif os.path.exists(rebase_apply_dir):
                # Non-interactive rebase
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
                from .git_operations_editor import GitEditorOperations
                editor_ops = GitEditorOperations(self.repo)
                editor_status = editor_ops.get_git_editor_status()
                return {
                    "in_rebase": False,
                    "editor_status": editor_status
                }
                
        except Exception as e:
            return {"error": f"Error getting rebase status: {e}"}

    def execute_rebase(self, rebase_plan=None):
        """Execute the interactive rebase with the given plan or continue existing rebase"""
        if not self.repo.repo:
            return {"error": "No Git repository available"}
        
        try:
            # Check if we're already in a rebase
            rebase_status = self.get_rebase_status()
            
            if rebase_status.get("in_rebase"):
                # Continue existing rebase
                return self.continue_rebase()
            
            # Start new rebase if rebase_plan is provided
            if not rebase_plan:
                return {"error": "No rebase plan provided and no active rebase found"}
            
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
                        return {
                            "success": False,
                            "conflicts": conflict_files,
                            "currentStep": 1,
                            "error": "Conflicts detected during rebase"
                        }
                    else:
                        return {"error": f"Rebase failed: {result.stderr}"}
                        
            finally:
                # Clean up temporary file
                try:
                    os.unlink(script_path)
                except:
                    pass
                    
        except Exception as e:
            return {"error": f"Error executing rebase: {e}"}

    def get_conflict_content(self, file_path):
        """Get the conflict content for a file (ours, theirs, and merged)"""
        if not self.repo.repo:
            return {"error": "No Git repository available"}
        
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
            return {"error": f"Error getting conflict content: {e}"}

    def resolve_conflict(self, file_path, resolved_content):
        """Resolve a conflict by saving the resolved content and staging the file"""
        if not self.repo.repo:
            return {"error": "No Git repository available"}
        
        try:
            full_path = os.path.join(self.repo.repo.working_tree_dir, file_path)
            
            # Write the resolved content
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(resolved_content)
            
            # Stage the resolved file
            self.repo.repo.git.add(file_path)
            
            return {"success": True, "message": f"Conflict resolved for {file_path}"}
            
        except Exception as e:
            return {"error": f"Error resolving conflict: {e}"}

    def continue_rebase(self):
        """Continue the rebase after resolving conflicts"""
        if not self.repo.repo:
            return {"error": "No Git repository available"}
        
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
                    return {
                        "success": False,
                        "conflicts": conflict_files,
                        "error": "More conflicts detected"
                    }
                else:
                    return {"error": f"Failed to continue rebase: {result.stderr}"}
                    
        except Exception as e:
            return {"error": f"Error continuing rebase: {e}"}

    def abort_rebase(self):
        """Abort the current rebase"""
        if not self.repo.repo:
            return {"error": "No Git repository available"}
        
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
                return {"success": True, "message": "Rebase aborted successfully"}
            else:
                return {"error": f"Failed to abort rebase: {result.stderr}"}
                
        except Exception as e:
            return {"error": f"Error aborting rebase: {e}"}
