// test/test-helper.ts
import { TextEncoder, TextDecoder } from "util";
import fetch, { Response } from "node-fetch";

// Set up global fetch
global.fetch = fetch as any;
global.Response = Response as any;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Test configuration
export const config = {
  api: {
    url: "https://c5e0kl1q11.execute-api.us-east-1.amazonaws.com",
    uploadSizeLimitMB: 20,
  },
};

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
