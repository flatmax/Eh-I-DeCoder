/**
 * MessageParser - Handles parsing of chat history content into structured messages
 */
export class MessageParser {
  constructor() {
    this.rolePatterns = {
      user: /^#### /,
      command: /^> /
    };
  }

  /**
   * Determine the role of a line based on its prefix
   */
  getLineRole(line) {
    if (this.rolePatterns.user.test(line)) return 'user';
    if (this.rolePatterns.command.test(line)) return 'command';
    return 'assistant';
  }

  /**
   * Parse the entire content into messages
   */
  parseContent(content) {
    if (!content || typeof content !== 'string') {
      return [];
    }

    const messages = [];
    const lines = content.split('\n');
    
    let currentMessage = null;
    let lastLineWasEmpty = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const isEmpty = trimmedLine === '';
      const role = this.getLineRole(line);

      // Check if we need to start a new message
      const shouldStartNewMessage = 
        !currentMessage || // No current message
        role !== currentMessage.role || // Role changed
        (role === 'command' && currentMessage.role === 'command' && lastLineWasEmpty); // New command block

      if (shouldStartNewMessage) {
        // Save current message if it has content
        if (currentMessage && currentMessage.lines.length > 0) {
          const content = this.processMessageContent(currentMessage);
          if (content) {
            messages.push({
              role: currentMessage.role,
              content: content
            });
          }
        }
        
        // Start new message
        currentMessage = {
          role: role,
          lines: [line]
        };
      } else {
        // Add to current message
        currentMessage.lines.push(line);
      }

      lastLineWasEmpty = isEmpty;
    }

    // Don't forget the last message
    if (currentMessage && currentMessage.lines.length > 0) {
      const content = this.processMessageContent(currentMessage);
      if (content) {
        messages.push({
          role: currentMessage.role,
          content: content
        });
      }
    }

    console.log('MessageParser: Parsed messages count:', messages.length);
    return messages;
  }

  /**
   * Process the lines of a message into final content
   */
  processMessageContent(message) {
    let content = message.lines.join('\n').trim();
    
    // Strip the "#### " prefix from user messages
    if (message.role === 'user') {
      content = content.split('\n')
        .map(line => line.startsWith('#### ') ? line.substring(5) : line)
        .join('\n');
    }
    
    return content;
  }
}
