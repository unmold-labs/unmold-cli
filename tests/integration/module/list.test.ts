import { runCommand } from "@oclif/test";
import { expect } from "chai";
import { describe, it } from "mocha";
import nock from "nock";

import { config } from "../../test-helper.ts";

describe("list", () => {
  beforeEach(() => {
    process.env.UNMOLD_API_TOKEN = "test-token";
    delete process.env.UNMOLD_CONFIG_PATH;
  });

  afterEach(() => {
    delete process.env.UNMOLD_API_TOKEN;
    delete process.env.UNMOLD_CONFIG_PATH;
  });

  it("should list modules of a given namespace", async () => {
    const scope = nock(`https://${config.api.host}`)
      .get("/modules/v1/unmold-test")
      .reply(200, [
        {
          namespace: "unmold-test",
          name: "test-mod",
          system: "generic",
          version: "1.0.0",
          access: "public",
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
        access: "public",
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
          access: "private",
        },
        {
          namespace: "unmold-test",
          name: "test-mod",
          system: "aws",
          version: "1.1.0",
          access: "public",
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
        access: "private",
      },
      {
        namespace: "unmold-test",
        name: "test-mod",
        system: "aws",
        version: "1.1.0",
        access: "public",
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
          access: "private",
        },
        {
          namespace: "unmold-test",
          name: "test-mod",
          system: "aws",
          version: "1.1.0",
          access: "public",
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
        access: "private",
      },
      {
        namespace: "unmold-test",
        name: "test-mod",
        system: "aws",
        version: "1.1.0",
        access: "public",
      },
    ]);

    scope.done();
  });

  it("should list modules without filters", async () => {
    const scope = nock(`https://${config.api.host}`)
      .get("/modules/v1")
      .reply(200, [
        {
          namespace: "unmold-test",
          name: "test-mod",
          system: "generic",
          version: "1.0.0",
          access: "public",
        },
      ]);

    const { stdout, stderr } = await runCommand(["module", "list"]);

    expect(stderr).to.equal("");
    expect(JSON.parse(stdout)).to.deep.equal([
      {
        namespace: "unmold-test",
        name: "test-mod",
        system: "generic",
        version: "1.0.0",
        access: "public",
      },
    ]);

    scope.done();
  });

  it("should list public modules anonymously and print indicator", async () => {
    delete process.env.UNMOLD_API_TOKEN;
    process.env.UNMOLD_CONFIG_PATH = "/tmp/unmold-cli-no-token-config.json";

    const scope = nock(`https://${config.api.host}`)
      .get("/modules/v1/unmold-test")
      .reply(function () {
        expect(this.req.headers.authorization).to.equal(undefined);
        return [
          200,
          [
            {
              namespace: "unmold-test",
              name: "public-mod",
              system: "generic",
              version: "1.0.0",
              access: "public",
            },
          ],
        ];
      });

    const { stdout, stderr } = await runCommand([
      "module",
      "list",
      "unmold-test",
    ]);

    expect(stderr).to.equal("");

    const lines = stdout.trim().split("\n");
    expect(lines[0]).to.equal(
      "No authentication token found. Showing public modules only.",
    );

    const modules = JSON.parse(lines.slice(1).join("\n"));
    expect(modules).to.deep.equal([
      {
        namespace: "unmold-test",
        name: "public-mod",
        system: "generic",
        version: "1.0.0",
        access: "public",
      },
    ]);

    scope.done();
  });
});
