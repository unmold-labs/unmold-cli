import { Command } from "@oclif/core";

import { clearStoredToken, getConfigPath } from "../utils/token";

export default class Logout extends Command {
  static override description =
    "Remove locally stored authentication token from your Unmold CLI config";

  static override examples = ["<%= config.bin %> <%= command.id %>"];

  public async run(): Promise<void> {
    try {
      const removed = await clearStoredToken();

      if (removed) {
        this.log(`Logged out. Removed token from ${getConfigPath()}.`);
      } else {
        this.log("No local token found. You are already logged out.");
      }

      if (process.env.UNMOLD_API_TOKEN) {
        this.log(
          "UNMOLD_API_TOKEN is still set in your environment and will continue to be used.",
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Logout failed: ${error.message}`, { exit: 1 });
      }

      this.error("Logout failed: unknown error", { exit: 1 });
    }
  }
}
