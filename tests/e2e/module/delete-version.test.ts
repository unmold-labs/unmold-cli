import { runCommand } from "@oclif/test";
import { expect } from "chai";
import { v4 as uuid } from "uuid";
import * as fs from "node:fs/promises";
import * as path from "path";
import * as os from "os";

import { getTestNamespace } from "../../test-helper";

describe("delete-version", () => {
  let tempDir: string;
  let modulePath: string;
  let namespace: string;

  beforeEach(async () => {
    namespace = await getTestNamespace();

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

  it("should delete a published module version", async () => {
    const uniqueId = uuid();
    const moduleName = `delete-version-test-${uniqueId}`;

    const { stderr: publishError } = await runCommand([
      "module",
      "publish",
      moduleName,
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
    ]);

    if (publishError) {
      throw new Error(
        `Failed to publish module version for testing: ${publishError}`,
      );
    }

    const { stdout: deleteStdout, stderr: deleteStderr } = await runCommand([
      "module",
      "delete-version",
      moduleName,
      "1.0.0",
      "--confirm",
    ]);

    if (deleteStderr) {
      throw new Error(
        `Failed to delete module version for testing: ${deleteStderr}`,
      );
    }

    expect(deleteStdout).to.include(
      `Successfully deleted ${namespace}/${moduleName}/generic@1.0.0`,
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
