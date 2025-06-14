export async function goToDefinition(view, languageClient, fileUri) {
  if (!languageClient.connected) {
    return;
  }
  
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  const position = {
    line: line.number - 1,
    character: pos - line.from
  };
  
  // Get word at cursor for logging
  const wordAt = view.state.wordAt(pos);
  const word = wordAt ? view.state.doc.sliceString(wordAt.from, wordAt.to) : 'unknown';
  
  try {
    const definition = await languageClient.definition(fileUri, position);
    
    if (definition) {
      // Emit event to open file at definition location
      view.dom.dispatchEvent(new CustomEvent('go-to-definition', {
        detail: definition,
        bubbles: true,
        composed: true
      }));
    }
  } catch (error) {
    console.error('Go to definition error:', error);
  }
}

export async function findReferences(view, languageClient, fileUri) {
  if (!languageClient.connected) {
    return;
  }
  
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  const position = {
    line: line.number - 1,
    character: pos - line.from
  };
  
  try {
    const references = await languageClient.references(fileUri, position);
    
    if (references && references.length > 0) {
      // Emit event to show references
      view.dom.dispatchEvent(new CustomEvent('show-references', {
        detail: references,
        bubbles: true,
        composed: true
      }));
    }
  } catch (error) {
    console.error('Find references error:', error);
  }
}

export function openFindInFiles(view) {
  // Get selected text if any
  const selection = view.state.selection.main;
  let selectedText = '';
  
  if (!selection.empty) {
    selectedText = view.state.doc.sliceString(selection.from, selection.to);
  }
  
  // Dispatch event to open find in files with selected text
  view.dom.dispatchEvent(new CustomEvent('open-find-in-files', {
    detail: { selectedText },
    bubbles: true,
    composed: true
  }));
}
