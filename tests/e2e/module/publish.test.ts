import { runCommand } from "@oclif/test";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { randomSemver } from "../../test-helper";

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

  it("should publish a module with the default system name", async () => {
    const version = randomSemver();
    const { stdout, stderr } = await runCommand([
      "module",
      "publish",
      "unmold-test/test-mod",
      version,
      "-y",
      "--path",
      modulePath,
    ]);

    expect(stderr).to.be.empty;
    expect(stdout).to.include(
      `Successfully published unmold-test/test-mod/generic@${version}`,
    );
  });

  it("should publish a module with the specified system name", async () => {
    const version = randomSemver();
    const { stdout, stderr } = await runCommand([
      "module",
      "publish",
      "unmold-test/test-mod/test-system",
      version,
      "-y",
      "--path",
      modulePath,
    ]);

    expect(stderr).to.be.empty;
    expect(stdout).to.include(
      `Successfully published unmold-test/test-mod/test-system@${version}`,
    );
  });
});
