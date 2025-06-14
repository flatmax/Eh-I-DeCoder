import { EditorSelection } from '@codemirror/state';

export function addCursorUp(view) {
  const state = view.state;
  const selection = state.selection;
  const newRanges = [];
  
  // Keep all existing selections
  for (const range of selection.ranges) {
    newRanges.push(range);
  }
  
  // Find the topmost cursor to add a new one above it
  let topmostRange = selection.main;
  for (const range of selection.ranges) {
    const line = state.doc.lineAt(range.head);
    const topmostLine = state.doc.lineAt(topmostRange.head);
    if (line.number < topmostLine.number) {
      topmostRange = range;
    }
  }
  
  // Add a new cursor above the topmost cursor
  const line = state.doc.lineAt(topmostRange.head);
  
  if (line.number > 1) {
    const prevLine = state.doc.line(line.number - 1);
    const column = topmostRange.head - line.from;
    const newPos = prevLine.from + Math.min(column, prevLine.length);
    
    // Check if we already have a cursor at this position
    const alreadyExists = newRanges.some(r => r.head === newPos && r.anchor === newPos);
    
    if (!alreadyExists) {
      newRanges.push(EditorSelection.cursor(newPos));
    }
  }
  
  if (newRanges.length > selection.ranges.length) {
    view.dispatch({
      selection: EditorSelection.create(newRanges, newRanges.length - 1),
      scrollIntoView: true
    });
  }
  
  return true;
}

export function addCursorDown(view) {
  const state = view.state;
  const selection = state.selection;
  const newRanges = [];
  
  // Keep all existing selections
  for (const range of selection.ranges) {
    newRanges.push(range);
  }
  
  // Find the bottommost cursor to add a new one below it
  let bottommostRange = selection.main;
  for (const range of selection.ranges) {
    const line = state.doc.lineAt(range.head);
    const bottommostLine = state.doc.lineAt(bottommostRange.head);
    if (line.number > bottommostLine.number) {
      bottommostRange = range;
    }
  }
  
  // Add a new cursor below the bottommost cursor
  const line = state.doc.lineAt(bottommostRange.head);
  
  if (line.number < state.doc.lines) {
    const nextLine = state.doc.line(line.number + 1);
    const column = bottommostRange.head - line.from;
    const newPos = nextLine.from + Math.min(column, nextLine.length);
    
    // Check if we already have a cursor at this position
    const alreadyExists = newRanges.some(r => r.head === newPos && r.anchor === newPos);
    
    if (!alreadyExists) {
      newRanges.push(EditorSelection.cursor(newPos));
    }
  }
  
  if (newRanges.length > selection.ranges.length) {
    view.dispatch({
      selection: EditorSelection.create(newRanges, newRanges.length - 1),
      scrollIntoView: true
    });
  }
  
  return true;
}
