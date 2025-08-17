import { runCommand } from "@oclif/test";
import { expect } from "chai";
import nock from "nock";

import { config } from "../../test-helper";

describe("list", () => {
  it("should print module versions with the default system name", async () => {
    const scope = nock(`https://${config.api.host}`)
      .get("/modules/v1/unmold-test/test-mod/generic/versions")
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
      "unmold-test/test-mod",
    ]);
    expect(JSON.parse(stdout)).to.deep.equal([
      {
        namespace: "unmold-test",
        name: "test-mod",
        system: "generic",
        version: "1.0.0",
      },
      {
        namespace: "unmold-test",
        name: "test-mod",
        system: "generic",
        version: "1.1.0",
      },
    ]);

    scope.done();
  });

  it("should print module versions with the specified system name", async () => {
    const scope = nock(`https://${config.api.host}`)
      .get("/modules/v1/unmold-test/test-mod/aws/versions")
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
      "unmold-test/test-mod/aws",
    ]);
    expect(JSON.parse(stdout)).to.deep.equal([
      {
        namespace: "unmold-test",
        name: "test-mod",
        system: "aws",
        version: "1.0.0",
      },
      {
        namespace: "unmold-test",
        name: "test-mod",
        system: "aws",
        version: "1.1.0",
      },
    ]);

    scope.done();
  });
});
