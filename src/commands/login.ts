import { Command, Flags } from "@oclif/core";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

import { unmold } from "../utils/config";
import { getConfigPath, saveToken } from "../utils/token";

const DEFAULT_CLIENT_ID = "unmold-cli";
const DEFAULT_TIMEOUT_SECONDS = 300;

export default class Login extends Command {
  static override description =
    "Authenticate with Unmold in your browser and save the API token";

  static override examples = ["<%= config.bin %> <%= command.id %>"];

  static override flags = {
    browser: Flags.boolean({
      description: "Open the browser automatically",
      default: true,
      allowNo: true,
    }),
    timeout: Flags.integer({
      description: "Seconds to wait for authentication",
      default: DEFAULT_TIMEOUT_SECONDS,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Login);

    let server: ReturnType<typeof createServer> | undefined;

    try {
      const state = randomBytes(16).toString("hex");
      const serverInfo = await startAuthServer(state, flags.timeout);
      server = serverInfo.server;

      const authorizeUrl = new URL(`${unmold.api.url}/auth/v1/authorize`);
      authorizeUrl.searchParams.set("client_id", DEFAULT_CLIENT_ID);
      authorizeUrl.searchParams.set("redirect_uri", serverInfo.redirectUri);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("state", state);

      this.log("Authorize URL: " + authorizeUrl.toString());
      this.log("Waiting for authentication to complete...");

      if (flags.browser) {
        openBrowser(authorizeUrl.toString());
      }

      const code = await serverInfo.codePromise;

      const tokenResponse = await fetch(`${unmold.api.url}/auth/v1/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: DEFAULT_CLIENT_ID,
          redirect_uri: serverInfo.redirectUri,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        throw new Error(
          `Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`,
        );
      }

      const tokenPayload = await tokenResponse.json();
      const accessToken = tokenPayload?.access_token;

      if (!accessToken || typeof accessToken !== "string") {
        throw new Error("Token exchange failed: missing access_token");
      }

      saveToken(accessToken);

      this.log(`Login successful. Token saved to ${getConfigPath()}.`);
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Login failed: ${error.message}`, { exit: 1 });
      }
      this.error("Login failed: unknown error", { exit: 1 });
    } finally {
      if (server) {
        server.close();
      }
    }
  }
}

function openBrowser(url: string): void {
  try {
    const platform = process.platform;
    if (platform === "darwin") {
      spawn("open", [url], { stdio: "ignore", detached: true }).unref();
      return;
    }

    if (platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], {
        stdio: "ignore",
        detached: true,
      }).unref();
      return;
    }

    spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
  } catch (_err) {
    // Best-effort only.
  }
}

async function startAuthServer(state: string, timeoutSeconds: number) {
  let resolveCode: (code: string) => void = () => undefined;
  let rejectCode: (error: Error) => void = () => undefined;

  const codePromise = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const server = createServer((req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Missing URL");
      return;
    }

    const requestUrl = new URL(req.url, "http://127.0.0.1");
    if (requestUrl.pathname !== "/callback") {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    const code = requestUrl.searchParams.get("code");
    const requestState = requestUrl.searchParams.get("state");

    if (!code || !requestState || requestState !== state) {
      res.statusCode = 400;
      res.end("Invalid request");
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(
      "<html><body><p>Authentication complete. You can close this window.</p></body></html>",
    );
    resolveCode(code);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start local callback server");
  }

  const redirectUri = `http://127.0.0.1:${address.port}/callback`;
  const timer = setTimeout(
    () => {
      rejectCode(new Error("Timed out waiting for authentication"));
    },
    Math.max(1, timeoutSeconds) * 1000,
  );

  const guardedPromise = codePromise.finally(() => clearTimeout(timer));

  return {
    server,
    redirectUri,
    codePromise: guardedPromise,
  };
}
