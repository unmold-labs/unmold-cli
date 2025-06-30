import archiver from "archiver";

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
  namespace: string;
  name: string;
  system?: string;
}): Promise<IModuleMetadata[]> => {
  const { namespace, name, system = "generic" } = params;
  const result = await fetch(
    `${api.url}/v1/modules/${namespace}/${name}/${system}/versions`,
  );

  if (!result.ok) {
    throw new Error(`Failed to list module versions: ${result.statusText}`);
  }

  const data: any = await result.json();
  const versions = data.modules[0].versions;

  return versions.map((data: any) => ({
    namespace,
    name,
    version: data.version,
    system,
  }));
};

export const publish = async (path: string, metadata: IModuleMetadata) => {
  const { namespace, name, version, system } = metadata;

  try {
    if (!isValidVersion(version)) {
      throw new Error(`Invalid version name: ${version}`);
    }

    // Zip the folder and get it as a buffer
    const zipBuffer = await zipFolderToBuffer(path);

    const result = await fetch(
      `${api.url}/v1/modules/${namespace}/${name}/${system}/${version}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/zip",
        },
        body: zipBuffer,
      },
    );

    if (!result.ok) {
      const errorData = await result.json().catch(() => ({}));
      throw new Error(
        `Failed to publish module: ${result.status} ${result.statusText} - ${JSON.stringify(errorData)}`,
      );
    }

    return await result.json();
  } catch (error) {
    console.error("Error during module publishing:", error);
    throw error;
  }
};

/**
 * Zips a folder and returns it as a buffer
 * @param sourceDir Path to the directory to be zipped
 * @returns Promise that resolves to the zip file as a Buffer
 */
async function zipFolderToBuffer(sourceDir: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    const buffers: Buffer[] = [];

    archive.on("data", (data: Buffer) => {
      buffers.push(data);
    });

    archive.on("error", (err: Error) => {
      reject(err);
    });

    archive.on("end", () => {
      const buffer = Buffer.concat(buffers);
      resolve(buffer);
    });

    // Add all files in the directory to the archive
    archive.directory(sourceDir, false);

    // Finalize the archive
    archive.finalize();
  });
}

function isValidVersion(version: string): boolean {
  return (
    typeof version === "string" &&
    version.trim() !== "" &&
    version.indexOf("/") === -1
  );
}
