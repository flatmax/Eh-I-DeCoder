# Changelog

## [v1.5.0] - 2024-12-20

### Added
- **LSP (Language Server Protocol) Integration**
  - WebSocket-based language server integration with Monaco editor
  - LSP server support with improved logging and error handling
  - Monaco language providers with file URI handling
  - Centralized LSP URI utilities for consistent file path handling
  - Ctrl+click detection and definition request control mechanism
  - Support for .orig files in language server detection
  - Multiple workspace pattern support for LSP file path extraction

- **Monaco Editor Migration**
  - Complete migration from CodeMirror to Monaco diff editor
  - Monaco diff editor with file content loading and language detection
  - Advanced styling and configuration options for Monaco editor
  - Find in files functionality integrated into Monaco diff editor
  - ReadOnly option with configurable modified editor state
  - Dynamic model management with MonacoModelManager class
  - Improved content update and error handling

- **Enhanced File Management**
  - Directory checkbox selection functionality in file tree
  - Ctrl+right-click to copy filename in file trees
  - Title attributes for file tree nodes for better context
  - Support for additional C/C++ file extensions
  - File-loaded event dispatch in DiffEditor

- **Navigation & History**
  - Navigation history tracking and visualization in diff editor
  - Alt+Left/Right Arrow support for navigation history
  - Improved cursor position handling and editor navigation
  - Dedicated navigation and file management managers

- **Server & Configuration**
  - Comprehensive server configuration with validation and help
  - Dynamic port finding for JSON-RPC server
  - Default webapp port changed to 9876 with localhost restriction
  - Centralized port management utilities

### Changed
- **Major Refactoring**
  - GitMergeView renamed to GitDiffView with related file updates
  - Modularized DiffEditor component with dedicated managers
  - Extracted editor logic into separate modules for better organization
  - Centralized event dispatching with EventHelper utility
  - Modularized process management with new ProcessManager classes
  - Separated navigation and file management logic into dedicated managers

- **UI/UX Improvements**
  - Improved diff editor header layout and file path display
  - Better layout and overflow handling in MainWindow
  - Adjusted HEAD label positioning and styling in diff editor
  - Enhanced graph container scrollbar and height styling
  - Save functionality with loading indicator for diff editor

- **Code Quality & Architecture**
  - Reduced verbose logging in LSP server and client
  - Improved file content reload and editor state preservation
  - Better markdown processing for command and user roles
  - Updated JRPC-OO conventions documentation

### Fixed
- Handle .orig files in language server detection
- Add trailing space when inserting words in input
- Guard against loading string before component initialization
- Improved Monaco diff editor model management and error handling

### Removed
- Original language-server implementation
- Unused editor components and imports
- Unnecessary package installations
- MergeEditor references (replaced with DiffEditor)

### Technical Improvements
- Enhanced LSP server with WebSocket integration
- Better error handling and logging throughout the application
- Modular component architecture for improved maintainability
- Consistent file path handling across LSP components
- Performance optimizations in editor operations

## [v1.3.0] - 2024-12-19

### Added
- Fuzzy file search with keyboard shortcut support (Ctrl+P/Cmd+P)
- Backdrop click handling for fuzzy search modal
- Hide event handling for fuzzy search component
- File save notification system in MergeEditor
- Auto-reload functionality in MergeEditor after file saves
- Keyboard shortcut mixin for consistent shortcut handling across components

### Changed
- Improved logging for keyboard events in FuzzySearch and KeyboardShortcutsMixin
- Enhanced fuzzy search user experience with better modal interactions
- Updated README with comprehensive aider-server usage guide and examples

### Fixed
- Better keyboard event handling and logging in search components

## [v1.2.0] - 2024-12-19

### Added
- Navigation history with back/forward support in merge editor
- Navigation override keymap with Alt/Cmd arrow key events
- Beforeunload warning to prevent accidental tab closure
- Search configuration and styling to merge view editor
- Interactive navigation history graph with file navigation
- History graph with fixed height and labels in MergeEditor
- Current file highlighting and scrolling in file tree
- Chunk navigation support in merge view editor
- Webapp dev server integration with auto-launch and browser opening
- Aider port passing as URL parameter when opening browser
- LSP connection status tracking and display

### Changed
- Updated default ports to 8000 for webapp and server
- Restructured merge editor header layout and navigation graph
- Updated header layout and scrollbar styles
- Updated header center class for graph layout
- Improved navigation history tracking for same file
- Optimized navigation history with new navigateToPosition method
- Updated navigation history graph styling and behavior
- Adjusted node spacing, label positioning, and graph layout
- Simplified chunk navigation using CodeMirror's built-in methods

### Refactored
- Extracted webapp server utilities to separate module
- Removed click handler from language client extension
- Removed key bindings extension from language client and added to merge view
- Silenced language client connection errors and logs

## [v1.1.0] - 2025-06-14

### Added

- **Editor Enhancements**
  - Word click handler for extracting words in merge editor
  - Advanced text selection methods for merge and git views
  - Improved CodeMirror layout and scrolling with flexbox
  - Enhanced scrollbar configuration and change indicators
  - Validation for commit selection in git history view

### Changed
- **Code Architecture & Refactoring**
  - Modularized LanguageClientExtension by extracting extensions and utilities
  - Updated import statements to support relative and absolute imports
  - Improved GitMergeViewManager for better merge view initialization and handling
  - Simplified CodeMirror editor styles and scrollbar configuration
  - Improved local definition search with enhanced regex patterns
  - Modularized merge editor styles into separate files
  - Extracted styles and Prism setup into separate modules
  - Simplified CardMarkdown component and improved markdown rendering
  - Refactored ChatHistoryPanel with modular scroll and parsing management
  - Simplified content parsing logic in ChatHistoryPanel

- **UI Improvements**
  - Updated Prism.js theme to Tomorrow Night with enhanced syntax highlighting
  - Improved merge editor scrollbar and overflow handling
  - Refactored card markdown and chat history styles for improved layout
  - Improved scrolling and layout for merge view CodeMirror editors

### Fixed
- Removed console.log statements from various components
- Disabled editing in head view and updated revert button direction
- Removed debug console logs from CardMarkdown code highlighting
- Removed "#### " prefix from user messages in chat history parsing

### Technical Improvements
- Added debug logging and custom element registration for ChatHistoryPanel
- Added logging for remotes and commented out serverChanged method
- Updated CONVENTIONS.md documentation
- Enhanced merge editing experience with new MergeViewManager

## [v1.0.0] - 2025-06-09

### Added
- **Git Integration & History Management (in alpha - needs more testing)**
  - Comprehensive Git editor and status tracking functionality
  - Interactive Git history view with commit browsing
  - Git merge view with conflict resolution support
  - Interactive rebase handling and monitoring
  - Patch/diff highlighting for code changes
  - Git status tracking with modified and untracked file expansion in tree view
  - Pagination and infinite scroll support for commit history
  - Branch-specific commit history with performance optimizations

- **Chat History & Navigation**
  - Chat history panel with infinite scrolling and file loading
  - Tab navigation system for AI Assistant and Chat History
  - Debug information display in chat history panel
  - Scroll handling improvements with auto-scroll tracking

- **UI/UX Enhancements**
  - Advanced text selection methods for merge and git views
  - Hover effects and dynamic panel sizing for git history view
  - Collapsed commit hash view and read-only mode
  - Disabled commit handling for from/to commit selection
  - Mode toggle button integration in prompt view
  - Improved scrolling and layout for CodeMirror editors

### Changed
- **Code Architecture & Refactoring**
  - Modularized GitOperations by splitting into specialized operation classes
  - Extracted commit data and resize logic into separate modules
  - Modularized GitMergeView with separate data and view managers
  - Improved prompt view dialog state and interaction handling
  - Streamlined content parsing with separate card components
  - Optimized get_commit_history with branch-specific improvements

- **UI Improvements**
  - Refactored tab navigation UI with improved styling and layout
  - Adjusted maximized prompt view positioning and height
  - Improved UI element positioning and alignment
  - Enhanced scroll management with auto-scroll tracking

### Fixed
- Removed debug console logs from CardMarkdown code highlighting
- Simplified text selection methods
- Ignored directory modification events in git monitor
- Removed showPromptView state for consistent prompt-view rendering
- Fixed markdown header formatting in documentation

### Technical Improvements
- Enhanced streaming content parsing
- Improved chat history panel with better scroll handling
- Better Git conflict resolution support
- Performance optimizations for commit history loading
- Modular component architecture for better maintainability
