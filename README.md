# Unmold CLI

Open-source command line interface for publishing and managing OpenTofu modules on [unmold.dev](https://unmold.dev).

Detailed product and command documentation is available at [docs.unmold.dev](https://docs.unmold.dev).

## Install

### npm

```bash
npm install -g @unmold/cli
```

### Docker

```bash
docker run --rm quay.io/unmold/unmold-cli:latest version
```

## Contributing

Contributions are welcome.

### Local setup

```bash
npm install
npm run build
```

### Tests

```bash
npm run test:integration
```

### Local CLI development run

```bash
npm run unmold -- --help
```

Please open issues and pull requests in this repository. Keep changes focused and include tests when behavior changes.

## Documentation

- Product and user docs: [docs.unmold.dev](https://docs.unmold.dev)
- Website: [unmold.dev](https://unmold.dev)

## License

MIT (see [LICENSE](LICENSE)).
