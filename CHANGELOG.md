# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

## 0.1.2 - 2026-06-19

### Added

- CI-friendly image definition in `Dockerfile-ci` derived from `quay.io/unmold/unmold-cli` with a shell-first entrypoint for CI environments.
- Publishing of the CI-friendly image as `quay.io/unmold/unmold-cli:<tag>-ci` in the Docker publish workflow.
- Automated CLI docs generation with CmdGraph in the docs publish workflow, including HTML docs, `llms.txt`, and `sitemap.xml` outputs.

### Changed

- Docker image publish workflow now builds the CI image from the digest of the freshly built primary image so the `-ci` image reuses the exact runtime contents of the matching release.

### Fixed

- Login command now shows a formal browser success page after OAuth callback, with clear completion messaging before returning users to the terminal.
