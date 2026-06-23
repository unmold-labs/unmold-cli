import { Args, Command, Flags } from "@oclif/core";
import { confirm } from "@inquirer/prompts";

import { getUserProfile } from "../../utils/auth";
import { IModuleMetadata, updateModuleAccess } from "../../utils/module";

export default class ModuleMakePublic extends Command {
  static override description = "Make a published module version public";

  static override examples = [
    "<%= config.bin %> <%= command.id %> mymodule 1.0.0",
    "<%= config.bin %> <%= command.id %> mymodule 1.0.0 --system aws",
    "<%= config.bin %> <%= command.id %> mymodule 1.0.0 --confirm",
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
    confirm: Flags.boolean({
      char: "c",
      description: "Confirm access update without interactive prompt",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ModuleMakePublic);

    try {
      const userProfile = await getUserProfile();
      const metadata: IModuleMetadata & { access: "public" } = {
        namespace: userProfile.name,
        name: args.name,
        version: args.version,
        system: flags.system,
        access: "public",
      };

      if (!flags.confirm) {
        this.log("Updating access for the following module version:");
        this.logJson(metadata);

        const answer = await confirm({ message: "Continue?" });

        if (!answer) {
          return;
        }
      }

      await updateModuleAccess(metadata);

      this.log(
        `✅ Successfully made ${metadata.namespace}/${metadata.name}/${metadata.system}@${metadata.version} public`,
      );
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to make module public: ${error.message}`, {
          exit: 1,
        });
      } else {
        this.error("An unknown error occurred while updating module access", {
          exit: 1,
        });
      }
    }
  }
}
