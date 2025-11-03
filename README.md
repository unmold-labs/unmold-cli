# Unmold CLI

Official CLI for interacting with [unmold.dev](https://unmold.dev).

## Installation

### npm

Install as npm global dependency

```bash
npm install -g @unmold/unmold-cli
```

### docker

Run with container without installation

```bash
docker run unmold/unmold-cli version
```

## Authentication

Create an API token in the Unmold Console and export it as an environment variable:

```bash
export UNMOLD_API_TOKEN="your_api_token_here"
```

The CLI reads `UNMOLD_API_TOKEN` for authenticated API requests.

## Quickstart

Publish a module

```bash
# publish a module within current user's username as namespace
unmold module publish my-module 1.0.0

# publish a module within a namespace
unmold module publish my-namespace/my-module 1.0.0

# publish a module within a namespace for a system
unmold module publish my-namespace/my-module/aws 1.0.0

# publish a module with non-semver version, like git commit SHA
unmold module publish my-module 70e21a8fb88d6d5f76f18a1516425037caff2a20
```

List modules and versions

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
