# Spec: Module Access Controls and Anonymous Module Listing

## Summary

Update the CLI to support module visibility management aligned with recent backend private/public access changes.

This spec introduces:

1. `--access` on `module publish` (default `private`)
2. `module make-public` for existing module versions
3. `module make-private` for existing module versions
4. Anonymous module listing/search behavior in `module list`

## Background

The registry backend now supports access-aware module operations:

- Publish endpoint accepts `access` (`private` or `public`) via query param.
- Module metadata update endpoint supports changing access via `PUT` with body `{ access }`.
- Module listing supports optional authentication and returns only public modules when unauthenticated.

The CLI currently:

- Always requires auth for list operations via `authenticatedRequest`.
- Has no command to change access after publish.
- Does not expose access selection during publish.

## Goals

1. Allow users to choose module access at publish time.
2. Allow users to change access of existing module versions from CLI.
3. Allow module discovery without login (public modules only).
4. Keep existing command ergonomics and output format broadly compatible.

## Non-goals

1. No backend API changes.
2. No namespace override support for access update commands in this iteration.
3. No bulk access changes across all versions in this iteration.

## Command Changes

### 1) `module publish` access flag

Command:

- `unmold module publish <name> <version> [--system <system>] [--path <path>] [--overwrite] [--access private|public]`

Behavior:

- Add `--access` string flag.
- Allowed values: `private`, `public`.
- Default: `private`.
- Include access in confirmation JSON output.
- Pass access to backend as query param:
  - `POST /modules/v1/:namespace/:name/:system/:version?access=<access>[&overwrite=true]`

Error handling:

- Invalid flag values fail fast with a CLI validation error before network request.

### 2) `module make-public`

Command:

- `unmold module make-public <name> <version> [--system <system>] [--confirm]`

Behavior:

- Auth required.
- Resolve namespace from current user profile (same pattern as delete/publish commands).
- Call backend update endpoint:
  - `PUT /modules/v1/:namespace/:name/:system/:version`
  - Body: `{ "access": "public" }`
- Default `--system` to `generic`.
- Interactive confirmation unless `--confirm` is passed.
- Success output should clearly show target module version and new access.

### 3) `module make-private`

Command:

- `unmold module make-private <name> <version> [--system <system>] [--confirm]`

Behavior:

- Same flow as `make-public`, but send `{ "access": "private" }`.

### 4) `module list` anonymous search and public-only fallback

Current command:

- `unmold module list <namespace/name/system>` (required arg)

Updated command:

- `unmold module list [filters]`
- `filters` becomes optional and still supports:
  - `namespace`
  - `namespace/name`
  - `namespace/name/system`
- When omitted, list/search across all accessible modules.

Auth behavior:

- If token is available, send authenticated request and return modules user can access.
- If token is not available, do not fail; send request without auth.
- Unauthenticated responses should naturally contain public modules only (backend enforced).
- When running without a token, print a clear user-facing indicator before JSON output:
  - `No authentication token found. Showing public modules only.`

Request mapping:

- `filters` provided:
  - `GET /modules/v1/<filters>`
- `filters` omitted:
  - `GET /modules/v1`

## Additional Required Updates

### Request utility split for optional auth

Problem:

- `authenticatedRequest()` hard-fails when token is missing.

Update:

- Introduce a request helper that can optionally attach bearer token when available, without throwing if absent.
- Keep strict auth behavior for commands that must require auth (`publish`, `delete`, `make-public`, `make-private`, etc.).
- Use optional-auth request path for `module list`.

Suggested utility shape:

- `request(path, options, { requireAuth: boolean })`
- Or add `optionalAuthenticatedRequest(path, options)` in `src/utils/index.ts`.

### Module type/output alignment

Backend now returns `access` for module list entries. CLI currently strips it.

Update:

- Extend CLI module metadata interface to include `access?: "private" | "public"`.
- Preserve and print access in `module list` JSON output.

Rationale:

- Access visibility is now a first-class module property.
- Useful for users verifying privacy state after publish or access updates.

## UX and Validation Requirements

1. Flag value validation:

- `--access` must accept only `private|public`.

2. Backward compatibility:

- Existing `module publish` and `module list <filters>` usage must continue working.

3. Error messaging:

- For make-public/make-private, retain current command style: `this.error(..., { exit: 1 })` with actionable text.

4. Confirmation flow:

- Mirror existing delete/publish confirmation UX.

5. Anonymous list indicator:

- When list runs without auth, print: `No authentication token found. Showing public modules only.`

## File-Level Implementation Plan

1. Update publish command and utility

- `src/commands/module/publish.ts`
- `src/utils/module.ts`

2. Add new commands

- `src/commands/module/make-public.ts`
- `src/commands/module/make-private.ts`

3. Update list command and request helper usage

- `src/commands/module/list.ts`
- `src/utils/index.ts`
- `src/utils/module.ts`

4. Update docs/help text where command examples are maintained

- `README.md` only if command reference is added here in future; otherwise defer to docs site.

## Test Plan

### Integration tests

1. Publish with access

- `tests/integration/module/publish.test.ts`
- Add cases:
  - `--access public` adds `?access=public`
  - default publish sends `?access=private`
  - invalid `--access` fails before request

2. Make public/private commands

- Add:
  - `tests/integration/module/make-public.test.ts`
  - `tests/integration/module/make-private.test.ts`
- Cover:
  - success path (`PUT` with expected payload)
  - defaults (`system=generic`)
  - confirm and `--confirm` behavior
  - not found/unauthorized API responses

3. List with and without auth

- `tests/integration/module/list.test.ts`
- Add cases:
  - anonymous list (no token) succeeds and calls endpoint without auth header
  - anonymous list prints indicator: `No authentication token found. Showing public modules only.`
  - `module list` without filters calls `/modules/v1`
  - list output includes `access` when present

### Regression checks

1. Existing publish/list/delete integration tests continue to pass.
2. Command help output includes new commands and flags.

## Acceptance Criteria

1. `module publish` supports `--access private|public` and defaults to `private`.
2. `module make-public` updates access to public for a specific module version.
3. `module make-private` updates access to private for a specific module version.
4. `module list` works without authentication and returns public modules only in that mode.
5. `module list` supports optional filters; no-filter calls list-all endpoint.
6. List output includes `access` when returned by API.
7. `module list` prints `No authentication token found. Showing public modules only.` when running anonymously.
8. Integration tests cover all new behaviors.

## Decisions

1. `module make-public` and `module make-private` only support updating one module version in this scope.
2. `module list` must print an explicit user-facing indicator when running anonymously.
3. Do not add a `namespace` flag in this scope; org-owned namespace support is reserved for future org/team features.
