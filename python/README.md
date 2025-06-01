# Eh-I-DeCoder Python Backend

This directory contains the Python backend for Eh-I-DeCoder, which provides a JSON-RPC server interface to the Aider AI pair programming tool.

## Files

- `aider_server.py` - Main server script that starts the JSON-RPC server and interfaces with Aider
- `io_wrapper.py` - Wrapper class that intercepts Aider's input/output for web interface integration
- `coder_wrapper.py` - Wrapper class that provides non-blocking execution of Aider commands
- `base_wrapper.py` - Base class providing common functionality for wrapper classes
- `simple_std_io.py` - Simple standard I/O classes for debugging and testing

## Setup

Install the package in development mode:

```bash
pip install -e .
```

This will install all required dependencies including Aider and the JSON-RPC library, and create the `aider-server` console script.

## Usage

### Using the Console Script (Recommended)

After installation, start the server using the `aider-server` command:

```bash
# Start with default settings (port 8999)
aider-server

# Specify a different port for the JSON-RPC server
aider-server --port 8080

# Pass any Aider arguments directly
aider-server --model gpt-4 --api-key openai=your-key-here
aider-server --model claude-3-sonnet --api-key anthropic=your-key-here
aider-server --model deepseek --api-key deepseek=your-key-here

# Combine server configuration with Aider options
aider-server --port 8080 --model gpt-4 --api-key openai=your-key-here --no-fancy-input

# Use Aider's configuration file options
aider-server --config /path/to/aider.conf.yml

# Enable specific Aider features
aider-server --auto-commits --dirty-commits --model gpt-4
```

### Running the Script Directly

Alternatively, you can run the script directly:

```bash
python ./aider_server.py
```

The script accepts all command line arguments and passes them directly to Aider. This means you can use any Aider configuration options. All arguments except `--port` are passed through to Aider unchanged, giving you full access to Aider's configuration system.

## JSON-RPC Interface

The server exposes several classes via JSON-RPC:

- `EditBlockCoder` - Direct access to Aider's coder instance
- `Commands` - Access to Aider's command system
- `CoderWrapper` - Non-blocking wrapper for running Aider prompts
- `IOWrapper` - Intercepts and forwards Aider's I/O for web interface integration

## Architecture

The backend uses wrapper classes to intercept and modify Aider's behavior:

1. **IOWrapper** - Intercepts all of Aider's output (assistant responses, tool output, etc.) and forwards it to the web interface via JSON-RPC
2. **CoderWrapper** - Provides a non-blocking interface to run Aider prompts, allowing the web interface to remain responsive
3. **BaseWrapper** - Provides common functionality like logging and async task management

This architecture allows the web interface to receive real-time updates from Aider while maintaining full control over the interaction flow.
