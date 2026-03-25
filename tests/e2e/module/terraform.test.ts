import { runCommand } from "@oclif/test";
import { expect } from "chai";
import { execa } from "execa";

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { v4 as uuid } from "uuid";

import { config } from "../../test-helper";

const namespace = config.testModuleNamespace;

describe("Terraform", () => {
  let tempDir: string;
  let modulePath: string;
  let projectPath: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unmold-test-"));
    modulePath = path.join(tempDir, "test-module");

    // Create a simple module
    fs.mkdirSync(modulePath, { recursive: true });
    fs.writeFileSync(
      path.join(modulePath, "main.tf"),
      'resource "null_resource" "test" {}',
    );
  });

  afterEach(async () => {
    fs.rmSync(tempDir, { recursive: true, force: true });
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
    fs.mkdirSync(projectPath, { recursive: true });
    fs.writeFileSync(
      path.join(projectPath, "main.tf"),
      `module "example" {
        source  = "${config.api.host}/${namespace}/test-mod-${uniqueId}/generic"
        version = "1.0.0"
      }`,
    );

    const { stdout, stderr } = await execa("terraform", ["init", "-no-color"], {
      cwd: projectPath,
      env: {
        [`TF_TOKEN_${config.api.host.replace(/\./g, "_")}`]: config.api.token,
      },
    });

    if (stderr) {
      console.error("Error output:", stderr);
    }

    // expect(stderr).to.be.empty;
    expect(stdout).to.include("Terraform has been successfully initialized!");
  });
});
