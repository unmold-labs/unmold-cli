// test/test-helper.ts
import { TextEncoder, TextDecoder } from "util";
import fetch, { Response } from "node-fetch";
import { getUserProfile } from "../src/utils/auth";

// Set up global fetch
global.fetch = fetch as any;
global.Response = Response as any;
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Common test hooks
export const mochaHooks = {
  async beforeAll() {
    // Runs once before all tests
  },
  async beforeEach() {
    // Runs before each test
  },
  async afterEach() {
    // Clean up after each test
    const nock = require("nock");
    nock.cleanAll();
  },
};

// Test configuration
export const config = {
  api: {
    host: "api.unmold.dev",
    token: process.env.UNMOLD_API_TOKEN || "test-token",
    uploadSizeLimitMB: 20,
  },
  testModuleNamespace: "unmold-test-unmold-cli-e2e",
};

let resolvedNamespace: string | null = null;

export async function getTestNamespace(): Promise<string> {
  if (resolvedNamespace) {
    return resolvedNamespace;
  }

  const envNamespace = process.env.UNMOLD_TEST_MODULE_NAMESPACE?.trim();
  if (envNamespace) {
    resolvedNamespace = envNamespace;
    return resolvedNamespace;
  }

  try {
    const profile = await getUserProfile();
    resolvedNamespace = profile.name;
    return resolvedNamespace;
  } catch (_error) {
    // Keep compatibility for environments without live auth context.
    resolvedNamespace = config.testModuleNamespace;
    return resolvedNamespace;
  }
}

/**
 * Generates a random semantic version (semver) string.
 * @returns {string} A random semver string (e.g., "1.2.3").
 */
export function randomSemver(): string {
  const major = Math.floor(Math.random() * 10); // Random major version (0-9)
  const minor = Math.floor(Math.random() * 10); // Random minor version (0-9)
  const patch = Math.floor(Math.random() * 10); // Random patch version (0-9)
  return `${major}.${minor}.${patch}`;
}
