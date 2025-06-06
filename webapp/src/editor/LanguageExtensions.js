import {javascript} from '@codemirror/lang-javascript';
import {python} from '@codemirror/lang-python';
import {html as htmlLang} from '@codemirror/lang-html';
import {css as cssLang} from '@codemirror/lang-css';
import {json} from '@codemirror/lang-json';
import {markdown} from '@codemirror/lang-markdown';
import {cpp} from '@codemirror/lang-cpp';

export function getLanguageExtension(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return javascript();
    case 'py':
      return python();
    case 'html':
    case 'htm':
      return htmlLang();
    case 'css':
      return cssLang();
    case 'json':
      return json();
    case 'md':
    case 'markdown':
      return markdown();
    case 'c':
    case 'h':
    case 'cpp':
    case 'hpp':
      return cpp();
    default:
      return [];
  }
}
