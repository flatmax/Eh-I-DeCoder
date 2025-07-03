import git
try:
    from .exceptions import GitError, GitRepositoryError, create_error_response
except ImportError:
    from exceptions import GitError, GitRepositoryError, create_error_response


class RepoHistory:
    """Handles repository history and commit-related operations"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
    
    def _ensure_repo(self):
        """Ensure repository is available, raise exception if not"""
        if not self.repo.repo:
            raise GitRepositoryError("No Git repository available")
    
    def get_commit_history(self, max_count=50, branch=None, skip=0):
        """Get commit history with detailed information - optimized for performance with pagination support"""
        try:
            self._ensure_repo()
            
            commits = []
            
            # Use current branch if no branch specified - much faster than --all
            if branch is None:
                try:
                    branch = self.repo.repo.active_branch.name
                except TypeError:
                    # Fallback to HEAD if no active branch (detached HEAD)
                    branch = 'HEAD'
            
            # Get commits from specified branch with skip and max_count for pagination
            for commit in self.repo.repo.iter_commits(branch, max_count=max_count, skip=skip):
                commit_data = {
                    'hash': commit.hexsha,
                    'author': commit.author.name,
                    'email': commit.author.email,
                    'date': commit.committed_datetime.isoformat(),
                    'message': commit.message.strip(),
                    'branch': branch  # Use the branch we're iterating over
                }
                commits.append(commit_data)
            
            return commits
            
        except Exception as e:
            return create_error_response(e)
    
    def get_changed_files(self, from_commit, to_commit):
        """Get list of files changed between two commits"""
        try:
            self._ensure_repo()
            
            # Get the commit objects
            from_commit_obj = self.repo.repo.commit(from_commit)
            to_commit_obj = self.repo.repo.commit(to_commit)
            
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
            
            return changed_files
            
        except Exception as e:
            return create_error_response(e)
    
    def get_file_content_at_commit(self, file_path, commit_hash):
        """Get the content of a file at a specific commit"""
        try:
            self._ensure_repo()
            
            try:
                commit = self.repo.repo.commit(commit_hash)
                blob = commit.tree[file_path]
                content = blob.data_stream.read().decode('utf-8')
                return content
            except (KeyError, git.exc.BadName):
                # File doesn't exist in this commit
                return ""
                
        except UnicodeDecodeError as e:
            raise GitError(f"File {file_path} contains binary data or invalid encoding: {e}")
        except Exception as e:
            if isinstance(e, GitRepositoryError):
                raise
            raise GitError(f"Error getting file content at commit: {e}")
