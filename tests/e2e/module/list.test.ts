import { runCommand } from "@oclif/test";
import { expect } from "chai";
import { v4 as uuid } from "uuid";
import * as fs from "node:fs/promises";
import * as path from "path";
import * as os from "os";

import { getTestNamespace } from "../../test-helper";

describe("list", () => {
  let tempDir: string;
  let modulePath: string;
  let namespace: string;

  beforeEach(async () => {
    namespace = await getTestNamespace();

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
    // Clean up the temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should list modules with a given namespace", async () => {
    const uniqueId = uuid();
    const moduleName = `list-test-default-system-${uniqueId}`;

    const { stderr: publishError } = await runCommand([
      "module",
      "publish",
      moduleName,
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
    ]);
    // expect(publishError).to.be.empty;

    if (publishError) {
      console.error("Error output:", publishError);
    }

    const { stdout, stderr } = await runCommand(["module", "list", namespace]);

    if (stderr) {
      console.error("Error output:", stderr);
    }

    // expect(stderr).to.be.empty;
    expect(JSON.parse(stdout).length).to.be.greaterThan(0);
  });

  it("should list modules with a given name", async () => {
    const uniqueId = uuid();
    const moduleName = `list-test-default-system-${uniqueId}`;

    const { stderr: publishError } = await runCommand([
      "module",
      "publish",
      moduleName,
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
    ]);
    // expect(publishError).to.be.empty;

    if (publishError) {
      console.error("Error output:", publishError);
    }

    const { stdout, stderr } = await runCommand([
      "module",
      "list",
      `${namespace}/${moduleName}`,
    ]);

    if (stderr) {
      console.error("Error output:", stderr);
    }

    // expect(stderr).to.be.empty;
    expect(JSON.parse(stdout)).to.deep.equal([
      {
        namespace,
        name: moduleName,
        system: "generic",
        version: "1.0.0",
        access: "private",
      },
    ]);
  });

  it("should list modules with a given system name", async () => {
    const uniqueId = uuid();
    const moduleName = `list-test-custom-system-${uniqueId}`;
    const { stderr: publishError } = await runCommand([
      "module",
      "publish",
      moduleName,
      "1.0.0",
      "--system",
      "aws",
      "--confirm",
      "--path",
      modulePath,
    ]);
    // expect(publishError).to.be.empty;

    if (publishError) {
      console.error("Error output:", publishError);
    }

    const { stdout, stderr } = await runCommand([
      "module",
      "list",
      `${namespace}/${moduleName}/aws`,
    ]);

    if (stderr) {
      console.error("Error output:", stderr);
    }

    // expect(stderr).to.be.empty;
    expect(JSON.parse(stdout)).to.deep.equal([
      {
        namespace,
        name: moduleName,
        system: "aws",
        version: "1.0.0",
        access: "private",
      },
    ]);
  });
});
