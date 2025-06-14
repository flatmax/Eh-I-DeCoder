import { EditorView } from '@codemirror/view';

export function createThemeExtension() {
  return EditorView.theme({
    '.cm-tooltip-hover': {
      backgroundColor: '#2d2d30',
      color: '#cccccc',
      border: '1px solid #3e3e42',
      borderRadius: '4px',
      padding: '8px 12px',
      maxWidth: '600px',
      fontSize: '13px',
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      lineHeight: '1.4',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      zIndex: '1000'
    },
    '.cm-tooltip-hover h1, .cm-tooltip-hover h2, .cm-tooltip-hover h3': {
      margin: '0 0 8px 0',
      color: '#4ec9b0'
    },
    '.cm-tooltip-hover code': {
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      padding: '2px 4px',
      borderRadius: '3px',
      fontSize: '12px'
    },
    '.cm-tooltip-hover pre': {
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      padding: '8px',
      borderRadius: '4px',
      margin: '4px 0',
      overflow: 'auto',
      fontSize: '12px'
    },
    '.cm-tooltip-hover strong': {
      color: '#4ec9b0',
      fontWeight: '600'
    },
    '.cm-tooltip-hover em': {
      color: '#9cdcfe',
      fontStyle: 'italic'
    },
    '.cm-tooltip-hover ul, .cm-tooltip-hover ol': {
      margin: '4px 0',
      paddingLeft: '16px'
    },
    '.cm-tooltip-hover li': {
      margin: '2px 0'
    }
  });
}
