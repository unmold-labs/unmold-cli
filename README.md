# Unmold CLI

Official CLI for interacting with [unmold.dev](https://unmold.dev).

## Installation

### npm

```bash
npm install -g @unmold/unmold-cli
```

## Authentication

Create an API token in the Unmold Console and export it as an environment variable:

```bash
export UNMOLD_API_TOKEN="your_api_token_here"
```

The CLI reads `UNMOLD_API_TOKEN` for authenticated API requests.

## Quickstart

Publish a module (assumes current dir has module files or use `--path`):

```bash
unmold module publish <name> <version>

# example
unmold module publish my-module 1.0.0
```

List modules for a namespace:

```bash
# list modules within a namespace
unmold module list my-namespace

# list versions for a module
unmold module list my-namespace/my-module

# list versions for a module built for a given system
unmold module list my-namespace/my-module/aws
```

For more documentation and examples, see https://unmold.dev.

## Contributing

- Open issues and PRs on the GitHub repository.
- Follow the existing code style. Run tests:

```bash
npm install
npm run test
```

## License

MIT
