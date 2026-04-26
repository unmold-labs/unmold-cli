import { runCommand } from "@oclif/test";
import { expect } from "chai";
import { v4 as uuid } from "uuid";
import * as fs from "node:fs/promises";
import * as path from "path";
import * as os from "os";

import { config } from "../../test-helper";

const namespace = config.testModuleNamespace;

describe("delete", () => {
  let tempDir: string;
  let modulePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "unmold-test-"));
    modulePath = path.join(tempDir, "test-module");

    await fs.mkdir(modulePath, { recursive: true });
    await fs.writeFile(
      path.join(modulePath, "main.tf"),
      'resource "null_resource" "test" {}',
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should delete all published module versions", async () => {
    const uniqueId = uuid();
    const moduleName = `delete-module-test-${uniqueId}`;

    const firstPublish = await runCommand([
      "module",
      "publish",
      moduleName,
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
    ]);

    if (firstPublish.stderr) {
      throw new Error(
        `Failed to publish first module version for testing: ${firstPublish.stderr}`,
      );
    }

    const secondPublish = await runCommand([
      "module",
      "publish",
      moduleName,
      "1.1.0",
      "--confirm",
      "--path",
      modulePath,
    ]);

    if (secondPublish.stderr) {
      throw new Error(
        `Failed to publish second module version for testing: ${secondPublish.stderr}`,
      );
    }

    const { stdout: deleteStdout, stderr: deleteStderr } = await runCommand([
      "module",
      "delete",
      moduleName,
      "--confirm",
    ]);

    if (deleteStderr) {
      throw new Error(
        `Failed to delete module versions for testing: ${deleteStderr}`,
      );
    }

    expect(deleteStdout).to.include(
      `Successfully deleted 2 versions for ${namespace}/${moduleName}/generic`,
    );

    const { stdout: listStdout, stderr: listStderr } = await runCommand([
      "module",
      "list",
      `${namespace}/${moduleName}/generic`,
    ]);

    if (listStderr) {
      throw new Error(
        `Failed to list module versions for testing: ${listStderr}`,
      );
    }

    expect(JSON.parse(listStdout)).to.deep.equal([]);
  });
});
