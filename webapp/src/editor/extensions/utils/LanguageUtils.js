export function getLanguageId(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascriptreact',
    'ts': 'typescript',
    'tsx': 'typescriptreact',
    'py': 'python',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'md': 'markdown'
  };
  return languageMap[ext] || 'plaintext';
}

export function offsetToPosition(doc, offset) {
  const line = doc.lineAt(offset);
  return {
    line: line.number - 1,
    character: offset - line.from
  };
}
