export class LanguageDetector {
  constructor() {
    this.languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'xml': 'xml',
      'md': 'markdown',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'java': 'java',
      'sh': 'shell',
      'bash': 'shell',
      'yml': 'yaml',
      'yaml': 'yaml'
    };
  }

  getLanguageFromFile(filePath) {
    if (!filePath) return 'plaintext';
    
    const ext = filePath.split('.').pop()?.toLowerCase();
    return this.languageMap[ext] || 'plaintext';
  }
}
