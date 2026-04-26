import { Args, Command, Flags } from "@oclif/core";
import { publish, IModuleMetadata } from "../../utils/module";
import * as path from "path";

export default class ModulePublish extends Command {
  static override description = "Publish a new version of a module";

  static override examples = [
    "<%= config.bin %> <%= command.id %> myorg mymodule 1.0.0",
    "<%= config.bin %> <%= command.id %> myorg mymodule 1.0.0 --system terraform --path ./my-module",
  ];

  static override args = {
    namespace: Args.string({
      name: "namespace",
      description: "namespace of the module",
      required: true,
    }),
    name: Args.string({
      name: "name",
      description: "name of the module",
      required: true,
    }),
    version: Args.string({
      name: "version",
      description: "version of the module (must follow semantic versioning)",
      required: true,
    }),
  };

  static override flags = {
    system: Flags.string({
      char: "s",
      description:
        "target system for the module (e.g., terraform, pulumi, etc.)",
      default: "generic",
    }),
    path: Flags.string({
      char: "p",
      description: "path to the module directory",
      default: ".",
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ModulePublish);

    try {
      const modulePath = path.resolve(flags.path);

      const metadata: IModuleMetadata = {
        namespace: args.namespace,
        name: args.name,
        version: args.version,
        system: flags.system,
      };

      this.log(
        `Publishing module ${metadata.namespace}/${metadata.name}@${metadata.version}...`,
      );

      await publish(modulePath, metadata);

      this.log(
        `✅ Successfully published ${metadata.namespace}/${metadata.name}@${metadata.version}`,
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
