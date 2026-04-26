import { Command } from "@oclif/core";

export default class ModuleTopic extends Command {
  static summary = "Publish and manage modules";
  static description =
    "Commands to publish, list, and delete module versions in the Unmold registry";

  // Show help when someone runs `unmold module`
  public async run(): Promise<void> {}
}
