import { Args, Command, Flags } from "@oclif/core";
import { confirm } from "@inquirer/prompts";

import { publish, IModuleMetadata } from "../../utils/module";
import { getUserProfile } from "../../utils/auth";
import { resolve } from "path";

export default class ModulePublish extends Command {
  static override description = "Publish a new version of a module";

  static override examples = [
    "<%= config.bin %> <%= command.id %> mymodule 1.0.0",
    "<%= config.bin %> <%= command.id %> mymodule 1.0.0 --path ./module-dir",
    "<%= config.bin %> <%= command.id %> mymodule 1.0.0 --system aws",
    "<%= config.bin %> <%= command.id %> mymodule 1.0.0 --access public",
  ];

  static override args = {
    name: Args.string({
      name: "name",
      description: "Module name (namespace is determined from your user)",
      required: true,
    }),
    version: Args.string({
      name: "version",
      description: "Module version",
      required: true,
    }),
  };

  static override flags = {
    system: Flags.string({
      char: "s",
      description: "Target system for the module",
      default: "generic",
    }),
    path: Flags.string({
      char: "p",
      description: "path to the module directory",
      default: ".",
    }),
    overwrite: Flags.boolean({
      char: "o",
      description: "Overwrite existing module version if present",
      default: false,
    }),
    access: Flags.string({
      char: "a",
      description: "Access level for the module version",
      options: ["private", "public"],
      default: "private",
    }),
    confirm: Flags.boolean({
      char: "c",
      description: "Confirm the publication",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ModulePublish);
    const access = flags.access as string;

    if (access !== "private" && access !== "public") {
      this.error("Invalid access value. Allowed values: private, public", {
        exit: 1,
      });
    }

    try {
      const modulePath = resolve(flags.path);
      const system = flags.system;

      const name = args.name;
      const userProfile = await getUserProfile();
      const namespace = userProfile.name;

      const metadata: IModuleMetadata = {
        namespace,
        name,
        system,
        version: args.version,
        access: access as "private" | "public",
      };

      if (!flags.confirm) {
        this.log(`Publishing the following module:`);
        this.logJson(metadata);

        const answer = await confirm({ message: "Continue?" });

        if (!answer) {
          return;
        }
      }

      await publish(modulePath, metadata, flags.overwrite);

      this.log(
        `✅ Successfully published ${metadata.namespace}/${metadata.name}/${metadata.system}@${metadata.version}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to publish module: ${error.message}`, { exit: 1 });
      } else {
        this.error("An unknown error occurred while publishing the module", {
          exit: 1,
        });
      }
    }
  }
}
