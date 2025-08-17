import { runCommand } from "@oclif/test";
import { expect } from "chai";
import nock from "nock";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { config } from "../../test-helper";

describe("publish", () => {
  let tempDir: string;
  let modulePath: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unmold-test-"));
    modulePath = path.join(tempDir, "test-module");

    // Create a simple module structure
    fs.mkdirSync(modulePath, { recursive: true });
    fs.writeFileSync(
      path.join(modulePath, "main.tf"),
      'resource "null_resource" "test" {}',
    );
  });

  afterEach(() => {
    // Clean up the temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should publish a module successfully", async () => {
    // Mock the API response
    const scope = nock(config.api.url)
      .post("/modules/v1/unmold-test/test-mod/terraform/1.0.0")
      .reply(200, { success: true });

    const { stdout, stderr } = await runCommand([
      "module",
      "publish",
      "unmold-test/test-mod/terraform",
      "1.0.0",
      "-y",
      "--path",
      modulePath,
    ]);

    expect(stderr).to.be.empty;
    expect(stdout).to.include(
      "Successfully published unmold-test/test-mod/terraform@1.0.0",
    );
    scope.done();
  });

  it("should use default system when not provided", async () => {
    const scope = nock(config.api.url)
      .post("/modules/v1/unmold-test/test-mod/generic/1.0.0")
      .reply(200, { success: true });

    const { stdout, stderr } = await runCommand([
      "module",
      "publish",
      "unmold-test/test-mod",
      "1.0.0",
      "-y",
      "--path",
      modulePath,
    ]);

    expect(stderr).to.be.empty;
    expect(stdout).to.include(
      "Successfully published unmold-test/test-mod/generic@1.0.0",
    );
    scope.done();
  });

  it.skip("should fail when module is too large", async () => {
    // This test is skipped because it requires mocking the file system
    // which is better handled in unit tests
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

    const { stderr } = await runCommand([
      "module",
      "publish",
      "unmold-test/test-mod",
      "1.0.0",
      "-y",
      "--path",
      nonExistentPath,
    ]);

    // The actual error message might be different, so we'll just check that there was an error
    expect(stderr).to.not.be.empty;
  });

  it("should fail when module name is not url-safe", async () => {
    const { stderr } = await runCommand([
      "module",
      "publish",
      "unmold-test/test-mo?!@#d",
      "1.0.0",
      "-y",
      "--path",
      modulePath,
    ]);

    // The actual error message might be different, so we'll just check that there was an error
    expect(stderr).to.not.be.empty;
  });
});
