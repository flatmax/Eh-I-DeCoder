export function formatHoverContent(content) {
  if (!content) return '';
  
  if (typeof content === 'string') {
    // Handle plain text content
    return convertMarkdownToHtml(content);
  } else if (content.kind === 'markdown') {
    // Handle markdown content
    return convertMarkdownToHtml(content.value || '');
  }
  
  return '';
}

export function convertMarkdownToHtml(markdown) {
  if (!markdown) return '';
  
  let html = markdown;
  
  // Convert code blocks first (to avoid conflicts with inline code)
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
  });
  
  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Convert bold text
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic text
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Convert line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<') || html.startsWith('<br>')) {
    html = '<p>' + html + '</p>';
  }
  
  // Clean up empty paragraphs and fix nested lists
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<ul>.*<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>.*<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1');
  
  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
