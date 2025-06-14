/**
 * Prism.js setup and language imports
 */

// Import Prism.js core first
import 'prismjs';

// Import language components - diff should be imported early
import 'prismjs/components/prism-diff.js';
import 'prismjs/components/prism-javascript.js';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-bash.js';
import 'prismjs/components/prism-css.js';
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-markdown.js';
import 'prismjs/components/prism-yaml.js';
import 'prismjs/components/prism-sql.js';
import 'prismjs/components/prism-typescript.js';
import 'prismjs/components/prism-jsx.js';
import 'prismjs/components/prism-tsx.js';
import 'prismjs/components/prism-c.js';
import 'prismjs/components/prism-cpp.js';
import 'prismjs/components/prism-matlab.js';
import 'prismjs/components/prism-makefile.js';

// Export a setup function that can be called to ensure Prism is loaded
export function setupPrism() {
  // This function exists to ensure all imports are processed
  // The imports above will be executed when this module is loaded
  if (!window.Prism) {
    console.warn('Prism.js not loaded properly');
  }
}

// Additional Prism configuration can be added here if needed
export function configurePrism() {
  if (window.Prism) {
    // Add any custom Prism configurations here
    // For example, custom language definitions or plugins
  }
}
