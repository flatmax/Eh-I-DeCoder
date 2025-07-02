import os
import subprocess

class GitEditorOperations:
    """Handles Git editor operations and status detection"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
    
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
        if not self.repo.repo:
            return {"error": "No Git repository available"}
        
        try:
            git_dir = self.repo.repo.git_dir
            working_dir = self.repo.repo.working_tree_dir
            
            # First check if there's actually an active Git operation
            if not self._is_git_operation_active():
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
            
            return result
            
        except Exception as e:
            return {"error": f"Error getting Git editor status: {e}"}

    def save_git_editor_file(self, file_type, content):
        """Save content to the appropriate Git editor file"""
        if not self.repo.repo:
            return {"error": "No Git repository available"}
        
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
                return {"error": f"Unknown file type: {file_type}"}
            
            file_path = file_map[file_type]
            
            # Check if the file exists (should exist if Git is waiting for it)
            if not os.path.exists(file_path):
                return {"error": f"Git editor file not found: {file_path}"}
            
            # Save the content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # For rebase todo, continue the rebase automatically
            if file_type == 'rebase_todo':
                return self._continue_after_rebase_todo_save()
            
            return {"success": True, "message": f"Git editor file saved successfully"}
            
        except Exception as e:
            return {"error": f"Error saving Git editor file: {e}"}

    def _continue_after_rebase_todo_save(self):
        """Continue rebase after saving todo file"""
        try:
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
            
            if result.returncode != 0:
                self.repo.log(f"Rebase continue returned non-zero: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            pass  # This may be normal
        except Exception as e:
            self.repo.log(f"Error continuing rebase after todo save: {e}")
        
        return {"success": True, "message": "Rebase todo file saved successfully"}

    def save_rebase_todo(self, todo_content):
        """Save the rebase todo file content"""
        return self.save_git_editor_file('rebase_todo', todo_content)
