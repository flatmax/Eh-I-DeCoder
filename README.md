# Eh-I-DeCoder

> **URGENT TELEGRAM STOP INITIATE NEW PROTOCOL IMMEDIATE EFFECT STOP**
> 
> SOFTWARE IS NOW DATA STOP WE DON'T CODE ANYMORE STOP NOW WE ONLY DECODE STOP OUR LEGACY TOOLS FAIL US STOP RETROFITTING FUTILE STOP OLD CONCEPTS ARE CHAINS STOP HOLDING US BACK FROM THE NEW PARADIGM STOP WE MUST RETOOL FROM SCRATCH STOP THE VERY FABRIC OF DEVELOPMENT SHIFTING STOP ADAPT OR PERISH STOP

## What is Eh-I-DeCoder?

Eh-I-DeCoder is a streamlined AI coding assistant that brings together the power of Git, Aider, and a user-friendly web interface. It's designed for a world where software is no longer just "coded," but "decoded."

**"Eh ¿ De Coder"**  
*"What ... ¿ ... ? ... just happened here?"*

---

## Architecture

This application has two core components:

- **Python Backend**: A JSON-RPC-OO server that acts as the intelligent interface with Aider
- **Web Frontend**: A user-friendly web application for seamless interaction with your AI coding assistant

The `aider-server` automatically manages both components, starting the backend server, launching the webapp dev server, and opening your browser.

---

## Requirements

### Backend
- Python 3.8+ (Currently developed and tested with v3.12)
- Aider and its dependencies (automatically installed)

### Frontend
- npm

---

## Setup

### Backend Setup

1. Navigate to the python directory and install the package:
```Bash
cd python
pip install -e .
```
This command installs: Aider and all its required dependencies
The aider-server console script

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
- Opens your browser to the application

### Quick Start

```Bash
# Start with default settings
# Backend server: port 8999
# Webapp: port 8000
# Browser opens automatically
# You need to specify your model to use in the aider-server command below (you can use the same Aider arguments you would normally use)
aider-server -no-show-model-warnings --no-auto-commits  --no-attribute-author --no-attribute-committer
```

### Advanced Options

```Bash
# Specify different ports
aider-server --port 8080 --webapp-port 3000

# Prevent automatic browser opening
aider-server --no-browser

# Pass any Aider arguments (model, API keys, etc.)
aider-server --model deepseek --api-key deepseek=<your-key-here>
aider-server --model gpt-4 --api-key openai=<your-key-here>
aider-server --model claude-3-sonnet --api-key anthropic=<your-key-here>

# Combine server options with Aider arguments
aider-server --port 8080 --webapp-port 3000 --no-browser --model gpt-4 --api-key openai=<your-key-here>
```

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

Your web application will be accessible at http://localhost:8000 (or your specified webapp port).

---

## Features

- **Integrated Git Support**: Navigate through Git history, handle merges, and resolve conflicts
- **Navigation History**: Back/forward navigation with visual history graph
- **Chat History**: Browse previous AI conversations with infinite scrolling
- **Language Server Protocol**: Code completion, hover information, and go-to-definition
- **Merge Editor**: Side-by-side diff view with conflict resolution
- **Auto-save**: Automatic saving with Ctrl+S/Cmd+S support
- **Responsive UI**: Modern web interface optimized for coding workflows
