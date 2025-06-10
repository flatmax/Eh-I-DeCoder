/**
 * Styles for PromptView component
 */
import { css } from 'lit';

export const promptViewStyles = css`
  :host {
    position: fixed;
    z-index: 2000;
    transition: all 0.3s ease;
    font-family: sans-serif;
    pointer-events: auto;
  }
  
  :host(.minimized) {
    width: calc(100vw / 6);
    min-width: 300px;
    height: 120px;
  }
  
  :host(.minimized:not(.dragged)) {
    bottom: 20px;
    right: 20px;
    top: auto;
    left: auto;
    transform: none !important;
  }
  
  :host(.maximized) {
    width: calc(100vw / 3);
    min-width: 400px;
    height: 95vh;
    max-height: calc(100vh - 20px);
  }
  
  :host(.maximized:not(.dragged)) {
    top: 50%;
    left: 25%;
    transform: translate(-50%, -50%) !important;
    bottom: auto;
    right: auto;
  }
  
  :host(.dragged) {
    position: fixed !important;
    bottom: auto !important;
    right: auto !important;
    top: 0 !important;
    left: 0 !important;
    /* Transform will be set via JavaScript */
  }
  
  :host(.dragging) {
    transition: none !important;
    user-select: none;
  }
  
  :host(.resizing) {
    transition: none !important;
    user-select: none;
  }
  
  /* Default state - show as minimized in bottom right */
  :host(:not(.minimized):not(.maximized)) {
    bottom: 20px;
    right: 20px;
    width: calc(100vw / 6);
    min-width: 300px;
    height: 120px;
    top: auto;
    left: auto;
    transform: none !important;
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
    position: relative;
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
  
  .mode-toggle {
    background: #2196F3;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    transition: all 0.2s ease;
    flex-shrink: 0;
  }
  
  .mode-toggle:hover {
    background: #1976D2;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }
  
  .mode-toggle:active {
    transform: translateY(0);
  }
  
  .resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
    z-index: 10;
    transition: background-color 0.2s ease;
  }
  
  .resize-handle:hover {
    background-color: rgba(0, 123, 255, 0.3);
  }
  
  .resize-handle.active {
    background-color: rgba(0, 123, 255, 0.5);
  }
  
  .resize-handle-right {
    right: 0;
    border-radius: 0 8px 8px 0;
  }
  
  /* Hide resize handles when minimized and not dragged */
  :host(.minimized:not(.dragged)) .resize-handle {
    display: none;
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
