import { hoverTooltip } from '@codemirror/view';
import { formatHoverContent } from './utils/MarkdownFormatter.js';

export function createHoverExtension(languageClient, fileUri) {
  return hoverTooltip(async (view, pos) => {
    if (!languageClient.connected) return null;
    
    const line = view.state.doc.lineAt(pos);
    const position = {
      line: line.number - 1,
      character: pos - line.from
    };
    
    try {
      const hover = await languageClient.hover(fileUri, position);
      if (!hover || !hover.contents) return null;
      
      const content = hover.contents.value || hover.contents;
      
      return {
        pos,
        above: true,
        create() {
          const dom = document.createElement('div');
          dom.className = 'cm-tooltip-hover';
          
          // Enhanced markdown rendering
          const htmlContent = formatHoverContent(content);
          
          dom.innerHTML = htmlContent;
          return { dom };
        }
      };
    } catch (error) {
      console.error('Hover error:', error);
      return null;
    }
  });
}
