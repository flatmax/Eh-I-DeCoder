import os
import subprocess
import tempfile

try:
    from .git_operations_basic import GitBasicOperations
    from .git_operations_rebase import GitRebaseOperations
    from .git_operations_editor import GitEditorOperations
    from .exceptions import GitError, GitRepositoryError, FileOperationError, create_error_response
except ImportError:
    from git_operations_basic import GitBasicOperations
    from git_operations_rebase import GitRebaseOperations
    from git_operations_editor import GitEditorOperations
    from exceptions import GitError, GitRepositoryError, FileOperationError, create_error_response


class GitOperations:
    """Main Git operations handler that delegates to specialized operation classes"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
        
        # Initialize specialized operation handlers
        self.basic_ops = GitBasicOperations(repo_instance)
        self.rebase_ops = GitRebaseOperations(repo_instance)
        self.editor_ops = GitEditorOperations(repo_instance)
    
    # Basic file operations - delegate to basic_ops
    def get_file_content(self, file_path, version='working'):
        """Get the content of a file from either HEAD or working directory"""
        try:
            return self.basic_ops.get_file_content(file_path, version)
        except Exception as e:
            return create_error_response(e)
            
    def save_file_content(self, file_path, content):
        """Save file content to disk in the working directory"""
        try:
            return self.basic_ops.save_file_content(file_path, content)
        except Exception as e:
            return create_error_response(e)

    def delete_file(self, file_path):
        """Delete a file from the working directory"""
        try:
            return self.basic_ops.delete_file(file_path)
        except Exception as e:
            return create_error_response(e)
            
    def stage_file(self, file_path):
        """Stage a specific file in the repository"""
        try:
            return self.basic_ops.stage_file(file_path)
        except Exception as e:
            return create_error_response(e)
    
    def unstage_file(self, file_path):
        """Unstage a specific file in the repository"""
        try:
            return self.basic_ops.unstage_file(file_path)
        except Exception as e:
            return create_error_response(e)
            
    def discard_changes(self, file_path):
        """Discard changes to a specific file in the repository by checking it out from HEAD"""
        try:
            return self.basic_ops.discard_changes(file_path)
        except Exception as e:
            return create_error_response(e)
            
    def commit_file(self, file_path, commit_message):
        """Commit a specific file to the repository"""
        try:
            return self.basic_ops.commit_file(file_path, commit_message)
        except Exception as e:
            return create_error_response(e)

    def commit_staged_changes(self, message="Rebase commit"):
        """Commit all staged changes"""
        try:
            return self.basic_ops.commit_staged_changes(message)
        except Exception as e:
            return create_error_response(e)

    def commit_amend(self):
        """Amend the previous commit with staged changes"""
        try:
            return self.basic_ops.commit_amend()
        except Exception as e:
            return create_error_response(e)

    def get_raw_git_status(self):
        """Get the raw git status output as it appears in the terminal"""
        try:
            return self.basic_ops.get_raw_git_status()
        except Exception as e:
            return create_error_response(e)

    # Interactive rebase operations - delegate to rebase_ops
    def start_interactive_rebase(self, from_commit, to_commit):
        """Start an interactive rebase between two commits"""
        try:
            return self.rebase_ops.start_interactive_rebase(from_commit, to_commit)
        except Exception as e:
            return create_error_response(e)

    def get_rebase_status(self):
        """Get the current rebase status and todo file content"""
        try:
            return self.rebase_ops.get_rebase_status()
        except Exception as e:
            return create_error_response(e)

    def execute_rebase(self, rebase_plan=None):
        """Execute the interactive rebase with the given plan or continue existing rebase"""
        try:
            return self.rebase_ops.execute_rebase(rebase_plan)
        except Exception as e:
            return create_error_response(e)

    def get_conflict_content(self, file_path):
        """Get the conflict content for a file (ours, theirs, and merged)"""
        try:
            return self.rebase_ops.get_conflict_content(file_path)
        except Exception as e:
            return create_error_response(e)

    def resolve_conflict(self, file_path, resolved_content):
        """Resolve a conflict by saving the resolved content and staging the file"""
        try:
            return self.rebase_ops.resolve_conflict(file_path, resolved_content)
        except Exception as e:
            return create_error_response(e)

    def continue_rebase(self):
        """Continue the rebase after resolving conflicts"""
        try:
            return self.rebase_ops.continue_rebase()
        except Exception as e:
            return create_error_response(e)

    def abort_rebase(self):
        """Abort the current rebase"""
        try:
            return self.rebase_ops.abort_rebase()
        except Exception as e:
            return create_error_response(e)

    # Git editor operations - delegate to editor_ops
    def get_git_editor_status(self):
        """Get comprehensive Git editor status - detects what Git is waiting for"""
        try:
            return self.editor_ops.get_git_editor_status()
        except Exception as e:
            return create_error_response(e)

    def save_git_editor_file(self, file_type, content):
        """Save content to the appropriate Git editor file"""
        try:
            return self.editor_ops.save_git_editor_file(file_type, content)
        except Exception as e:
            return create_error_response(e)

    def save_rebase_todo(self, todo_content):
        """Save the rebase todo file content"""
        try:
            return self.editor_ops.save_rebase_todo(todo_content)
        except Exception as e:
            return create_error_response(e)
