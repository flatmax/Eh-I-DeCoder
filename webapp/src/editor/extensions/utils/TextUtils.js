export function getTextAtPosition(view, pos) {
  const selection = view.state.selection.main;
  
  // If there's a selection, use that
  if (!selection.empty) {
    return view.state.doc.sliceString(selection.from, selection.to);
  }
  
  // Get the line containing the position
  const line = view.state.doc.lineAt(pos);
  const lineText = line.text;
  const charIndex = pos - line.from;
  
  // Check if we're inside a quoted string
  const quotedString = extractQuotedString(lineText, charIndex);
  if (quotedString) {
    return quotedString;
  }
  
  // Fall back to word extraction
  const wordAt = view.state.wordAt(pos);
  if (wordAt) {
    return view.state.doc.sliceString(wordAt.from, wordAt.to);
  }
  
  return '';
}

export function extractQuotedString(lineText, charIndex) {
  // Look for single or double quotes
  const quotes = ['"', "'"];
  
  for (const quote of quotes) {
    // Find all quote positions in the line
    const quotePositions = [];
    for (let i = 0; i < lineText.length; i++) {
      if (lineText[i] === quote && (i === 0 || lineText[i - 1] !== '\\')) {
        quotePositions.push(i);
      }
    }
    
    // Check if we're inside a quoted string
    for (let i = 0; i < quotePositions.length - 1; i += 2) {
      const startQuote = quotePositions[i];
      const endQuote = quotePositions[i + 1];
      
      if (charIndex > startQuote && charIndex < endQuote) {
        // We're inside this quoted string, return the content including quotes
        return lineText.substring(startQuote, endQuote + 1);
      }
    }
  }
  
  return null;
}
