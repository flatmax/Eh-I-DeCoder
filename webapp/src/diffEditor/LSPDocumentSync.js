export class LSPDocumentSync {
  constructor(client) {
    this.client = client;
    this.openDocuments = new Map();
    this.documentVersions = new Map();
  }

  async didOpen(uri, languageId, version, content) {
    if (!this.client.initialized) return;

    this.client.log('Document opened:', { uri, languageId, version, contentLength: content.length });

    this.openDocuments.set(uri, { languageId, version, content });
    this.documentVersions.set(uri, version);

    const params = {
      textDocument: {
        uri: uri,
        languageId: languageId,
        version: version,
        text: content
      }
    };

    try {
      await this.client.jrpcClient.call['LSPWrapper.did_open'](params);
      this.client.log('Document open notification sent successfully');
    } catch (error) {
      console.error('didOpen error:', error);
      this.client.log('Failed to send document open notification:', error);
    }
  }

  async didChange(uri, version, changes) {
    if (!this.client.initialized) return;

    this.client.log('Document changed:', { uri, version, changeCount: changes.length });

    this.documentVersions.set(uri, version);

    const params = {
      textDocument: {
        uri: uri,
        version: version
      },
      contentChanges: changes.map(change => ({
        range: {
          start: { line: change.range.startLineNumber - 1, character: change.range.startColumn - 1 },
          end: { line: change.range.endLineNumber - 1, character: change.range.endColumn - 1 }
        },
        text: change.text
      }))
    };

    try {
      await this.client.jrpcClient.call['LSPWrapper.did_change'](params);
      this.client.log('Document change notification sent successfully');
    } catch (error) {
      console.error('didChange error:', error);
      this.client.log('Failed to send document change notification:', error);
    }
  }

  async didClose(uri) {
    if (!this.client.initialized) return;

    this.client.log('Document closed:', { uri });

    this.openDocuments.delete(uri);
    this.documentVersions.delete(uri);

    const params = {
      textDocument: { uri: uri }
    };

    try {
      await this.client.jrpcClient.call['LSPWrapper.did_close'](params);
      this.client.log('Document close notification sent successfully');
    } catch (error) {
      console.error('didClose error:', error);
      this.client.log('Failed to send document close notification:', error);
    }
  }

  async didSave(uri, content) {
    if (!this.client.initialized) return;

    this.client.log('Document saved:', { uri, contentLength: content.length });

    const params = {
      textDocument: { uri: uri },
      text: content
    };

    try {
      await this.client.jrpcClient.call['LSPWrapper.did_save'](params);
      this.client.log('Document save notification sent successfully');
    } catch (error) {
      console.error('didSave error:', error);
      this.client.log('Failed to send document save notification:', error);
    }
  }

  dispose() {
    this.openDocuments.clear();
    this.documentVersions.clear();
  }
}
