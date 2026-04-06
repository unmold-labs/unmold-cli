import { Args, Command, Flags } from "@oclif/core";
import { confirm } from "@inquirer/prompts";

import { getUserProfile } from "../../utils/auth";
import { deleteVersion, IModuleMetadata } from "../../utils/module";

export default class ModuleDeleteVersion extends Command {
  static override description = "Delete a published module version";

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
      description: "Confirm deletion without interactive prompt",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ModuleDeleteVersion);

    try {
      const userProfile = await getUserProfile();
      const metadata: IModuleMetadata = {
        namespace: userProfile.name,
        name: args.name,
        system: flags.system,
        version: args.version,
      };

      if (!flags.confirm) {
        this.log(`Deleting the following module version:`);
        this.logJson(metadata);

        const answer = await confirm({ message: "Continue?" });

        if (!answer) {
          return;
        }
      }

      const result = await deleteVersion(metadata);
      const deletedCount = Array.isArray(result.deleted)
        ? result.deleted.length
        : 0;

      if (deletedCount === 0) {
        this.log(
          `No module versions were deleted for ${metadata.namespace}/${metadata.name}/${metadata.system}@${metadata.version}`,
        );
        return;
      }

      this.log(
        `✅ Successfully deleted ${metadata.namespace}/${metadata.name}/${metadata.system}@${metadata.version}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to delete module version: ${error.message}`, {
          exit: 1,
        });
      } else {
        this.error(
          "An unknown error occurred while deleting the module version",
          {
            exit: 1,
          },
        );
      }
    }
  }
}
