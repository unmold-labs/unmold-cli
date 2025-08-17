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

export async function list(params: {
  namespace: string;
  name: string;
  system?: string;
}): Promise<IModuleMetadata[]> {
  const { namespace, name, system = "generic" } = params;
  const result = await fetch(
    `${api.url}/modules/v1/${namespace}/${name}/${system}/versions`,
  );

  if (!result.ok) {
    throw new Error(`Failed to list module versions: ${result.statusText}`);
  }

  const data: any = await result.json();
  const versions = data.modules[0].versions;

  return versions.map((data: any) => ({
    namespace,
    name,
    system,
    version: data.version,
  }));
}

export async function publish(path: string, metadata: IModuleMetadata) {
  const { namespace, name, version, system } = metadata;
  const MAX_MODULE_SIZE = api.uploadSizeLimitMB * 1024 * 1024; // 20MB in bytes

  try {
    if (!isValidVersion(version)) {
      throw new Error(`Invalid version name: ${version}`);
    }

    // Zip the folder and get it as a buffer
    const zipBuffer = await zipFolderToBuffer(path);

    // Check if the buffer exceeds the maximum allowed size
    if (zipBuffer.length > MAX_MODULE_SIZE) {
      throw new Error(
        `Module size (${(zipBuffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum allowed size of 20MB`,
      );
    }

    const result = await fetch(
      `${api.url}/modules/v1/${namespace}/${name}/${system}/${version}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/zip",
        },
        body: new Uint8Array(zipBuffer),
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
}

export function parseIdentifier(identifier: string): {
  namespace: string;
  name: string;
  system: string;
} {
  let [namespace, name, system] = identifier.split("/");

  if (!namespace) {
    throw new Error("Module namespace is not defined for publication.");
  }

  if (!name) {
    throw new Error("Module name is not defined for publication.");
  }

  if (!system) {
    system = "generic";
  }

  return { namespace, name, system };
}

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
    encodeURIComponent(version) === version
  );
}
