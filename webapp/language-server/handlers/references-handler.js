// References request handler
const BaseHandler = require('./base-handler');

class ReferencesHandler extends BaseHandler {
  handle(ws, id, params) {
    const { textDocument, position } = params;
    const doc = this.documentManager.getDocument(textDocument.uri);
    
    console.log(`Looking for references at ${textDocument.uri}, line ${position.line + 1}, char ${position.character}`);
    
    if (!doc) {
      this.sendResponse(ws, id, []);
      return;
    }
    
    const { word } = this.getWordAtPosition(doc, position);
    console.log(`Finding references for: "${word}"`);
    
    const references = this.findReferences(word, textDocument, doc);
    console.log(`Found ${references.length} references`);
    this.sendResponse(ws, id, references);
  }

  findReferences(word, textDocument, doc) {
    const text = doc.getText();
    const references = [];
    const wordPattern = new RegExp(`\\b${word}\\b`, 'g');
    let match;
    
    while ((match = wordPattern.exec(text)) !== null) {
      const startPos = doc.positionAt(match.index);
      const endPos = doc.positionAt(match.index + word.length);
      
      references.push({
        uri: textDocument.uri,
        range: {
          start: startPos,
          end: endPos
        }
      });
    }
    
    return references;
  }
}

module.exports = ReferencesHandler;
