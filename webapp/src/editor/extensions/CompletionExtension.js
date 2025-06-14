import { autocompletion } from '@codemirror/autocomplete';

export function createCompletionExtension(languageClient, fileUri) {
  async function completionSource(context) {
    if (!languageClient.connected) return null;
    
    const pos = context.pos;
    const line = context.state.doc.lineAt(pos);
    const position = {
      line: line.number - 1,
      character: pos - line.from
    };
    
    try {
      const completions = await languageClient.completion(fileUri, position);
      if (!completions || !Array.isArray(completions)) return null;
      
      return {
        from: context.matchBefore(/\w*/)?.from ?? pos,
        options: completions.map(item => ({
          label: item.label,
          type: getCompletionType(item.kind),
          detail: item.detail,
          info: item.documentation
        }))
      };
    } catch (error) {
      console.error('Completion error:', error);
      return null;
    }
  }

  return autocompletion({ override: [completionSource] });
}

function getCompletionType(kind) {
  // Map LSP CompletionItemKind to CodeMirror completion types
  const kindMap = {
    1: 'text',
    2: 'method',
    3: 'function',
    4: 'constructor',
    5: 'field',
    6: 'variable',
    7: 'class',
    8: 'interface',
    9: 'module',
    10: 'property',
    11: 'unit',
    12: 'value',
    13: 'enum',
    14: 'keyword',
    15: 'snippet',
    16: 'color',
    17: 'file',
    18: 'reference'
  };
  return kindMap[kind] || 'text';
}
