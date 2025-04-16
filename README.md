# README Generator

A CLI tool that generates beautiful README.md files for your projects with a single command.

## Installation

```bash
# Install globally
npm install -g @aditsuru/readme-generator

# Or use with npx (no installation required)
npx @aditsuru/readme-generator
```

## Usage

Run the tool in your project directory:

```bash
# Using the globally installed version
readme-gen

# Or using npx without installation
npx @aditsuru/readme-generator
```

### Command Line Options

```
Options:
  -V, --version                  output the version number
  -n, --name <n>                 project name
  -d, --description <description> short project description
  -u, --username <username>      GitHub username
  -r, --repo <repo>              repository name
  -s, --skip-prompts             skip all prompts and use defaults or provided options
  -o, --output <path>            output path for README file (default: "./README.md")
  -h, --help                     display help for command
```

### Example

```bash
# Generate a README with specific options
npx @aditsuru/readme-generator --name "My Awesome Project" --description "A tool that makes life easier" --username "aditsuru-git" --repo "awesome-tool"

# Generate a README without prompts
npx @aditsuru/readme-generator --skip-prompts
```

## Features

- Interactive prompts for README details
- Customizable templates
- Ready-to-use badges and links
- Markdown formatting

## License

MIT
