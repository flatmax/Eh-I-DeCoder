# Python Project with Aider

This project uses [Aider](https://github.com/Aider-AI/aider), an AI pair programming tool that helps you code in your terminal.

## Getting Started

### Installation

1. Install the package and dependencies:
   ```bash
   pip install -e .
   ```

2. Run aider-install to set up the necessary models and configurations:
   ```bash
   aider-install
   ```

### Using the JSON-RPC Interface

You can use the JSON-RPC interface to interact with Aider programmatically:

```bash
# Start the JSON-RPC server
python jrpc_oo_aider.py --port 9000 --model deepseek --api-key deepseek=<your-key-here>
```

Options:
- `--port`: Specify the port for the JSON-RPC server (default: 9000)
- All other arguments are passed directly to Aider

This allows you to interact with Aider through JSON-RPC calls to the specified port.

## Features

- AI pair programming in your terminal
- Works with over 100 programming languages
- Git integration for tracking changes
- Can be used with your preferred IDE
