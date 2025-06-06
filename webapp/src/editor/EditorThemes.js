import {EditorView} from '@codemirror/view';
import {oneDark} from '@codemirror/theme-one-dark';

export const diffTheme = EditorView.theme({
  // Styles for inserted content (in right editor)
  ".cm-diff-insert": {
    backgroundColor: "rgba(0, 255, 0, 0.15)",
  },
  ".cm-diff-insert-line": {
    backgroundColor: "rgba(0, 255, 0, 0.1)",
    borderLeft: "3px solid rgba(0, 200, 0, 0.8)",
  },
  
  // Styles for deleted content (in left editor)
  ".cm-diff-delete": {
    backgroundColor: "rgba(255, 0, 0, 0.15)",
  },
  ".cm-diff-delete-line": {
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderLeft: "3px solid rgba(200, 0, 0, 0.8)",
  },
  
  // Styles for modified chunks
  ".cm-diff-chunk": {
    backgroundColor: "rgba(180, 180, 255, 0.1)",
  },
  
  // Gap styles
  ".cm-merge-gap": {
    backgroundColor: "#f5f5f5",
    borderLeft: "1px solid #ddd",
    borderRight: "1px solid #ddd",
  },
});

export const commonEditorTheme = [
  oneDark,
  diffTheme,
  EditorView.theme({
    '&': { height: '100%' },
    '.cm-scroller': { fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }
  })
];
