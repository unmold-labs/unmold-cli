// test/test-helper.ts
import { TextEncoder, TextDecoder } from "util";
import fetch, { Response } from "node-fetch";

// Set up global fetch
global.fetch = fetch as any;
global.Response = Response as any;
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Common test hooks
export const mochaHooks = {
  beforeAll() {
    // Runs once before all tests
  },
  beforeEach() {
    // Runs before each test
  },
  afterEach() {
    // Clean up after each test
    const nock = require("nock");
    nock.cleanAll();
  },
};

// Test configuration
export const config = {
  api: {
    host: "c5e0kl1q11.execute-api.us-east-1.amazonaws.com",
    token: process.env.UNMOLD_API_TOKEN || "test-token",
    uploadSizeLimitMB: 20,
  },
  testModuleNamespace: "unmold-cli-test",
};

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
