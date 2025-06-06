// web-dev-server.config.mjs

// Import necessary modules from @open-wc/dev-server-hmr for Hot Module Replacement.
import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';

export default {
  // Specifies the main HTML file for the application.
  // This is used for SPA routing and ensures the server knows where your app starts.
  appIndex: 'index.html',

  // Enables Node.js module resolution for bare module specifiers in your code.
  // This allows you to import modules like `import { LitElement } from 'lit';`
  // without needing a full build step.
  nodeResolve: true,

  // Automatically opens the browser to your application's URL when the server starts.
  open: true,

  // Enables file watching, so the server detects changes in your files.
  // When changes are detected, it will trigger either an HMR update or a full page reload.
  watch: true,

  // Configure plugins for web-dev-server.
  plugins: [
    // The hmrPlugin enables Hot Module Replacement.
    // This allows changes to your LitElement components to be updated in the browser
    // without a full page reload, preserving application state.
    hmrPlugin({
      // `include` specifies which files should be monitored for HMR.
      // Only include files within the src directory to avoid full page reloads
      // from top-level entry files like main-window.js
      include: [
        'src/**/*.js',
        'src/**/*.ts' // Include if you use TypeScript
      ],

      // `presets` provide pre-configured HMR logic for specific frameworks/libraries.
      // `presets.lit` offers optimized HMR for LitElement (and Lit).
      presets: [presets.lit],

      // Exclude top-level files and other patterns that should trigger full reloads
      exclude: [
        '*.js',        // Exclude top-level JS files like main-window.js
        '*.html',      // Exclude HTML files
        'test/**/*'    // Exclude test files
      ]
    }),
  ],

  // Optional: You can add other web-dev-server options here if necessary.
  // For example, to configure a specific port:
  // port: 8000,

  // Optional: If you want to use watch-polling for environments where file system events
  // are unreliable (like some Docker setups or network drives).
  // This consumes more CPU, so use only if necessary.
  // watch: {
  //   poll: true,
  //   interval: 100 // Check every 100ms
  // }
};
