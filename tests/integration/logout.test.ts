import { expect } from "chai";
import { execa } from "execa";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("logout", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unmold-logout-"));
    configPath = path.join(tempDir, "config.json");
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("removes the locally stored token", async () => {
    fs.writeFileSync(
      configPath,
      JSON.stringify({ token: "token-123", savedAt: new Date().toISOString() }),
      "utf8",
    );

    const { stdout, stderr } = await execa("node", ["bin/dev.js", "logout"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        UNMOLD_CONFIG_PATH: configPath,
      },
    });

    expect(stderr).to.equal("");
    expect(stdout).to.include("Logged out. Removed token");
    expect(fs.existsSync(configPath)).to.equal(false);
  });

  it("prints a helpful message when there is no local token", async () => {
    const { stdout, stderr } = await execa("node", ["bin/dev.js", "logout"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        UNMOLD_CONFIG_PATH: configPath,
      },
    });

    expect(stderr).to.equal("");
    expect(stdout).to.include(
      "No local token found. You are already logged out.",
    );
  });
});
