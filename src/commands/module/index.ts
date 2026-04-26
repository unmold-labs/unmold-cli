import { Command } from "@oclif/core";

export default class ModuleTopic extends Command {
  static summary = "Publish and manage modules";
  static description =
    "Commands to publish, list, delete one version (delete-version), or delete all versions for a module (delete) in the Unmold registry";

  // Show help when someone runs `unmold module`
  public async run(): Promise<void> {}
}
