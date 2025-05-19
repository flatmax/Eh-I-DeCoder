# Aider AI Assistant

This is a web-based interface for the [Aider](https://github.com/Aider-AI/aider) AI pair programming tool. The application consists of two components:

1. **Python Backend**: A JSON-RPC server that interfaces with Aider
2. **Web Frontend**: A user-friendly interface to interact with Aider

## Requirements

### Backend
- Python 3.8+
- Aider and its dependencies

### Frontend
- Node.js and npm

## Setup

### Backend Setup
```bash
# Navigate to the python directory
cd python

# Install dependencies
pip install -e .
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
```bash
# Navigate to the python directory
cd python

# Start the JSON-RPC server
python ./jrpc_oo_aider.py
```

Advanced options:
```bash
# Specify a different port
python ./jrpc_oo_aider.py --port 9000

# Pass arguments to Aider
python ./jrpc_oo_aider.py --aider-args "--model deepseek --api-key deepseek=<your-key-here>"
```

### 2. Start the Frontend
```bash
# In a new terminal, navigate to the webapp directory
cd webapp

# Start the development server
npm start
```

The web application should now be accessible at http://localhost:3000 (or another port if configured differently).

## Usage

1. Connect to the backend server using the interface
2. Use the prompt view to interact with Aider
3. Upload files to the context as needed

## Additional Information

For more details about the backend functionality, refer to the README in the `python` directory.
