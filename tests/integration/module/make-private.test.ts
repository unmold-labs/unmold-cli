import { runCommand } from "@oclif/test";
import { expect } from "chai";
import nock from "nock";

import { config } from "../../test-helper.ts";

describe("make-private", () => {
  beforeEach(() => {
    process.env.UNMOLD_API_TOKEN = "test-token";
  });

  afterEach(() => {
    delete process.env.UNMOLD_API_TOKEN;
  });

  it("should make a module version private", async () => {
    const scope = nock(`https://${config.api.host}`)
      .get("/users/v1/current")
      .reply(200, {
        name: "unmold-test",
        email: "unmold-test@example.com",
      })
      .put("/modules/v1/unmold-test/test-mod/terraform/1.0.0", {
        access: "private",
      })
      .reply(200, { message: "Module updated" });

    const result = await runCommand([
      "module",
      "make-private",
      "test-mod",
      "1.0.0",
      "--system",
      "terraform",
      "--confirm",
    ]);

    expect(result.error).to.equal(undefined);
    expect(result.stderr).to.equal("");

    scope.done();
  });

  it("should default system to generic", async () => {
    const scope = nock(`https://${config.api.host}`)
      .get("/users/v1/current")
      .reply(200, {
        name: "unmold-test",
        email: "unmold-test@example.com",
      })
      .put("/modules/v1/unmold-test/test-mod/generic/1.0.0", {
        access: "private",
      })
      .reply(200, { message: "Module updated" });

    const result = await runCommand([
      "module",
      "make-private",
      "test-mod",
      "1.0.0",
      "--confirm",
    ]);

    expect(result.error).to.equal(undefined);
    expect(result.stderr).to.equal("");

    scope.done();
  });

  it("should show help", async () => {
    const { stdout } = await runCommand(["module", "make-private", "--help"]);

    expect(stdout).to.include("Make a published module version private");
    expect(stdout).to.include("USAGE");
    expect(stdout).to.include("FLAGS");
  });
});
