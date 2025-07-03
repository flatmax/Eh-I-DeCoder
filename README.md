# Eh-I-DeCoder

> **URGENT TELEGRAM STOP INITIATE NEW PROTOCOL IMMEDIATE EFFECT STOP**
> 
> SOFTWARE IS NOW DATA STOP WE DON'T CODE ANYMORE STOP NOW WE ONLY DECODE STOP OUR LEGACY TOOLS FAIL US STOP RETROFITTING FUTILE STOP OLD CONCEPTS ARE CHAINS STOP HOLDING US BACK FROM THE NEW PARADIGM STOP WE MUST RETOOL FROM SCRATCH STOP THE VERY FABRIC OF DEVELOPMENT SHIFTING STOP ADAPT OR PERISH STOP

## What is Eh-I-DeCoder?

Eh-I-DeCoder is a streamlined AI coding assistant that brings together the power of Git, Aider, and a user-friendly web interface. It's designed for a world where software is no longer just "coded," but "decoded."

**"Eh ¿ De Coder"**  
*"What ... ¿ ... ? ... just happened here?"*

![Editor with shrunken AI dialog](https://github.com/user-attachments/assets/1b06da39-47d0-4339-b0c5-aab38a842143)
*Checkboxes for context.*

![Checkboxes for context](https://github.com/user-attachments/assets/321aa86a-389c-425f-9f4c-20be81ab2464)
*Editor with shrunken AI dialog.*

![Git action menus per file](https://github.com/user-attachments/assets/300463d2-095a-4d99-b35f-08074a76f33c)
*Git action menus per file.*

---

## Architecture

This application has three core components:

- **Python Backend**: A JSON-RPC-OO server that acts as the intelligent interface with Aider
- **Web Frontend**: A user-friendly web application for seamless interaction with your AI coding assistant
- **LSP Server**: Language Server Protocol integration providing intelligent code features

The `aider-server` automatically manages all components, starting the backend server, launching the webapp dev server, initializing the LSP server, and opening your browser.

---

## Requirements

### Backend
- Python 3.8+ (Currently developed and tested with v3.12)
- Aider and its dependencies (automatically installed)

### Frontend
- npm

### LSP Features (Optional)
For enhanced code intelligence, install language servers:
- **Python**: `python-lsp-server` (automatically installed)
- **TypeScript/JavaScript**: `npm install -g typescript-language-server`
- **C/C++**: Install `clangd` (usually available via system package manager)

---

## Setup

### Backend Setup

1. Navigate to the python directory and install the package:
```Bash
cd python
pip install -e .
```
This command installs: Aider and all its required dependencies, the aider-server console script, and python-lsp-server for LSP features.

#### Troubleshooting
If you encounter a ModuleNotFoundError: No module named 'boto3', simply install the missing dependency:
```Bash
pip install boto3
```

### Frontend Setup
Navigate to the webapp directory and install its dependencies (one-time setup):

```Bash
cd webapp
npm install
```

## Running the Application

Eh-I-DeCoder now provides a streamlined startup experience. The `aider-server` command automatically:
- Starts the backend JSON-RPC server
- Launches the webapp development server
- Initializes the LSP server for code intelligence
- Opens your browser to the application

### Quick Start

```Bash
# Start with default settings
# Backend server: port 8999
# Webapp: port 9876
# LSP server: auto-detected port
# Browser opens automatically
# You need to specify your model to use in the aider-server command below (you can use the same Aider arguments you would normally use)
aider-server --no-show-model-warnings --no-auto-commits --no-attribute-author --no-attribute-committer
```

### Advanced Options

```Bash
# Specify different ports
aider-server --port 8080 --webapp-port 3000 --lsp-port 9001

# Disable LSP features
aider-server --no-lsp

# Prevent automatic browser opening
aider-server --no-browser

# Pass any Aider arguments (model, API keys, etc.)
aider-server --model deepseek --api-key deepseek=<your-key-here>
aider-server --model gpt-4 --api-key openai=<your-key-here>
aider-server --model claude-3-sonnet --api-key anthropic=<your-key-here>

# Combine server options with Aider arguments
aider-server --port 8080 --webapp-port 3000 --lsp-port 9001 --no-browser --model gpt-4 --api-key openai=<your-key-here>
```

### Configuration Help

The `aider-server` command provides comprehensive help and examples:

```Bash
# View all available options and examples
aider-server --help
```

The server automatically validates your configuration and will report any issues (like port conflicts or missing directories) before starting.

### Alternative Startup Method

You can also run the script directly:
```Bash
# Navigate to the python directory
cd python

# Start the integrated server
python ./aider_server.py # with your aider args, e.g.  --no-auto-commits and more
```

### Manual Frontend Development (Optional)

If you need to run the frontend separately for development purposes:
```Bash
cd webapp
npm start
```

Your web application will be accessible at http://localhost:9876 (or your specified webapp port).

---

## Features

### Core Features
- **Integrated Git Support**: Navigate through Git history, handle merges, and resolve conflicts
- **Navigation History**: Back/forward navigation with visual history graph
- **Chat History**: Browse previous AI conversations with infinite scrolling
- **Merge Editor**: Side-by-side diff view with conflict resolution
- **Auto-save**: Automatic saving with Ctrl+S/Cmd+S support
- **Responsive UI**: Modern web interface optimized for coding workflows

### Language Server Protocol (LSP) Features
- **Auto-completion**: Intelligent code completion for Python, JavaScript/TypeScript, and C/C++
- **Hover Information**: Rich hover tooltips with documentation and type information
- **Go-to-Definition**: Ctrl+click navigation to symbol definitions across files
- **Error Diagnostics**: Real-time error highlighting and problem detection
- **Multi-language Support**: Automatic language detection and appropriate LSP server selection

### LSP Keyboard Shortcuts
- **Ctrl+Click**: Navigate to definition (works across files and projects)
- **Ctrl+Space**: Trigger auto-completion (automatic on typing)
- **Hover**: Move mouse over symbols for documentation

### LSP Status
The application shows LSP connection status in the sidebar. When connected, you'll see enhanced code intelligence features. If language servers are not installed, the application continues to work normally without LSP features.

---

## Configuration

### Server Configuration
The `aider-server` command provides centralized configuration management:

- **Port Configuration**: Specify ports for all server components
- **Feature Toggles**: Enable/disable LSP features and browser opening
- **Validation**: Automatic validation of configuration with helpful error messages
- **Summary Display**: Clear overview of all configuration settings on startup

### Configuration Validation
The server automatically validates:
- Port ranges (1024-65535)
- Port conflicts between services
- Required directories and files
- LSP server availability

### Environment Variables
You can also configure the server using environment variables:
- `PORT`: Webapp development server port
- `LSP_PORT`: LSP server port
- `WORKSPACE_ROOT`: Workspace root directory

---

## Language Server Setup

### Python LSP
Automatically installed with the backend. Provides:
- Auto-completion for Python modules and functions
- Hover documentation from docstrings
- Go-to-definition for Python symbols
- Error and warning diagnostics

### TypeScript/JavaScript LSP
```bash
npm install -g typescript-language-server
```
Provides:
- Auto-completion for JavaScript/TypeScript
- Type information and documentation
- Cross-file navigation
- Syntax and type error detection

### C/C++ LSP
Install `clangd` via your system package manager:
```bash
# Ubuntu/Debian
sudo apt install clangd

# macOS
brew install llvm

# Windows
# Download from LLVM releases or use Visual Studio installer
```
Provides:
- C/C++ auto-completion
- Header file navigation
- Compiler error diagnostics
- Cross-reference support

---

## Troubleshooting

### Configuration Issues
- **Port conflicts**: Use `--port`, `--webapp-port`, or `--lsp-port` to specify different ports
- **Invalid configuration**: The server will display specific validation errors on startup
- **Missing directories**: Ensure you're running from the correct directory structure

### LSP Issues
- **No auto-completion**: Check if the appropriate language server is installed
- **Go-to-definition not working**: Ensure you're using Ctrl+click, not just click
- **LSP server failed to start**: Check the console output for specific language server errors

### Performance
LSP features may take a moment to initialize when opening large projects. This is normal behavior as language servers analyze the codebase.

### Getting Help
Use `aider-server --help` to see all available configuration options and examples.
