import { css } from 'lit';

export class ChatHistoryStyles {
  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        position: relative;
      }

      .chat-history-container {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        background-color: #f9f9f9;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.6;
      }

      .loading-indicator {
        text-align: center;
        padding: 20px;
        color: #666;
        font-style: italic;
      }

      .error-message {
        text-align: center;
        padding: 20px;
        color: #d32f2f;
        background-color: #ffebee;
        border-radius: 4px;
        margin: 16px;
      }

      .load-more-indicator {
        text-align: center;
        padding: 10px;
        color: #666;
        font-size: 12px;
        background-color: rgba(255, 255, 255, 0.8);
        border-bottom: 1px solid #e0e0e0;
      }

      .content-wrapper {
        word-wrap: break-word;
        max-width: 100%;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .file-info {
        position: sticky;
        top: 0;
        background-color: rgba(245, 245, 245, 0.95);
        padding: 8px 16px;
        border-bottom: 1px solid #e0e0e0;
        font-size: 12px;
        color: #666;
        z-index: 1;
      }

      user-card,
      assistant-card,
      commands-card {
        display: block;
        width: 100%;
      }

      .debug-info {
        background-color: #fff3cd;
        border: 1px solid #ffeaa7;
        padding: 8px;
        margin: 8px 0;
        border-radius: 4px;
        font-size: 12px;
        font-family: monospace;
      }

      .scroll-to-bottom-fab {
        position: absolute;
        bottom: 20px;
        right: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background-color: #2196F3;
        color: white;
        border: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        z-index: 10;
      }

      .scroll-to-bottom-fab:hover {
        background-color: #1976D2;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        transform: translateY(-2px);
      }

      .scroll-to-bottom-fab:active {
        transform: translateY(0);
      }

      .scroll-to-bottom-fab svg {
        width: 24px;
        height: 24px;
      }
    `;
  }
}
