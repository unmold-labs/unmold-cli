import { Command, Flags } from "@oclif/core";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

import { unmold } from "../utils/config";
import { getConfigPath, readStoredToken, saveToken } from "../utils/token";

const DEFAULT_CLIENT_ID = "unmold-cli";
const DEFAULT_TIMEOUT_SECONDS = 300;
const CALLBACK_SUCCESS_PAGE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Authentication Complete</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Geist", "Avenir Next", "Segoe UI", sans-serif;
        background: #f9fafb;
        color: #1f2937;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.95), transparent 42%),
          linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
      }

      main {
        width: min(480px, 100%);
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid #e5e7eb;
        border-radius: 18px;
        box-shadow: 0 24px 60px rgba(17, 24, 39, 0.08);
        padding: 32px;
      }

      h1 {
        margin: 0 0 12px;
        font-size: 1.875rem;
        line-height: 1.1;
      }

      p {
        margin: 0;
        font-size: 1rem;
        line-height: 1.6;
        color: #4b5563;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 18px;
        padding: 8px 12px;
        border-radius: 999px;
        background: #f3f4f6;
        color: #374151;
        font-size: 0.875rem;
        font-weight: 600;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: #4ade80;
      }

      .terminal {
        margin-top: 20px;
        border: 1px solid #1f2937;
        border-radius: 14px;
        background: #111827;
        color: #4ade80;
        font-family: "Geist Mono", "SFMono-Regular", "Menlo", monospace;
        font-size: 0.875rem;
        line-height: 1.6;
        padding: 16px 18px;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="badge"><span class="dot"></span>Unmold CLI</div>
      <h1>Authentication complete</h1>
      <p>You can close this browser window and return to your terminal.</p>
    </main>
    <script>
      window.setTimeout(() => window.close(), 5000);
    </script>
  </body>
</html>`;

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
    const existingToken = await readStoredToken();

    if (existingToken) {
      this.error(
        "You are already authenticated locally. Run 'unmold logout' to sign out before logging in again.",
        { exit: 1 },
      );
    }

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

      await saveToken(accessToken);

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
    throw new Error(
      "Failed to open browser for authentication. Please request a token manually at Unmold registry console.",
    );
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
    res.end(CALLBACK_SUCCESS_PAGE);
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
