// Parser manager for tree-sitter parsers
const Parser = require('tree-sitter');

class ParserManager {
  constructor() {
    this.parsers = new Map();
    this.languages = new Map();
    this.initializeParsers();
  }

  initializeParsers() {
    // Try to load tree-sitter language parsers
    // These are installed via npm as dependencies
    
    this.tryLoadLanguage('javascript', () => require('tree-sitter-javascript'));
    this.tryLoadLanguage('javascriptreact', () => require('tree-sitter-javascript'));
    this.tryLoadLanguage('typescript', () => require('tree-sitter-typescript').typescript);
    this.tryLoadLanguage('typescriptreact', () => require('tree-sitter-typescript').tsx);
    
    this.tryLoadLanguage('python', () => require('tree-sitter-python'));
    
    this.tryLoadLanguage('cpp', () => require('tree-sitter-cpp'));
    this.tryLoadLanguage('c++', () => require('tree-sitter-cpp'));
    this.tryLoadLanguage('c', () => require('tree-sitter-c'));
    
    this.tryLoadLanguage('java', () => require('tree-sitter-java'));
    this.tryLoadLanguage('go', () => require('tree-sitter-go'));
    this.tryLoadLanguage('rust', () => require('tree-sitter-rust'));
    
    this.tryLoadLanguage('css', () => require('tree-sitter-css'));
    this.tryLoadLanguage('scss', () => require('tree-sitter-css'));
    
    this.tryLoadLanguage('html', () => require('tree-sitter-html'));
    this.tryLoadLanguage('json', () => require('tree-sitter-json'));
    this.tryLoadLanguage('yaml', () => require('tree-sitter-yaml'));
    this.tryLoadLanguage('toml', () => require('tree-sitter-toml'));
    this.tryLoadLanguage('bash', () => require('tree-sitter-bash'));
    this.tryLoadLanguage('markdown', () => require('tree-sitter-markdown').markdown);

    console.log(`Loaded ${this.languages.size} language parsers`);
  }

  tryLoadLanguage(languageId, loader) {
    try {
      const Language = loader();
      this.languages.set(languageId, Language);
      console.log(`✓ Loaded parser for ${languageId}`);
    } catch (error) {
      console.log(`✗ Parser not available for ${languageId}: ${error.message}`);
    }
  }

  getParser(languageId) {
    // Return cached parser if available
    if (this.parsers.has(languageId)) {
      return this.parsers.get(languageId);
    }

    // Create new parser if language is supported
    const Language = this.languages.get(languageId);
    if (!Language) {
      console.log(`No parser available for language: ${languageId}`);
      return null;
    }

    try {
      const parser = new Parser();
      parser.setLanguage(Language);
      this.parsers.set(languageId, parser);
      console.log(`Created parser for ${languageId}`);
      return parser;
    } catch (error) {
      console.error(`Error creating parser for ${languageId}:`, error);
      return null;
    }
  }

  getSupportedLanguages() {
    return Array.from(this.languages.keys());
  }

  isLanguageSupported(languageId) {
    return this.languages.has(languageId);
  }

  // Get language ID from file extension
  getLanguageFromExtension(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const extensionMap = {
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'py': 'python',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'css': 'css',
      'scss': 'scss',
      'sass': 'scss',
      'html': 'html',
      'htm': 'html',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'md': 'markdown',
      'markdown': 'markdown'
    };
    
    return extensionMap[ext] || null;
  }

  // Get appropriate fallback language for unsupported languages
  getFallbackLanguage(languageId) {
    // If the exact language isn't supported, try to find a similar one
    const fallbackMap = {
      'vue': 'html',
      'svelte': 'html',
      'php': 'html',
      'rb': 'python', // Ruby syntax is somewhat similar to Python
      'pl': 'python', // Perl
      'swift': 'javascript',
      'kotlin': 'java',
      'scala': 'java',
      'clojure': 'javascript',
      'elm': 'javascript',
      'dart': 'javascript',
      'lua': 'python',
      'r': 'python',
      'matlab': 'python',
      'octave': 'python'
    };
    
    const fallback = fallbackMap[languageId];
    return fallback && this.isLanguageSupported(fallback) ? fallback : null;
  }
}

module.exports = ParserManager;
