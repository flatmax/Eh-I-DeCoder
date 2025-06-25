export class MonacoLoader {
  constructor() {
    this._monacoLoaded = false;
    this._loadPromise = null;
    this._initializeMonaco();
  }

  _initializeMonaco() {
    if (this._loadPromise) return this._loadPromise;
    
    this._loadPromise = new Promise((resolve, reject) => {
      if (window.monaco) {
        this._monacoLoaded = true;
        this._configureMonaco();
        resolve();
        return;
      }

      this._loadMonaco();
      
      // Check periodically if Monaco is loaded
      const checkInterval = setInterval(() => {
        if (window.monaco) {
          clearInterval(checkInterval);
          this._monacoLoaded = true;
          this._configureMonaco();
          resolve();
        }
      }, 100);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.monaco) {
          reject(new Error('Failed to load Monaco Editor'));
        }
      }, 30000);
    });
    
    return this._loadPromise;
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
      // Configure Monaco loader
      window.require.config({
        paths: {
          'vs': '/node_modules/monaco-editor/min/vs'
        }
      });

      // Load Monaco editor
      window.require(['vs/editor/editor.main'], () => {
        console.log('Monaco Editor loaded successfully');
        this._monacoLoaded = true;
      });
    };
    
    loaderScript.onerror = (error) => {
      console.error('Failed to load Monaco loader script:', error);
    };
    
    document.head.appendChild(loaderScript);
  }

  _configureMonaco() {
    if (!window.monaco) return;
    
    console.log('Configuring Monaco Editor...');
    
    // Disable TypeScript/JavaScript built-in libraries
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      noLib: true,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: false
    });
    
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      noLib: true,
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: false
    });
    
    // Disable diagnostics for TypeScript/JavaScript
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
      noSuggestionDiagnostics: true
    });
    
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
      noSuggestionDiagnostics: true
    });
    
    // Disable eager model sync which can interfere with LSP
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(false);
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(false);
    
    console.log('Monaco Editor configured');
  }

  isLoaded() {
    return this._monacoLoaded;
  }

  async waitForMonaco() {
    return this._initializeMonaco();
  }
}
