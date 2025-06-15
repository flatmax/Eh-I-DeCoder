import {css} from 'lit';

export const headerStyles = css`
  .merge-header {
    display: flex;
    flex-direction: column;
    background: #2d2d30;
    border-bottom: 1px solid #3e3e42;
    flex-shrink: 0;
  }
  
  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    min-height: 40px;
    gap: 16px;
  }
  
  .header-graph {
    border-top: 1px solid #3e3e42;
  }
  
  .header-left {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 16px;
  }
  
  .header-right {
    flex: 1;
    display: flex;
    justify-content: flex-end;
  }

  .merge-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #cccccc;
    font-family: monospace;
  }

  .label {
    padding: 4px 12px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 500;
  }

  .head-label { 
    background: rgba(78, 201, 176, 0.2);
    color: #4ec9b0;
  }
  
  .working-label { 
    background: rgba(255, 215, 0, 0.2);
    color: #ffd700;
  }
  
  .unsaved-indicator {
    color: #ffd700;
    font-weight: bold;
    margin-left: 8px;
  }

`;
