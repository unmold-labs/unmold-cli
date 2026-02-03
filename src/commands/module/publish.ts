import { Args, Command, Flags } from "@oclif/core";
import { confirm } from "@inquirer/prompts";

import { publish, IModuleMetadata } from "../../utils/module";
import { getUserProfile } from "../../utils/auth";
import { resolve } from "path";

export default class ModulePublish extends Command {
  static override description = "Publish a new version of a module";

  static override examples = [
    "<%= config.bin %> <%= command.id %> mymodule 1.0.0",
    "<%= config.bin %> <%= command.id %> myorg/mymodule 1.0.0",
    "<%= config.bin %> <%= command.id %> myorg/mymodule 1.0.0 --system aws",
    "<%= config.bin %> <%= command.id %> myorg/mymodule/aws 1.0.0 --path ./module-dir",
  ];

  static override args = {
    identifiers: Args.string({
      name: "identifiers",
      description: "Module identifiers (namespace/name/system)",
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
    confirm: Flags.boolean({
      char: "c",
      description: "Confirm the publication",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ModulePublish);

    try {
      const modulePath = resolve(flags.path);
      const system = flags.system;

      let { namespace, name } = this.parseIdentifiers(args.identifiers);

      if (!namespace) {
        const userProfile = await getUserProfile();
        namespace = userProfile.name;
      }

      const metadata: IModuleMetadata = {
        namespace,
        name,
        system,
        version: args.version,
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

  private parseIdentifiers(identifiers: string): {
    namespace?: string;
    name: string;
  } {
    const parts = identifiers.split("/");

    if (parts.length === 3) {
      const [namespace, name, system] = parts;
      return { namespace, name };
    } else if (parts.length === 2) {
      const [namespace, name] = parts;
      return { namespace, name };
    } else if (parts.length === 1) {
      const name = parts[0];
      return { name };
    }

    throw new Error(
      `Invalid module identifier format: ${identifiers}. Expected format: [namespace]/name`,
    );
  }
}
