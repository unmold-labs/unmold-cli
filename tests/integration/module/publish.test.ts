import { runCommand } from "@oclif/test";
import { expect } from "chai";
import nock from "nock";
import * as crypto from "crypto";
import * as fs from "node:fs/promises";
import * as path from "path";
import * as os from "os";

import { config } from "../../test-helper.ts";

describe("publish", () => {
  let tempDir: string;
  let modulePath: string;

  beforeEach(async () => {
    process.env.UNMOLD_API_TOKEN = "test-token";

    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "unmold-test-"));
    modulePath = path.join(tempDir, "test-module");

    // Create a simple module structure
    await fs.mkdir(modulePath, { recursive: true });
    await fs.writeFile(
      path.join(modulePath, "main.tf"),
      'resource "null_resource" "test" {}',
    );
  });

  afterEach(async () => {
    delete process.env.UNMOLD_API_TOKEN;

    // Clean up the temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should publish a module successfully", async () => {
    // Mock the API response
    const scope = nock(`https://${config.api.host}`)
      .post("/modules/v1/unmold-test/test-mod/terraform/1.0.0")
      .query({ access: "private" })
      .reply(200, { success: true })
      .get("/users/v1/current")
      .reply(200, {
        name: "unmold-test",
        email: "unmold-test@example.com",
      });

    const result = await runCommand([
      "module",
      "publish",
      "test-mod",
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
      "--system",
      "terraform",
    ]);

    expect(result.error).to.equal(undefined);
    expect(result.stderr).to.be.empty;
    scope.done();
  });

  it("should use default system when not provided", async () => {
    const scope = nock(`https://${config.api.host}`)
      .post("/modules/v1/unmold-test/test-mod/generic/1.0.0")
      .query({ access: "private" })
      .reply(200, { success: true })
      .get("/users/v1/current")
      .reply(200, {
        name: "unmold-test",
        email: "unmold-test@example.com",
      });

    const result = await runCommand([
      "module",
      "publish",
      "test-mod",
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
    ]);

    expect(result.error).to.equal(undefined);
    expect(result.stderr).to.be.empty;
    scope.done();
  });

  it("should use username as namespace when not provided", async () => {
    const scope = nock(`https://${config.api.host}`)
      .post("/modules/v1/unmold-test/test-mod/generic/1.0.0")
      .query({ access: "private" })
      .reply(200, { success: true })
      .get("/users/v1/current")
      .reply(200, {
        name: "unmold-test",
        email: "unmold-test@example.com",
      });

    const result = await runCommand([
      "module",
      "publish",
      "test-mod",
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
    ]);

    expect(result.error).to.equal(undefined);
    expect(result.stderr).to.be.empty;

    scope.done();
  });

  it("should fail when module is too large", async () => {
    const scope = nock(`https://${config.api.host}`)
      .get("/users/v1/current")
      .reply(200, {
        name: "unmold-test",
        email: "unmold-test@example.com",
      });

    const oversizedFilePath = path.join(modulePath, "large.bin");
    // Use random bytes so the zip remains >20MB even after compression.
    const oversizedBuffer = crypto.randomBytes(21 * 1024 * 1024);
    await fs.writeFile(oversizedFilePath, oversizedBuffer);

    const result = await runCommand([
      "module",
      "publish",
      "test-mod",
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
    ]);

    expect(result.error).to.not.equal(undefined);
    expect(result.stderr).to.include("exceeds the maximum allowed size");
    scope.done();
  });

  it("should publish with overwrite flag", async () => {
    const scope = nock(`https://${config.api.host}`)
      .post("/modules/v1/unmold-test/test-mod/terraform/1.0.0")
      .query({ access: "private", overwrite: "true" })
      .reply(200, { success: true })
      .get("/users/v1/current")
      .reply(200, {
        name: "unmold-test",
        email: "unmold-test@example.com",
      });

    const result = await runCommand([
      "module",
      "publish",
      "test-mod",
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
      "--system",
      "terraform",
      "--overwrite",
    ]);

    expect(result.error).to.equal(undefined);
    expect(result.stderr).to.be.empty;
    scope.done();
  });

  it("should publish with public access", async () => {
    const scope = nock(`https://${config.api.host}`)
      .post("/modules/v1/unmold-test/test-mod/terraform/1.0.0")
      .query({ access: "public" })
      .reply(200, { success: true })
      .get("/users/v1/current")
      .reply(200, {
        name: "unmold-test",
        email: "unmold-test@example.com",
      });

    const result = await runCommand([
      "module",
      "publish",
      "test-mod",
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
      "--system",
      "terraform",
      "--access",
      "public",
    ]);

    expect(result.error).to.equal(undefined);
    expect(result.stderr).to.be.empty;
    scope.done();
  });

  it("should fail for invalid access value", async () => {
    const result = await runCommand([
      "module",
      "publish",
      "test-mod",
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
      "--access",
      "internal",
    ]);

    expect(result.error).to.not.equal(undefined);
    expect(String(result.error?.message || "")).to.include(
      "Expected --access=internal to be one of: private, public",
    );
  });

  it("should show help when no arguments are provided", async () => {
    const { stdout } = await runCommand(["module", "publish", "--help"]);
    expect(stdout).to.include("Publish a new version of a module");
    expect(stdout).to.include("USAGE");
    expect(stdout).to.include("ARGUMENTS");
    expect(stdout).to.include("FLAGS");
  });

  it("should fail when module directory does not exist", async () => {
    const nonExistentPath = path.join(tempDir, "nonexistent");

    const result = await runCommand([
      "module",
      "publish",
      "unmold-test/test-mod",
      "1.0.0",
      "--confirm",
      "--path",
      nonExistentPath,
    ]);

    expect(result.error).to.not.equal(undefined);
  });

  it("should fail when module name is not url-safe", async () => {
    const result = await runCommand([
      "module",
      "publish",
      "unmold-test/test-mo?!@#d",
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
    ]);

    expect(result.error).to.not.equal(undefined);
  });
});
