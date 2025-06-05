# Eh-I-DeCoder

## What is Eh-I-DeCoder?

**Eh-I-DeCoder** is a trimmed down AI coding assistant (Git+Aider+Webapp) that draws inspiration from several concepts:

### 1. AI IDE Coder - The Web-Based Development Environment
A modern, web-based AI IDE that brings the power of AI pair programming directly to your browser.

### 2. "Eh ¿ De Coder" - The Debugging Detective
*"What the **** just happened here?"* - When your AI coding assistant does something unexpected or seemingly crazy, Eh-I-DeCoder helps you decode what it did. Whether you need to guide the AI to fix its changes or understand the modifications well enough to fix them yourself, this tool provides the transparency and control you need.

## Demo

![Demo of Eh-I-DeCoder in action](https://github.com/user-attachments/assets/3e0719e9-769a-4242-8241-7fc585d4c799)

---

This is a web-based interface for the [Aider](https://github.com/Aider-AI/aider) AI pair programming tool. The application consists of two components:

1. **Python Backend**: A JSON-RPC-OO server that interfaces with Aider
2. **Web Frontend**: A user-friendly interface to interact with Aider

## Requirements

### Backend
- Python 3.8+ (I'm currently decoding with v3.12)
- Aider and its dependencies (installed automatically)

### Frontend
- npm

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

You need to start both the backend and frontend components. All backend (aider-server) arguments are passed through to Aider, so you can use any configuration options that Aider supports:

### 1. Start the Backend Server

After installation, use the `aider-server` console script:

```bash
# Start with default settings (port 8999)
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


### 2. Start the Frontend
```bash
# In a new terminal, navigate to the webapp directory
cd webapp

# Start the development server
npm start
```

The web application will be accessible at the URL shown in your terminal (default is http://localhost:8999).

## Usage

1. Connect to the backend server using the interface (refresh the browser if necessary)
2. Use the prompt view to interact with Aider
3. Click to add files to the context as needed
4. So many other features...
