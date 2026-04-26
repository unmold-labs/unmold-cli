import { Args, Command, Flags } from '@oclif/core';
import { list } from '../../utils/module';

export default class ModuleList extends Command {
  static override description = 'List available versions of a module';
  
  static override examples = [
    '<%= config.bin %> <%= command.id %> my-namespace my-module',
    '<%= config.bin %> <%= command.id %> my-namespace my-module --system aws',
  ];

  static override args = {
    namespace: Args.string({
      description: 'Namespace of the module',
      required: true,
    }),
    name: Args.string({
      description: 'Name of the module',
      required: true,
    }),
  };

  static override flags = {
    system: Flags.string({
      char: 's',
      description: 'Target system (default: generic)',
      default: 'generic',
    }),
    help: Flags.help({ char: 'h' }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ModuleList);

    try {
      const modules = await list({
        namespace: args.namespace,
        name: args.name,
        system: flags.system,
      });

      // Output the result as JSON
      this.log(JSON.stringify(modules, null, 2));
    } catch (error) {
      this.error(`Failed to list module versions: ${error.message}`, { exit: 1 });
    }
  }
}
