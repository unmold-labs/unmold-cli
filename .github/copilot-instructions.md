# Copilot instructions — Unmold CLI

Purpose: help AI coding agents be immediately productive in this repository.

- Big picture: this is a Node + TypeScript CLI built with `oclif`. CLI commands live under `src/commands`, share helpers in `src/utils`, and are packaged via the `bin/` launch scripts. The project includes integration and e2e tests under `tests/` that exercise the CLI end-to-end using `@oclif/test` run helpers and `nock` for HTTP mocking.

- Key files and examples to inspect:
  - Command pattern: [src/commands/module/publish.ts](src/commands/module/publish.ts#L1-L200) — shows `Command` subclass, `args`, `flags`, `this.parse()`, and `this.error()` usage.
  - HTTP + business logic: [src/utils/module.ts](src/utils/module.ts#L1-L200) — `publish()` and `list()` implementations, archiving with `archiver`, size checks, and `isValidVersion()` validation.
  - Config + auth: [src/utils/config.ts](src/utils/config.ts#L1-L200) and [src/utils/auth.ts](src/utils/auth.ts#L1-L200) — environment-driven config and `UNMOLD_API_TOKEN` usage. Use `UNMOLD_API_URL` to override the API base URL for tests or custom environments.
    - Auth storage: [src/utils/token.ts](src/utils/token.ts#L1-L200) — reads/writes the saved CLI token (supports `UNMOLD_CONFIG_PATH`).
    - Login flow: [src/commands/login.ts](src/commands/login.ts#L1-L200) — browser-based OAuth, exchanges code at `/auth/v1/token`, saves token locally.
    - Tokens are stored at `~/.unmold/config.json` by default. Set `UNMOLD_CONFIG_PATH` to override for tests or custom locations. `UNMOLD_API_TOKEN` always overrides the stored token.
  - CLI entrypoints: `bin/run.js` and `bin/dev.js` — how the packaged binary is wired.
  - Tests: [tests/integration/module/publish.test.ts](tests/integration/module/publish.test.ts#L1-L200) — shows test patterns: temporary dirs (`fs.mkdtempSync`), `nock` for API responses, and `runCommand` to invoke the CLI.
  - Project manifest: [package.json](package.json#L1-L200) — scripts: `build`, `test:integration`, `test:e2e`, `pack:macos`, `pack:win`.

- Build / test workflows (use these exact scripts):
  - Install dependencies: `npm install`
  - Build TypeScript: `npm run build` (runs `tsc`)
  - Integration tests: `npm run test:integration` (this links the package and runs mocha via `dotenvx`)
  - E2E tests: `npm run test:e2e`
  - Local CLI dev run: `npm run unmold` (runs `node ./bin/dev.js`)

- Project-specific conventions and patterns:
  - Use `oclif` style commands: export a default `class extends Command`, declare `static args`, `static flags`, and call `this.parse()` early.
  - Use `this.log()` for stdout and `this.error(message, { exit: code })` for fatal errors (preserves oclif behavior seen in `publish.ts`).
  - Network requests should go through shared helpers (`authenticatedRequest` / `src/utils/index.ts`) so auth header and base host are consistent.
    - Authenticated requests should rely on `unmold login` (saved token) or `UNMOLD_API_TOKEN` to populate `Authorization: Bearer`.
  - Validation: versions are expected to be URL-safe (see `isValidVersion()` in `src/utils/module.ts`). Use that helper logic instead of duplicating checks.
  - For file uploads: the code zips a directory with `archiver` and enforces `unmold.api.uploadSizeLimitMB` from config—respect that when adding features that change payload size.

- Testing patterns to mirror in new tests:
  - Use `fs.mkdtempSync` + created temporary module dirs for integration tests.
  - Use `nock` to stub API endpoints. Tests reference `config.api.host` from `tests/test-helper.ts` — reuse that helper.
  - Use `runCommand([...])` from `@oclif/test` to execute CLI commands and capture stdout/stderr.

- Packaging / CI notes:
  - Packaging uses `oclif pack` via `npm run pack:macos` and `npm run pack:win`.
  - Hooks: `pre-push` runs `npm run test:integration` (see `simple-git-hooks` entry in `package.json`). Avoid introducing slow integration tests that would block pushes.

- Editing guidelines for maintainers (what Copilot should do):
  - Keep changes small and local to the relevant command and util files.
  - Follow existing error handling: bubble errors to `this.error()` in commands and rethrow (or console.error then rethrow) in util functions, matching current style.
  - When adding network endpoints, update and reuse `authenticatedRequest` and add tests that mock the same endpoints using `nock` in `tests/integration`.
  - Avoid changing the `tmp/` vendor layout or the `unmold/` subtree — these contain prebuilt artifacts and packaging outputs.
  - Prefer using asynchronous functions and `await` over promise chains for readability, matching the existing code style.

- Helpful implementation snippets (copy/paste friendly):
  - Command skeleton:
    ```ts
    export default class MyCmd extends Command {
      static args = {
        /* ... */
      };
      static flags = {
        /* ... */
      };
      public async run() {
        const { args, flags } = await this.parse(MyCmd);
        try {
          // business logic
        } catch (err) {
          this.error(String(err), { exit: 1 });
        }
      }
    }
    ```

- If anything in these instructions is unclear or you want more examples from a specific area (tests, packaging, or a particular command), tell me which part and I will expand or adjust this file.
