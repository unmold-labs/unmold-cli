import { Args, Command, Flags } from "@oclif/core";
import { confirm } from "@inquirer/prompts";

import { publish, IModuleMetadata, parseIdentifier } from "../../utils/module";
import { resolve } from "path";

export default class ModulePublish extends Command {
  static override description = "Publish a new version of a module";

  static override examples = [
    "<%= config.bin %> <%= command.id %> mymodule 1.0.0",
    "<%= config.bin %> <%= command.id %> myorg/mymodule 1.0.0",
    "<%= config.bin %> <%= command.id %> myorg/mymodule/aws 1.0.0 --path ./my-module",
  ];

  static override args = {
    identifier: Args.string({
      name: "identifier",
      description: "Module identifiers (namespsace/name/system)",
      required: true,
    }),
    version: Args.string({
      name: "version",
      description: "Module version",
      required: true,
    }),
  };

  static override flags = {
    path: Flags.string({
      char: "p",
      description: "path to the module directory",
      default: ".",
    }),
    confirm: Flags.boolean({
      char: "y",
      description: "Confirm the publication",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ModulePublish);

    try {
      const moduleId = parseIdentifier(args.identifier);
      const modulePath = resolve(flags.path);

      const metadata: IModuleMetadata = {
        namespace: moduleId.namespace,
        name: moduleId.name,
        system: moduleId.system,
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

      await publish(modulePath, metadata);

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
