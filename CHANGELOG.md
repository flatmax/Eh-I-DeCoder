# Changelog

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
