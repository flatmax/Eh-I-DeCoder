import os
import re
import git
try:
    from .exceptions import GitError, GitRepositoryError
except ImportError:
    from exceptions import GitError, GitRepositoryError

class GitSearch:
    """Handles searching for content in repository files"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
    
    def _ensure_repo(self):
        """Ensure repository is available, raise exception if not"""
        if not self.repo.repo:
            raise GitRepositoryError("No Git repository available")
    
    def search_files(self, query, word=False, regex=False, respect_gitignore=True, ignore_case=False):
        """Search for content in repository files
        
        Args:
            query (str): The search string or pattern
            word (bool): If True, search for whole word matches
            regex (bool): If True, treat query as a regular expression
            respect_gitignore (bool): If True, skip files ignored by .gitignore
            ignore_case (bool): If True, perform case-insensitive search
            
        Returns:
            list: A list of search results
        """
        try:
            self._ensure_repo()
            
            return self._search_with_git_grep(query, word, regex, respect_gitignore, ignore_case)
        except git.exc.GitCommandError as e:
            self.repo.log(f"Git grep failed: {e}. Using Python implementation.")
            return self._search_with_python(query, word, regex, respect_gitignore, ignore_case)
        except Exception as e:
            if isinstance(e, GitRepositoryError):
                raise
            raise GitError(f"Error during search: {e}")
    
    def _search_with_git_grep(self, query, word=False, regex=False, respect_gitignore=True, ignore_case=False):
        """Search for content in repository files using Git's built-in grep command"""
        git_args = ["-n"]
        
        if ignore_case:
            git_args.append("-i")
        
        if word:
            git_args.append("-w")
        
        if regex:
            git_args.append("-E")
        else:
            git_args.append("-F")
        
        if not respect_gitignore:
            git_args.append("--no-index")
        else:
            git_args.append("--untracked")
            git_args.append("--exclude-standard")
        
        git_args.append("-I")
        git_args.append(query)
        
        try:
            grep_output = self.repo.repo.git.grep(git_args, as_process=False)
            
            consolidated_results = {}
            
            for line in grep_output.splitlines():
                parts = line.split(':', 2)
                if len(parts) == 3:
                    file_path, line_num_str, line_content = parts
                    try:
                        line_num = int(line_num_str)
                        
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
                        self.repo.log(f"Warning: Could not parse line number from git grep output: {line}")
            
            return list(consolidated_results.values())
            
        except git.exc.GitCommandError as e:
            if e.status == 1:
                return []
            raise
    
    def _search_with_python(self, query, word=False, regex=False, respect_gitignore=True, ignore_case=False):
        """Fallback search implementation using Python when git grep fails"""
        try:
            results = []
            repo_root = self.repo.repo.working_tree_dir
            
            if regex:
                try:
                    if word:
                        pattern = re.compile(r'\b' + query + r'\b', re.IGNORECASE if ignore_case else 0)
                    else:
                        pattern = re.compile(query, re.IGNORECASE if ignore_case else 0)
                except re.error as e:
                    raise ValueError(f"Invalid regular expression: {e}")
            else:
                if word:
                    pattern = None
                else:
                    pattern = re.compile(re.escape(query), re.IGNORECASE if ignore_case else 0)
            
            for root, _, files in os.walk(repo_root):
                for file in files:
                    full_path = os.path.join(root, file)
                    
                    rel_path = os.path.relpath(full_path, repo_root)
                
                    if (rel_path.startswith('.git/') or 
                        os.path.getsize(full_path) > 1024 * 1024):
                        continue
                
                    if respect_gitignore:
                        try:
                            self.repo.repo.git.check_ignore(rel_path)
                            continue
                        except git.exc.GitCommandError:
                            pass
                    
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            lines = f.readlines()
                    except UnicodeDecodeError:
                        continue
                    except Exception:
                        continue
                    
                    file_matches = []
                    for line_num, line in enumerate(lines, 1):
                        if regex or not word:
                            if pattern.search(line):
                                file_matches.append({
                                    "line_num": line_num,
                                    "line": line.rstrip('\n')
                                })
                        else:
                            words = re.findall(r'\b\w+\b', line)
                            if ignore_case:
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
            
            return results
            
        except Exception as e:
            if isinstance(e, ValueError):
                raise GitError(str(e))
            raise GitError(f"Error during Python search: {e}")
    
    def replace_in_files(self, search_query, replace_query, file_paths, word=False, regex=False, ignore_case=False):
        """Replace content in specified repository files
        
        Args:
            search_query (str): The search string or pattern to find
            replace_query (str): The replacement string
            file_paths (list): List of file paths to perform replacement in
            word (bool): If True, match whole words only
            regex (bool): If True, treat search_query as a regular expression
            ignore_case (bool): If True, perform case-insensitive matching
            
        Returns:
            dict: Summary of replacements made
        """
        try:
            self._ensure_repo()
            
            repo_root = self.repo.repo.working_tree_dir
            total_replacements = 0
            files_modified = 0
            modified_files = []
            
            flags = re.IGNORECASE if ignore_case else 0
            
            if regex:
                try:
                    if word:
                        pattern = re.compile(r'\b' + search_query + r'\b', flags)
                    else:
                        pattern = re.compile(search_query, flags)
                except re.error as e:
                    raise ValueError(f"Invalid regular expression: {e}")
            else:
                escaped_query = re.escape(search_query)
                if word:
                    pattern = re.compile(r'\b' + escaped_query + r'\b', flags)
                else:
                    pattern = re.compile(escaped_query, flags)
            
            for file_path in file_paths:
                full_path = os.path.join(repo_root, file_path)
                
                if not os.path.isfile(full_path):
                    self.repo.log(f"Warning: File not found: {file_path}")
                    continue
                
                real_full_path = os.path.realpath(full_path)
                real_repo_root = os.path.realpath(repo_root)
                if not real_full_path.startswith(real_repo_root):
                    self.repo.log(f"Warning: File outside repository: {file_path}")
                    continue
                
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    matches = pattern.findall(content)
                    match_count = len(matches)
                    
                    if match_count > 0:
                        new_content = pattern.sub(replace_query, content)
                        
                        with open(full_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        
                        total_replacements += match_count
                        files_modified += 1
                        modified_files.append({
                            "file": file_path,
                            "replacements": match_count
                        })
                        
                        self.repo.log(f"Replaced {match_count} occurrence(s) in {file_path}")
                        
                        self.repo._notify_file_saved(file_path)
                        
                except UnicodeDecodeError:
                    self.repo.log(f"Warning: Could not read file as UTF-8: {file_path}")
                    continue
                except Exception as e:
                    self.repo.log(f"Warning: Error processing file {file_path}: {e}")
                    continue
            
            if files_modified > 0:
                self.repo._notify_git_change()
            
            return {
                "success": True,
                "total_replacements": total_replacements,
                "files_modified": files_modified,
                "modified_files": modified_files
            }
            
        except Exception as e:
            if isinstance(e, (ValueError, GitRepositoryError)):
                raise GitError(str(e))
            raise GitError(f"Error during replace: {e}")
