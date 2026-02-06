import { runCommand } from "@oclif/test";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { randomSemver, config } from "../../test-helper";

const namespace = config.testModuleNamespace;

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

  it("should publish a module with username as namespace", async () => {
    const version = randomSemver();
    const { stdout, stderr } = await runCommand([
      "module",
      "publish",
      "publish-test-default-system",
      version,
      "--confirm",
      "--path",
      modulePath,
    ]);

    expect(stderr).to.be.empty;
    expect(stdout).to.include(
      // "unmold-test" is the username of the test token
      `Successfully published unmold-test/publish-test-default-system/generic@${version}`,
    );
  });

  it("should publish a module with the default system name", async () => {
    const version = randomSemver();
    const { stdout, stderr } = await runCommand([
      "module",
      "publish",
      "publish-test-default-system",
      version,
      "--confirm",
      "--path",
      modulePath,
    ]);

    expect(stderr).to.be.empty;
    expect(stdout).to.include(
      `Successfully published ${namespace}/publish-test-default-system/generic@${version}`,
    );
  });

  it("should publish a module with the specified system name", async () => {
    const version = randomSemver();
    const { stdout, stderr } = await runCommand([
      "module",
      "publish",
      "publish-test-custom-system",
      version,
      "--confirm",
      "--system",
      "custom",
      "--path",
      modulePath,
    ]);

    expect(stderr).to.be.empty;
    expect(stdout).to.include(
      `Successfully published ${namespace}/publish-test-custom-system/custom@${version}`,
    );
  });

  it("should allow overwrite when re-publishing the same version", async () => {
    const version = randomSemver();

    // initial publish
    const first = await runCommand([
      "module",
      "publish",
      "publish-test-overwrite",
      version,
      "--confirm",
      "--path",
      modulePath,
    ]);

    expect(first.stderr).to.be.empty;
    expect(first.stdout).to.include(
      `Successfully published ${namespace}/publish-test-overwrite/generic@${version}`,
    );

    // publish again with --overwrite
    const second = await runCommand([
      "module",
      "publish",
      "publish-test-overwrite",
      version,
      "--confirm",
      "--path",
      modulePath,
      "--overwrite",
    ]);

    expect(second.stderr).to.be.empty;
    expect(second.stdout).to.include(
      `Successfully published ${namespace}/publish-test-overwrite/generic@${version}`,
    );
  });
});
