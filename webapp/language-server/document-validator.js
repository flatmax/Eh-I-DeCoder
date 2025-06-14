// Document validation and diagnostics
const WebSocket = require('ws');
const { DIAGNOSTIC_SEVERITY } = require('./constants');

class DocumentValidator {
  validate(uri, doc, wsClients) {
    if (!doc) return;
    
    const text = doc.getText();
    const diagnostics = [];
    
    // Find TODO, FIXME, HACK comments
    this.findCommentIssues(text, doc, diagnostics);
    
    // Find potential issues
    this.findConsoleStatements(text, doc, diagnostics);
    
    // Send diagnostics to all connected clients
    this.sendDiagnostics(uri, diagnostics, wsClients);
  }

  findCommentIssues(text, doc, diagnostics) {
    const pattern = /\b(TODO|FIXME|HACK)\b(.*)$/gm;
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      const startPos = doc.positionAt(match.index);
      const endPos = doc.positionAt(match.index + match[0].length);
      
      diagnostics.push({
        severity: DIAGNOSTIC_SEVERITY.Warning,
        range: {
          start: startPos,
          end: endPos
        },
        message: `${match[1]} comment found: ${match[2].trim()}`,
        source: 'language-server'
      });
    }
  }

  findConsoleStatements(text, doc, diagnostics) {
    const issuePattern = /console\.(log|error|warn|info|debug)\(/g;
    let match;
    
    while ((match = issuePattern.exec(text)) !== null) {
      const startPos = doc.positionAt(match.index);
      const endPos = doc.positionAt(match.index + match[0].length);
      
      diagnostics.push({
        severity: DIAGNOSTIC_SEVERITY.Information,
        range: {
          start: startPos,
          end: endPos
        },
        message: 'Console statement found - consider removing in production',
        source: 'language-server'
      });
    }
  }

  sendDiagnostics(uri, diagnostics, wsClients) {
    const diagnosticsMessage = {
      method: 'textDocument/publishDiagnostics',
      params: {
        uri: uri,
        diagnostics: diagnostics
      }
    };
    
    wsClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(diagnosticsMessage));
      }
    });
  }
}

module.exports = DocumentValidator;
