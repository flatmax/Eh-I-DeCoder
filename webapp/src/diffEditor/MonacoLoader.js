export class MonacoLoader {
  constructor() {
    this._monacoLoaded = false;
    this._loadMonaco();
  }

  _loadMonaco() {
    if (window.monaco) {
      this._monacoLoaded = true;
      return;
    }

    // Load Monaco loader script - use absolute path from root
    const loaderScript = document.createElement('script');
    loaderScript.src = '/node_modules/monaco-editor/min/vs/loader.js';
    loaderScript.onload = () => {
      // Configure Monaco with absolute paths
      window.require.config({ 
        paths: { 'vs': '/node_modules/monaco-editor/min/vs' }
      });

      // Load Monaco editor
      window.require(['vs/editor/editor.main'], () => {
        this._monacoLoaded = true;
      });
    };
    document.head.appendChild(loaderScript);
  }

  isLoaded() {
    return this._monacoLoaded;
  }
}
