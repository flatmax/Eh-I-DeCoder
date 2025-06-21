export class GitActions {
  constructor(jrpcClient, contextMenu, onActionComplete) {
    this.jrpcClient = jrpcClient;
    this.contextMenu = contextMenu;
    this.onActionComplete = onActionComplete;
  }

  async handleStageFile() {
    await this.performGitAction('stage_file', 'Staging file');
  }
  
  async handleUnstageFile() {
    await this.performGitAction('unstage_file', 'Unstaging file');
  }
  
  async handleDiscardChanges() {
    await this.performGitAction('discard_changes', 'Discarding changes to file');
  }

  async handleDeleteFile() {
    const path = this.contextMenu.path;
    if (!path) return;

    // Confirm deletion
    const confirmed = confirm(`Are you sure you want to delete "${path}"? This action cannot be undone.`);
    if (!confirmed) return;

    this.contextMenu.hide();

    try {
      console.log(`Deleting file: ${path}`);
      const response = await this.jrpcClient.call['Repo.delete_file'](path);
      console.log(`delete_file response:`, response);
      
      // Check if the response indicates an error
      if (response && response.error) {
        console.error(`Error deleting file: ${response.error}`);
        alert(`Failed to delete file: ${response.error}`);
      } else {
        console.log(`File ${path} deleted successfully`);
        // Notify completion
        if (this.onActionComplete) {
          this.onActionComplete();
        }
      }
    } catch (error) {
      console.error(`Error deleting file ${path}:`, error);
      alert(`Failed to delete file: ${error.message}`);
    }
  }

  async performGitAction(action, logMessage) {
    const path = this.contextMenu.path;
    if (!path) return;
    
    this.contextMenu.hide();
    
    try {
      console.log(`${logMessage}: ${path}`);
      const response = await this.jrpcClient.call[`Repo.${action}`](path);
      console.log(`${action} response:`, response);
      
      // Notify completion
      if (this.onActionComplete) {
        this.onActionComplete();
      }
    } catch (error) {
      console.error(`Error ${action}:`, error);
      alert(`Failed to ${action.replace('_', ' ')}: ${error.message}`);
    }
  }
  
  async handleCreateFile() {
    const dirPath = this.contextMenu.path;
    if (!dirPath) return;
    
    this.contextMenu.hide();
    
    try {
      const fileName = prompt('Enter filename:');
      if (!fileName) return;
      
      const filePath = dirPath ? `${dirPath}/${fileName}` : fileName;
      console.log(`Creating file: ${filePath}`);
      
      const response = await this.jrpcClient.call['Repo.create_file'](filePath, '');
      console.log('Create file response:', response);
      
      if (response && response.error) {
        alert(`Failed to create file: ${response.error}`);
        return;
      }
      
      // Notify completion and open file
      if (this.onActionComplete) {
        this.onActionComplete();
      }
      
      setTimeout(() => this.openFileInEditor(filePath), 200);
      
    } catch (error) {
      console.error('Error creating file:', error);
      alert(`Failed to create file: ${error.message}`);
    }
  }

  openFileInEditor(filePath) {
    const mainWindow = document.querySelector('main-window');
    if (mainWindow && mainWindow.shadowRoot) {
      const diffEditor = mainWindow.shadowRoot.querySelector('diff-editor');
      if (diffEditor) {
        diffEditor.loadFileContent(filePath);
      }
    }
  }
}
