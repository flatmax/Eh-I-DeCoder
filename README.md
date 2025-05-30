# Eh-I-DeCoder

## What is Eh-I-DeCoder?

**Eh-I-DeCoder** is a multi-faceted AI coding assistant that draws inspiration from several concepts:

### 1. AI IDE Coder - The Web-Based Development Environment
A modern, web-based AI IDE that brings the power of AI pair programming directly to your browser. No more switching between terminals and editors - everything you need for AI-assisted development in one intuitive interface.

### 2. "Eh ¿ De Coder" - The Debugging Detective
*"What the f*** just happened here?"* - When your AI coding assistant does something unexpected or seemingly crazy, Eh-I-DeCoder helps you decode what it did. Whether you need to guide the AI to fix its changes or understand the modifications well enough to fix them yourself, this tool provides the transparency and control you need.

### 3. AI Error Correction Decoder - Quantum-Inspired Error Handling
Drawing inspiration from Quantum Error Correcting Code (QECC) decoders, Eh-I-DeCoder applies similar principles to AI-assisted coding. Just as quantum computers use error correction to detect and fix quantum state corruption in noisy environments, this tool helps detect when AI-generated code introduces bugs or unexpected behavior, recognizes patterns in AI coding mistakes, and provides corrective suggestions - all operating in the inherently noisy environment where both quantum systems and AI coding assistants are prone to errors that require intelligent correction mechanisms.

---

This is a web-based interface for the [Aider](https://github.com/Aider-AI/aider) AI pair programming tool. The application consists of two components:

1. **Python Backend**: A JSON-RPC server that interfaces with Aider
2. **Web Frontend**: A user-friendly interface to interact with Aider

## Requirements

### Backend
- Python 3.8+
- Aider and its dependencies (installed automatically)

### Frontend
- Node.js and npm

## Setup

### Backend Setup
```bash
# Navigate to the python directory
cd python

# Install the package and all dependencies
pip install -e .
```

This will install:
- Aider and all its dependencies
- The JSON-RPC library
- The `aider-server` console script

#### Troubleshooting

If you see this error:
```
ModuleNotFoundError: No module named 'boto3'
```

Install the missing dependency:
```bash
pip install boto3
```

### Frontend Setup
```bash
# Navigate to the webapp directory
cd webapp

# Install dependencies
npm install
```

## Running the Application

You need to start both the backend and frontend components:

### 1. Start the Backend Server

After installation, use the `aider-server` console script:

```bash
# Start with default settings (port 9000)
aider-server

# Specify a different port for the JSON-RPC server
aider-server --port 8080

# Pass any Aider arguments (model, API keys, etc.)
aider-server --model deepseek --api-key deepseek=<your-key-here>
aider-server --model gpt-4 --api-key openai=<your-key-here>
aider-server --model claude-3-sonnet --api-key anthropic=<your-key-here>

# Combine server port with Aider arguments
aider-server --port 8080 --model gpt-4 --api-key openai=<your-key-here>
```

Alternatively, you can run the script directly:
```bash
# Navigate to the python directory
cd python

# Start the JSON-RPC server
python ./aider_server.py
```

All arguments are passed through to Aider, so you can use any configuration options that Aider supports.

### 2. Start the Frontend
```bash
# In a new terminal, navigate to the webapp directory
cd webapp

# Start the development server
npm start
```

The web application will be accessible at the URL shown in your terminal (typically http://localhost:8000 or similar).

## Usage

1. Connect to the backend server using the interface
2. Use the prompt view to interact with Aider
3. Upload files to the context as needed

## Additional Information

For more details about the backend functionality, refer to the README in the `python` directory.
