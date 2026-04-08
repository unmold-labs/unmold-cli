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

Authenticate with the browser-based login flow:

```bash
unmold login
```

This stores your token in `~/.unmold/config.json` (or `UNMOLD_CONFIG_PATH` if set).

To clear the locally stored token:

```bash
unmold logout
```

You can also use an environment variable token:

```bash
export UNMOLD_API_TOKEN="your_api_token_here"
```

`UNMOLD_API_TOKEN` takes precedence over any locally stored token.

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

Delete a module version

```bash
# delete a version for current user's namespace
unmold module delete-version my-module 1.0.0

# delete a version for a specific system
unmold module delete-version my-module 1.0.0 --system aws

# skip interactive confirmation prompt
unmold module delete-version my-module 1.0.0 --confirm
```

Delete a module

```bash
# delete all versions for current user's namespace and default generic system
unmold module delete my-module

# delete all versions for a specific system
unmold module delete my-module --system aws

# skip interactive confirmation prompt
unmold module delete my-module --confirm
```

For more documentation and examples, see https://docs.unmold.dev.

## Contributing

- Open issues and PRs on the GitHub repository.
- Follow the existing code style. Run tests:

```bash
npm install
npm run test
```

## License

MIT
