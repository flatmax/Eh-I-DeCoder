/**
 * Styles for PromptView component
 */
import { css } from 'lit';

export const promptViewStyles = css`
  :host {
    position: fixed;
    z-index: 1000;
    transition: all 0.3s ease;
    font-family: sans-serif;
  }
  
  :host(.minimized) {
    bottom: 20px;
    right: 20px;
    width: calc(100vw / 6);
    height: 120px;
  }
  
  :host(.dragged) {
    position: fixed !important;
    bottom: auto !important;
    right: auto !important;
    top: auto !important;
    left: 0 !important;
  }
  
  :host(.maximized) {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: calc(100vw / 3);
    height: 100vh;
    max-height: calc(100vh - 40px);
  }
  
  :host(.dragging) {
    transition: none;
    position: absolute;
  }
  
  .dialog-container {
    width: 100%;
    height: 100%;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e0e0e0;
  }
  
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    min-height: 48px;
    user-select: none;
    cursor: grab;
  }
  
  .dialog-header:active {
    cursor: grabbing;
  }
  
  .dialog-title {
    font-weight: 600;
    font-size: 14px;
    color: #333;
    margin: 0;
  }
  
  .prompt-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    flex: 1;
  }
  
  .message-history-wrapper {
    position: relative;
    flex: 1;
    overflow: hidden;
    min-height: 0;
  }
  
  .message-history {
    height: 100%;
    overflow-y: auto;
    padding: 10px;
    background-color: #f9f9f9;
    white-space: pre-wrap;
  }
  
  :host(.minimized) .message-history-wrapper {
    display: none;
  }
  
  .scroll-to-bottom-btn {
    position: absolute;
    bottom: 16px;
    right: 16px;
    background-color: rgba(255, 255, 255, 0.9);
    border: 1px solid #e0e0e0;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 10;
    transition: all 0.2s ease;
  }
  
  .scroll-to-bottom-btn:hover {
    background-color: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  .input-area {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-gap: 10px;
    width: 100%;
    padding: 10px;
    flex-shrink: 0;
    background: white;
    border-top: 1px solid #e0e0e0;
  }
  
  :host(.minimized) .input-area {
    grid-template-columns: 1fr;
    grid-gap: 5px;
    padding: 8px;
  }
  
  .controls-column {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 10px;
    height: 100%;
    min-width: 120px;
  }
  
  .button-row {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  :host(.minimized) .controls-column {
    flex-direction: row;
    min-width: auto;
    height: auto;
    gap: 5px;
  }
  
  .voice-input-container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }
  
  :host(.minimized) .voice-input-container {
    display: none;
  }
  
  :host(.minimized) md-filled-text-field {
    --md-filled-text-field-container-shape: 4px;
  }
`;
