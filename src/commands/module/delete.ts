import { Args, Command, Flags } from "@oclif/core";
import { confirm } from "@inquirer/prompts";

import { getUserProfile } from "../../utils/auth";
import { deleteModule, IModuleDeleteTarget } from "../../utils/module";

export default class ModuleDelete extends Command {
  static override description =
    "Delete all published versions of a module for a target system";

  static override examples = [
    "<%= config.bin %> <%= command.id %> mymodule",
    "<%= config.bin %> <%= command.id %> mymodule --system aws",
    "<%= config.bin %> <%= command.id %> mymodule --confirm",
  ];

  static override args = {
    name: Args.string({
      name: "name",
      description: "Module name (namespace is determined from your user)",
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
    const { args, flags } = await this.parse(ModuleDelete);

    try {
      const userProfile = await getUserProfile();
      const target: IModuleDeleteTarget = {
        namespace: userProfile.name,
        name: args.name,
        system: flags.system,
      };

      if (!flags.confirm) {
        this.log(`Deleting all versions for module:`);
        this.logJson(target);

        const answer = await confirm({ message: "Continue?" });

        if (!answer) {
          return;
        }
      }

      const result = await deleteModule(target);
      const deletedCount = Array.isArray(result.deleted)
        ? result.deleted.length
        : 0;

      if (deletedCount === 0) {
        this.log(
          `No module versions were deleted for ${target.namespace}/${target.name}/${target.system}`,
        );
        return;
      }

      const suffix = deletedCount === 1 ? "" : "s";
      this.log(
        `✅ Successfully deleted ${deletedCount} version${suffix} for ${target.namespace}/${target.name}/${target.system}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to delete module: ${error.message}`, {
          exit: 1,
        });
      } else {
        this.error("An unknown error occurred while deleting the module", {
          exit: 1,
        });
      }
    }
  }
}
