import { expect } from "chai";
import { execa } from "execa";
import fetch from "node-fetch";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { createServer } from "node:http";

describe("login", () => {
  let tempDir: string;
  let configPath: string;
  let tokenServer: ReturnType<typeof createServer> | undefined;
  let tokenBaseUrl = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "unmold-login-"));
    configPath = path.join(tempDir, "config.json");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    if (tokenServer) {
      tokenServer.close();
      tokenServer = undefined;
    }
  });

  it("stores the token after OAuth login", async () => {
    const serverInfo = await startTokenServer();
    tokenServer = serverInfo.server;
    tokenBaseUrl = serverInfo.baseUrl;

    const child = execa("node", ["bin/dev.js", "login", "--no-browser"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        UNMOLD_CONFIG_PATH: configPath,
        UNMOLD_API_URL: tokenBaseUrl,
      },
    });

    const authorizeUrl = await waitForAuthorizeUrl(child);
    const url = new URL(authorizeUrl);
    const redirectUri = url.searchParams.get("redirect_uri");
    const state = url.searchParams.get("state");

    if (!redirectUri || !state) {
      throw new Error("Missing redirect_uri or state in authorize URL");
    }

    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set("code", "test-code");
    callbackUrl.searchParams.set("state", state);

    const callbackResponse = await fetch(callbackUrl.toString());
    const callbackHtml = await callbackResponse.text();

    expect(callbackResponse.status).to.equal(200);
    expect(callbackHtml).to.include("Authentication complete");
    expect(callbackHtml).to.include("You can close this browser window");

    const { stdout, stderr } = await child;

    expect(stderr).to.equal("");
    expect(stdout).to.include("Login successful");

    const saved = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(saved.token).to.equal("token-123");
  });

  it("asks the user to logout when local auth already exists", async () => {
    await fs.writeFile(
      configPath,
      JSON.stringify({ token: "existing-token" }),
      "utf8",
    );

    const result = await execa(
      "node",
      ["bin/dev.js", "login", "--no-browser"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          UNMOLD_CONFIG_PATH: configPath,
        },
        reject: false,
      },
    );

    expect(result.exitCode).to.equal(1);
    expect(result.stderr).to.include("Run 'unmold logout' to sign out");
  });
});

function waitForAuthorizeUrl(child: execa.ExecaChildProcess) {
  return new Promise<string>((resolve, reject) => {
    if (!child.stdout) {
      reject(new Error("Missing stdout from login command"));
      return;
    }

    let buffer = "";
    const timer = setTimeout(() => {
      reject(new Error("Timed out waiting for authorize URL"));
    }, 5000);

    child.stdout.on("data", (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/Authorize URL:\s*(\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function startTokenServer() {
  let resolveReady: (value: {
    server: ReturnType<typeof createServer>;
    baseUrl: string;
  }) => void = () => undefined;
  const ready = new Promise<{
    server: ReturnType<typeof createServer>;
    baseUrl: string;
  }>((resolve) => {
    resolveReady = resolve;
  });

  const server = createServer((req, res) => {
    if (!req.url || req.method !== "POST") {
      res.statusCode = 404;
      res.end();
      return;
    }

    if (req.url !== "/auth/v1/token") {
      res.statusCode = 404;
      res.end();
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const params = new URLSearchParams(body);
      const isValid =
        params.get("grant_type") === "authorization_code" &&
        params.get("code") === "test-code" &&
        params.get("client_id") === "unmold-cli";

      if (!isValid) {
        res.statusCode = 400;
        res.end("invalid_grant");
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          access_token: "token-123",
          token_type: "bearer",
          expires_in: 0,
        }),
      );
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start token server");
  }

  resolveReady({ server, baseUrl: `http://127.0.0.1:${address.port}` });
  return ready;
}
