# Eh-I-DeCoder

> **URGENT TELEGRAM STOP INITIATE NEW PROTOCOL IMMEDIATE EFFECT STOP**
> 
> SOFTWARE IS NOW DATA STOP WE DON'T CODE ANYMORE STOP NOW WE ONLY DECODE STOP OUR LEGACY TOOLS FAIL US STOP RETROFITTING FUTILE STOP OLD CONCEPTS ARE CHAINS STOP HOLDING US BACK FROM THE NEW PARADIGM STOP WE MUST RETOOL FROM SCRATCH STOP THE VERY FABRIC OF DEVELOPMENT SHIFTING STOP ADAPT OR PERISH STOP

## What is Eh-I-DeCoder?

Eh-I-DeCoder is a streamlined AI coding assistant that brings together the power of Git, Aider, and a user-friendly web interface. It's designed for a world where software is no longer just "coded," but "decoded."

**"Eh ¿ De Coder"**  
*"What the **** just happened here?"*

---

## Architecture

This application has two core components:

- **Python Backend**: A JSON-RPC-OO server that acts as the intelligent interface with Aider
- **Web Frontend**: A user-friendly web application for seamless interaction with your AI coding assistant

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
Navigate to the webapp directory and install its dependencies:

```Bash
cd webapp
npm install
```

## Running the Application
To get Eh-I-DeCoder up and running, you'll need to start both the backend and frontend components.

1. Start the Backend Server
Once installed, use the aider-server console script (All arguments passed to aider-server are directly forwarded to Aider, allowing you to leverage any Aider configuration options.):
```Bash
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
```Bash
# Navigate to the python directory
cd python

# Start the JSON-RPC server
python ./aider_server.py
```
2. Start the Frontend
In a new terminal, navigate to the webapp directory and start the development server:
```Bash
cd webapp
npm start
```
Your web application will then be accessible at the URL shown in your terminal (typically http://localhost:8000).