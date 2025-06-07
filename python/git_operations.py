import os


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
