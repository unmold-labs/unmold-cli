import { unmold } from "../utils/config";

const { api } = unmold;

export interface IModuleMetadata {
  /**
   * The namespace under which the package is categorized.
   */
  namespace: string;
  /**
   * The name of the module.
   */
  name: string;
  /**
   * The version of the module.
   */
  version: string;
  /**
   * The target system for which the module is intended.
   */
  system: string;
}

export const list = async (params: {
    namespace: string
    name: string
    system?: string
}): Promise<IModuleMetadata[]> => {
    const { namespace, name, system = 'generic'} = params;   
    const result = await fetch(`${api.url}/v1/modules/${namespace}/${name}/${system}/versions`);

    if (!result.ok) {
      throw new Error(`Failed to list module versions: ${result.statusText}`);
    }

    const data: any = await result.json();
    const versions = data.modules[0].versions

    return versions.map((data: any) => ({
            namespace,
            name,
            version: data.version,
            system
        }))
}