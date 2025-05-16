# Python Project with Aider

This project uses [Aider](https://github.com/Aider-AI/aider), an AI pair programming tool that helps you code in your terminal.

## Getting Started

### Installation

1. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. This will install Aider directly from the GitHub repository.

### Using Aider

You can start using Aider with your preferred LLM:

```bash
# For DeepSeek
aider --model deepseek --api-key deepseek=<your-key-here>

# For Claude 3.7 Sonnet
aider --model sonnet --api-key anthropic=<your-key-here>

# For OpenAI o3-mini
aider --model o3-mini --api-key openai=<your-key-here>
```

Replace `<your-key-here>` with your actual API key.

### Working with Your Code

1. Navigate to your project directory:
   ```bash
   cd path/to/your/project
   ```

2. Start Aider:
   ```bash
   aider
   ```

3. Ask Aider to help you with your code by typing your requests in the terminal.

### Using the JSON-RPC Interface

You can also use the JSON-RPC interface to interact with Aider programmatically:

```bash
# Start the JSON-RPC server
python jrpc_oo_aider.py --port 9000 --aider-args "--model deepseek --api-key deepseek=<your-key-here>"
```

Options:
- `--port`: Specify the port for the JSON-RPC server (default: 9000)
- `--debug`: Enable debug mode
- `--aider-args`: Pass arguments to Aider (space separated)

This allows you to interact with Aider through JSON-RPC calls to the specified port.

## Features

- AI pair programming in your terminal
- Works with over 100 programming languages
- Git integration for tracking changes
- Can be used with your preferred IDE
