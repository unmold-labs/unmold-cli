# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

## 0.2.0 - 2026-06-23

### Added

- `module publish` now supports `--access private|public` with `private` as the default.
- New `module make-public` command for changing an existing module version to public.
- New `module make-private` command for changing an existing module version to private.
- `module list` now supports anonymous public-only browsing and optional no-filter search.

### Changed

- `module list` now accepts optional filters, including a no-argument form that lists accessible modules.
- Module list output now preserves the `access` field returned by the registry API.
- CLI auth handling for module listing now falls back to public-only access when no token is available.

## 0.1.2 - 2026-06-19

### Added

- CI-friendly image definition in `Dockerfile-ci` derived from `quay.io/unmold/unmold-cli` with a shell-first entrypoint for CI environments.
- Publishing of the CI-friendly image as `quay.io/unmold/unmold-cli:<tag>-ci` in the Docker publish workflow.
- Automated CLI docs generation with CmdGraph in the docs publish workflow, including HTML docs, `llms.txt`, and `sitemap.xml` outputs.

### Changed

- Docker image publish workflow now builds the CI image from the digest of the freshly built primary image so the `-ci` image reuses the exact runtime contents of the matching release.

### Fixed

- Login command now shows a formal browser success page after OAuth callback, with clear completion messaging before returning users to the terminal.
