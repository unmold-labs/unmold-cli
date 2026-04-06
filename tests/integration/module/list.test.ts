import { runCommand } from "@oclif/test";
import { expect } from "chai";
import { describe, it } from "mocha";
import nock from "nock";

import { config } from "../../test-helper";

describe("list", () => {
  it("should list modules of a given namespace", async () => {
    const scope = nock(`https://${config.api.host}`)
      .get("/modules/v1/unmold-test")
      .reply(200, [
        {
          namespace: "unmold-test",
          name: "test-mod",
          system: "generic",
          version: "1.0.0",
        },
      ]);

    const { stdout, stderr } = await runCommand([
      "module",
      "list",
      "unmold-test",
    ]);

    expect(stderr).to.equal("");
    expect(JSON.parse(stdout)).to.deep.equal([
      {
        namespace: "unmold-test",
        name: "test-mod",
        system: "generic",
        version: "1.0.0",
      },
    ]);

    scope.done();
  });

  it("should list module versions with a given module name", async () => {
    const scope = nock(`https://${config.api.host}`)
      .get("/modules/v1/unmold-test/test-mod")
      .reply(200, [
        {
          namespace: "unmold-test",
          name: "test-mod",
          system: "generic",
          version: "1.0.0",
        },
        {
          namespace: "unmold-test",
          name: "test-mod",
          system: "aws",
          version: "1.1.0",
        },
      ]);

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
        system: "aws",
        version: "1.1.0",
      },
    ]);

    scope.done();
  });

  it("should list module versions with a given system name", async () => {
    const scope = nock(`https://${config.api.host}`)
      .get("/modules/v1/unmold-test/test-mod/aws")
      .reply(200, [
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
