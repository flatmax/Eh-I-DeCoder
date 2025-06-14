// Base handler class with common functionality
class BaseHandler {
  constructor(documentManager) {
    this.documentManager = documentManager;
  }

  sendResponse(ws, id, result) {
    const response = { id, result };
    console.log(`Sending response for request ${id}:`, JSON.stringify(result, null, 2));
    ws.send(JSON.stringify(response));
  }

  sendError(ws, id, code, message) {
    const error = {
      id,
      error: { code, message }
    };
    console.log(`Sending error for request ${id}:`, message);
    ws.send(JSON.stringify(error));
  }

  getWordAtPosition(doc, position) {
    const text = doc.getText();
    const offset = doc.offsetAt(position);
    
    // Find word boundaries
    let start = offset;
    let end = offset;
    while (start > 0 && /\w/.test(text[start - 1])) start--;
    while (end < text.length && /\w/.test(text[end])) end++;
    
    return {
      word: text.substring(start, end),
      start,
      end,
      offset
    };
  }
}

module.exports = BaseHandler;
