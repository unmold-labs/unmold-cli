# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- Added a CI-friendly Docker image definition in `Dockerfile-ci` that derives from the standard `quay.io/unmold/unmold-cli` image and switches to a shell-first entrypoint for CI systems that expect script-based container execution.
- Added publishing of the CI-friendly image as `quay.io/unmold/unmold-cli:<tag>-ci` in the Docker publish workflow.

### Changed

- Updated the Docker image publish workflow to build the CI image from the digest of the freshly built primary image, ensuring the `-ci` image reuses the exact runtime contents of the corresponding release.
