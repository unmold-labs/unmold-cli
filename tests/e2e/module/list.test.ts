import { runCommand } from "@oclif/test";
import { expect } from "chai";

describe.skip("list", () => {
  it("should print module versions with the default system name", async () => {
    const { stdout } = await runCommand([
      "module",
      "list",
      "test-ns",
      "test-mod",
    ]);
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
  });

  it("should print module versions with the specified system name", async () => {
    const { stdout } = await runCommand([
      "module",
      "list",
      "test-ns",
      "test-mod",
      "--system",
      "aws",
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
  });
});
