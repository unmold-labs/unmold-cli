import { Args, Command } from "@oclif/core";

import { list, parseIdentifier } from "../../utils/module";

export default class ModuleList extends Command {
  static override description = "List available versions of a module";

  static override examples = [
    "<%= config.bin %> <%= command.id %> my-namespace/my-module",
    "<%= config.bin %> <%= command.id %> my-namespace/my-module/aws",
  ];

  static override args = {
    identifier: Args.string({
      description: "Module identifier components (namespace/name/system)",
      required: true,
    }),
  };

  static override flags = {};

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ModuleList);
    const moduleId = parseIdentifier(args.identifier);

    try {
      const modules = await list({
        namespace: moduleId.namespace,
        name: moduleId.name,
        system: moduleId.system,
      });

      // Output the result as JSON
      this.log(JSON.stringify(modules, null, 2));
    } catch (error) {
      this.error(`Failed to list module versions`, { exit: 1 });
    }
  }
}
