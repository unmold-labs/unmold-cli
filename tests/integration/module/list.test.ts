import { runCommand } from "@oclif/test";
import { expect } from "chai";
import nock from "nock";

import { config } from "../../test-helper";

describe("list", () => {
  it("should print module versions with the default system name", async () => {
    const scope = nock(config.api.url)
      .get("/modules/v1/test-ns/test-mod/generic/versions")
      .reply(200, {
        modules: [
          {
            versions: [{ version: "1.0.0" }, { version: "1.1.0" }],
          },
        ],
      });

    const { stdout } = await runCommand(["module", "list", "test-ns/test-mod"]);
    expect(JSON.parse(stdout)).to.deep.equal([
      {
        namespace: "test-ns",
        name: "test-mod",
        system: "generic",
        version: "1.0.0",
      },
      {
        namespace: "test-ns",
        name: "test-mod",
        system: "generic",
        version: "1.1.0",
      },
    ]);

    scope.done();
  });

  it("should print module versions with the specified system name", async () => {
    const scope = nock(config.api.url)
      .get("/modules/v1/test-ns/test-mod/aws/versions")
      .reply(200, {
        modules: [
          {
            versions: [{ version: "1.0.0" }, { version: "1.1.0" }],
          },
        ],
      });

    const { stdout } = await runCommand([
      "module",
      "list",
      "test-ns/test-mod/aws",
    ]);
    expect(JSON.parse(stdout)).to.deep.equal([
      {
        namespace: "test-ns",
        name: "test-mod",
        system: "aws",
        version: "1.0.0",
      },
      {
        namespace: "test-ns",
        name: "test-mod",
        system: "aws",
        version: "1.1.0",
      },
    ]);

    scope.done();
  });
});
