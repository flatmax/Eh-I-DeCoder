import os
import re
import git


class GitSearch:
    """Handles searching for content in repository files"""
    
    def __init__(self, repo_instance):
        self.repo = repo_instance
    
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
        self.repo.log(f"search_files called with query: '{query}', word: {word}, regex: {regex}, respect_gitignore: {respect_gitignore}, ignore_case: {ignore_case}")
        
        if not self.repo.repo:
            error_msg = {"error": "No Git repository available"}
            self.repo.log(f"search_files returning error: {error_msg}")
            return error_msg
        
        try:
            # Use the optimized git grep implementation for faster searches
            return self._search_with_git_grep(query, word, regex, respect_gitignore, ignore_case)
        except git.exc.GitCommandError as e:
            # If git grep fails, fall back to the Python implementation
            self.repo.log(f"Git grep failed with error: {e}. Falling back to Python implementation.")
            return self._search_with_python(query, word, regex, respect_gitignore, ignore_case)
        except Exception as e:
            error_msg = {"error": f"Error during search: {e}"}
            self.repo.log(f"search_files returning error: {error_msg}")
            return error_msg
    
    def _search_with_git_grep(self, query, word=False, regex=False, respect_gitignore=True, ignore_case=False):
        """Search for content in repository files using Git's built-in grep command"""
        self.repo.log(f"_search_with_git_grep called with query: '{query}', word: {word}, regex: {regex}, respect_gitignore: {respect_gitignore}, ignore_case: {ignore_case}")
        
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
            grep_output = self.repo.repo.git.grep(git_args, as_process=False)
            
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
                        self.repo.log(f"Warning: Could not parse line number from git grep output: {line}")
            
            # Convert dict to list for final results
            final_results = list(consolidated_results.values())
            self.repo.log(f"_search_with_git_grep found {len(final_results)} files with matches")
            return final_results
            
        except git.exc.GitCommandError as e:
            # git grep returns exit code 1 if no matches found
            if e.status == 1:
                self.repo.log("_search_with_git_grep: No matches found")
                return []
            # For other errors, re-raise to fall back to Python implementation
            raise
    
    def _search_with_python(self, query, word=False, regex=False, respect_gitignore=True, ignore_case=False):
        """Fallback search implementation using Python when git grep fails"""
        self.repo.log(f"_search_with_python called with query: '{query}', word: {word}, regex: {regex}, respect_gitignore: {respect_gitignore}, ignore_case: {ignore_case}")
        
        try:
            results = []
            repo_root = self.repo.repo.working_tree_dir
            
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
                            self.repo.repo.git.check_ignore(rel_path)
                            # If we reach here, the file is ignored (command succeeded)
                            self.repo.log(f"Skipping ignored file: {rel_path}")
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
            
            self.repo.log(f"_search_with_python found {len(results)} files with matches")
            return results
            
        except Exception as e:
            error_msg = {"error": f"Error during Python search: {e}"}
            self.repo.log(f"_search_with_python returning error: {error_msg}")
            return error_msg
