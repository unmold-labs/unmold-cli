import { runCommand } from "@oclif/test";
import { expect } from "chai";
import nock from "nock";

import { config } from "../../test-helper";

describe("delete", () => {
  it("should delete all module versions successfully", async () => {
    const scope = nock(`https://${config.api.host}`)
      .get("/users/v1/current")
      .reply(200, {
        name: "unmold-test",
        email: "unmold-test@example.com",
      })
      .delete("/modules/v1/unmold-test/test-mod/terraform")
      .reply(200, {
        deleted: [
          {
            namespace: "unmold-test",
            name: "test-mod",
            system: "terraform",
            version: "1.0.0",
          },
          {
            namespace: "unmold-test",
            name: "test-mod",
            system: "terraform",
            version: "1.1.0",
          },
        ],
      });

    const { stdout, stderr } = await runCommand([
      "module",
      "delete",
      "test-mod",
      "--system",
      "terraform",
      "--confirm",
    ]);

    expect(stderr).to.be.empty;
    expect(stdout).to.include(
      "Successfully deleted 2 versions for unmold-test/test-mod/terraform",
    );
    scope.done();
  });

  it("should use default system when not provided", async () => {
    const scope = nock(`https://${config.api.host}`)
      .get("/users/v1/current")
      .reply(200, {
        name: "unmold-test",
        email: "unmold-test@example.com",
      })
      .delete("/modules/v1/unmold-test/test-mod/generic")
      .reply(200, {
        deleted: [
          {
            namespace: "unmold-test",
            name: "test-mod",
            system: "generic",
            version: "1.0.0",
          },
        ],
      });

    const { stdout, stderr } = await runCommand([
      "module",
      "delete",
      "test-mod",
      "--confirm",
    ]);

    expect(stderr).to.be.empty;
    expect(stdout).to.include(
      "Successfully deleted 1 version for unmold-test/test-mod/generic",
    );
    scope.done();
  });

  it("should show help", async () => {
    const { stdout } = await runCommand(["module", "delete", "--help"]);

    expect(stdout).to.include(
      "Delete all published versions of a module for a target system",
    );
    expect(stdout).to.include("USAGE");
    expect(stdout).to.include("ARGUMENTS");
    expect(stdout).to.include("FLAGS");
  });
});
