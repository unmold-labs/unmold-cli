import { Args, Command } from "@oclif/core";

import { list } from "../../utils/module";

export default class ModuleList extends Command {
  static override description =
    "List available modules and their versions with filters.";

  static override examples = [
    "<%= config.bin %> <%= command.id %> namespace",
    "<%= config.bin %> <%= command.id %> namespace/name",
    "<%= config.bin %> <%= command.id %> namespace/name/system",
  ];

  static override args = {
    filters: Args.string({
      description: "Module filters (namespace/name/system)",
      required: true,
    }),
  };

  static override flags = {};

  public async run(): Promise<void> {
    const { args } = await this.parse(ModuleList);
    const [namespace, name, system] = args.filters.split("/");

    try {
      const modules = await list({
        namespace,
        name,
        system,
      });

      // Output the result as JSON
      this.log(JSON.stringify(modules, null, 2));
    } catch (error) {
      this.error(`Failed to list module versions`, { exit: 1 });
    }
  }
}
