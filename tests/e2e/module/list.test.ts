import { runCommand } from "@oclif/test";
import { expect } from "chai";
import { v4 as uuid } from "uuid";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

import { config } from "../../test-helper";

const namespace = config.testModuleNamespace;

describe("list", () => {
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

  it("should print module versions with the default system name", async () => {
    const uniqueId = uuid();
    const moduleName = `list-test-default-system-${uniqueId}`;

    const { stderr: publishError } = await runCommand([
      "module",
      "publish",
      `${namespace}/${moduleName}`,
      "1.0.0",
      "-y",
      "--path",
      modulePath,
    ]);
    expect(publishError).to.be.empty;

    const { stdout, stderr } = await runCommand([
      "module",
      "list",
      `${namespace}/${moduleName}`,
    ]);

    expect(stderr).to.be.empty;
    expect(JSON.parse(stdout)).to.deep.equal([
      {
        namespace,
        name: moduleName,
        system: "generic",
        version: "1.0.0",
      },
    ]);
  });

  it("should print module versions with the specified system name", async () => {
    const uniqueId = uuid();
    const moduleName = `list-test-custom-system-${uniqueId}`;
    const { stderr: publishError } = await runCommand([
      "module",
      "publish",
      `${namespace}/${moduleName}/aws`,
      "1.0.0",
      "-y",
      "--path",
      modulePath,
    ]);
    expect(publishError).to.be.empty;

    const { stdout } = await runCommand([
      "module",
      "list",
      `${namespace}/${moduleName}/aws`,
    ]);
    expect(JSON.parse(stdout)).to.deep.equal([
      {
        namespace,
        name: moduleName,
        system: "aws",
        version: "1.0.0",
      },
    ]);
  });
});
