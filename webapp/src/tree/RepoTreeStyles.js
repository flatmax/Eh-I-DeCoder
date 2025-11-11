import {css} from 'lit';

export class RepoTreeStyles {
  static styles = css`
    /* Container positioning for FAB */
    :host {
      position: relative;
      display: block;
      height: 100%;
      overflow: hidden;
    }
    
    /* Wrapper for the tree content */
    .repo-tree-wrapper {
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    /* Context Menu Styles */
    .context-menu {
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 4px;
      padding: 4px 0;
      z-index: 1000;
      min-width: 180px;
    }
    
    .context-menu-item {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .context-menu-item:hover {
      background-color: #f5f5f5;
    }
    
    .context-menu-icon {
      margin-right: 8px;
      display: flex;
      align-items: center;
    }
    
    .context-menu-icon md-icon {
      font-size: 18px;
      --md-icon-size: 18px;
    }
    
    .context-menu-text {
      font-size: 14px;
    }

    .context-menu-divider {
      height: 1px;
      background-color: #e0e0e0;
      margin: 4px 0;
    }
    
    .refresh-fab {
      position: absolute;
      bottom: 24px;
      right: 24px;
      z-index: 100;
    }
    
    .small-fab {
      --md-fab-container-width: 36px;
      --md-fab-container-height: 36px;
      --md-fab-icon-size: 22px;
      transform: scale(0.75);
    }
    
    .branch-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #666;
      padding: 4px 8px;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
    }
    
    .branch-info {
      background: #e3f2fd;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
    
    .dirty-indicator {
      color: #ff9800;
      font-weight: bold;
    }
    
    .git-status-indicator {
      margin-left: auto;
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
      padding: 1px 4px;
      border-radius: 2px;
    }
    
    .git-modified {
      color: #ff9800;
    }
    
    .git-modified .git-status-indicator {
      background: #fff3e0;
      color: #ff9800;
    }
    
    .git-staged {
      color: #4caf50;
    }
    
    .git-staged .git-status-indicator {
      background: #e8f5e8;
      color: #4caf50;
    }
    
    .git-untracked {
      color: #2196f3;
    }
    
    .git-untracked .git-status-indicator {
      background: #e3f2fd;
      color: #2196f3;
    }
    
    .git-clean {
      /* Default styling for clean files */
    }
    
    /* Enhanced current file highlighting for repo tree */
    .file-node.current-file.git-modified {
      background-color: #fff3e0;
      border-left: 3px solid #ff9800;
    }
    
    .file-node.current-file.git-staged {
      background-color: #e8f5e8;
      border-left: 3px solid #4caf50;
    }
    
    .file-node.current-file.git-untracked {
      background-color: #e3f2fd;
      border-left: 3px solid #2196f3;
    }
    
    .file-node.current-file.git-modified:hover {
      background-color: #ffe0b2;
    }
    
    .file-node.current-file.git-staged:hover {
      background-color: #c8e6c9;
    }
    
    .file-node.current-file.git-untracked:hover {
      background-color: #bbdefb;
    }
  `;
}
