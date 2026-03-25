import { runCommand } from "@oclif/test";
import { expect } from "chai";
import { execa } from "execa";

import * as fs from "node:fs/promises";
import * as path from "path";
import * as os from "os";
import { v4 as uuid } from "uuid";

import { config } from "../../test-helper";

const namespace = config.testModuleNamespace;

describe("Opentofu", () => {
  let tempDir: string;
  let modulePath: string;
  let projectPath: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "unmold-test-"));
    modulePath = path.join(tempDir, "test-module");

    // Create a simple module
    await fs.mkdir(modulePath, { recursive: true });
    await fs.writeFile(
      path.join(modulePath, "main.tf"),
      'resource "null_resource" "test" {}',
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should initialize with a published module", async () => {
    const uniqueId = uuid();
    const { stderr: publishError } = await runCommand([
      "module",
      "publish",
      `test-mod-${uniqueId}`,
      "1.0.0",
      "--confirm",
      "--path",
      modulePath,
    ]);
    // expect(publishError).to.be.empty;

    if (publishError) {
      console.error("Error output:", publishError);
    }

    projectPath = path.join(tempDir, "test-project");

    // Create a simple project
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(
      path.join(projectPath, "main.tf"),
      `module "example" {
        source  = "${config.api.host}/${namespace}/test-mod-${uniqueId}/generic"
        version = "1.0.0"
      }`,
    );

    const { stdout, stderr } = await execa("tofu", ["init", "-no-color"], {
      cwd: projectPath,
      env: {
        [`TF_TOKEN_${config.api.host.replace(/\./g, "_")}`]: config.api.token,
      },
    });

    if (stderr) {
      console.error("Error output:", stderr);
    }

    // expect(stderr).to.be.empty;
    expect(stdout).to.include("OpenTofu has been successfully initialized!");
  });
});
