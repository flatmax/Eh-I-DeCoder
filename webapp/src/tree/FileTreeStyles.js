import {css} from 'lit';

export const fileTreeStyles = css`
  :host {
    display: block;
    height: 100%;
  }
  
  .file-tree-container {
    height: 100%;
    overflow: auto;
    background-color: #fff;
    position: relative;
  }
  
  .file-tree-header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 4px 8px;
    border-bottom: 1px solid #ccc;
  }
  
  .tree-controls {
    display: flex;
    gap: 2px;
  }
  
  .tree-controls md-icon-button.active,
  .tree-controls .line-count-toggle.active {
    background-color: #e3f2fd;
    color: #1976d2;
  }
  
  .file-tree {
    padding: 8px;
  }
  
  .file-node {
    display: flex;
    align-items: center;
    padding: 6px 8px;
    cursor: pointer;
    border-radius: 4px;
    margin: 2px 0;
  }
  
  .file-node:hover {
    background-color: #f5f5f5;
  }
  
  .file-node.current-file {
    background-color: #e3f2fd;
    border-left: 3px solid #1976d2;
    font-weight: 500;
  }
  
  .file-node.current-file:hover {
    background-color: #bbdefb;
  }
  
  .file-node md-icon {
    margin-right: 8px;
    font-size: 18px;
    font-family: 'Material Symbols Outlined';
    display: inline-flex;
    flex-shrink: 0;
    --md-icon-size: 18px;
    color: #616161;
  }
  
  .directory md-icon {
    color: #FFA000;  /* Amber color for folders */
  }
  
  .file md-icon {
    color: #2196F3;  /* Blue color for files */
  }
  
  .file-checkbox {
    margin-right: 4px;
    cursor: pointer;
  }
  
  .line-count {
    margin-left: auto;
    font-size: 0.8em;
    color: #666;
    display: flex;
    align-items: center;
    gap: 2px;
    order: 999;
  }
  
  .line-count md-icon {
    font-size: 14px;
    --md-icon-size: 14px;
    margin-right: 0;
    color: #666;
  }
  
  .line-count.loading {
    opacity: 0.6;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.3; }
  }
  
  .directory-details {
    margin-left: 0;
  }
  
  .directory-details summary {
    list-style: none;
  }
  
  .directory-details summary::marker,
  .directory-details summary::-webkit-details-marker {
    display: none;
  }
  
  .children-container {
    margin-left: 16px;
    border-left: 1px solid #ccc;
    padding-left: 8px;
  }
  
  .loading, .error {
    padding: 16px;
    text-align: center;
  }
  
  .error {
    color: red;
  }
`;
