import { runCommand } from "@oclif/test";
import { expect } from "chai";
import nock from "nock";

import { config } from "../../test-helper.ts";

describe("delete-version", () => {
  it("should delete a module version successfully", async () => {
    const scope = nock(`https://${config.api.host}`)
      .delete("/modules/v1/unmold-test/test-mod/terraform/1.0.0")
      .reply(200, {
        deleted: [
          {
            namespace: "unmold-test",
            name: "test-mod",
            system: "terraform",
            version: "1.0.0",
          },
        ],
      })
      .get("/users/v1/current")
      .reply(200, {
        name: "unmold-test",
        email: "unmold-test@example.com",
      });

    const { stdout, stderr } = await runCommand([
      "module",
      "delete-version",
      "test-mod",
      "1.0.0",
      "--system",
      "terraform",
      "--confirm",
    ]);

    expect(stderr).to.be.empty;
    expect(stdout).to.include(
      "Successfully deleted unmold-test/test-mod/terraform@1.0.0",
    );
    scope.done();
  });

  it("should use default system when not provided", async () => {
    const scope = nock(`https://${config.api.host}`)
      .delete("/modules/v1/unmold-test/test-mod/generic/1.0.0")
      .reply(200, {
        deleted: [
          {
            namespace: "unmold-test",
            name: "test-mod",
            system: "generic",
            version: "1.0.0",
          },
        ],
      })
      .get("/users/v1/current")
      .reply(200, {
        name: "unmold-test",
        email: "unmold-test@example.com",
      });

    const { stdout, stderr } = await runCommand([
      "module",
      "delete-version",
      "test-mod",
      "1.0.0",
      "--confirm",
    ]);

    expect(stderr).to.be.empty;
    expect(stdout).to.include(
      "Successfully deleted unmold-test/test-mod/generic@1.0.0",
    );
    scope.done();
  });

  it("should show help", async () => {
    const { stdout } = await runCommand(["module", "delete-version", "--help"]);

    expect(stdout).to.include("Delete a published module version");
    expect(stdout).to.include("USAGE");
    expect(stdout).to.include("ARGUMENTS");
    expect(stdout).to.include("FLAGS");
  });
});
