import { css } from 'lit';

export const contentStyles = css`
  .diff-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  .rebase-mode-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  .no-changes {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  .no-changes-message {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: #586069;
    font-style: italic;
    text-align: center;
    padding: 20px;
  }

  .diff-container {
    flex: 1;
    overflow: auto;
    min-height: 0;
    position: relative;
  }

  monaco-diff-editor {
    flex: 1;
    width: 100%;
    height: 100%;
    min-height: 0;
    display: block;
  }

  .loading, .error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #586069;
    font-style: italic;
    text-align: center;
    padding: 20px;
  }

  .error {
    color: #d73a49;
    background: #fff5f5;
    border: 1px solid #fed7d7;
    border-radius: 4px;
    margin: 16px;
  }
`;
