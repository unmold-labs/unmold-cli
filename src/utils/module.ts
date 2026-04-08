import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import ignore from "ignore";
import JSZip from "jszip";

import { authenticatedRequest } from "../utils/index";
import { unmold } from "../utils/config";

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

export interface IDeletedModule {
  namespace: string;
  name: string;
  version: string;
  system: string;
}

export interface IModuleDeleteTarget {
  namespace: string;
  name: string;
  system: string;
}

export async function list(filters: {
  namespace: string;
  name?: string;
  system?: string;
}): Promise<IModuleMetadata[]> {
  const { namespace, name, system } = filters;

  let path = `${namespace}`;

  if (name) {
    path += `/${name}`;
  }

  if (system) {
    path += `/${system}`;
  }

  const result = await authenticatedRequest(`/modules/v1/${path}`);

  if (!result.ok) {
    throw new Error(`Failed to list module versions: ${result.statusText}`);
  }

  const results: any = await result.json();

  return results.map((data: any) => ({
    namespace: data.namespace,
    name: data.name,
    system: data.system,
    version: data.version,
  }));
}

export async function publish(
  path: string,
  metadata: IModuleMetadata,
  overwrite = false,
) {
  const { namespace, name, version, system } = metadata;
  const MAX_MODULE_SIZE = unmold.api.uploadSizeLimitMB * 1024 * 1024; // 20MB in bytes

  try {
    if (!isValidVersion(version)) {
      throw new Error(`Invalid version name: ${version}`);
    }

    try {
      await access(path);
    } catch (_err) {
      throw new Error(`Module path does not exist: ${path}`);
    }

    // Zip the folder and get it as a buffer
    const zipBuffer = await zipFolderToBuffer(path);

    // Check if the buffer exceeds the maximum allowed size
    if (zipBuffer.length > MAX_MODULE_SIZE) {
      throw new Error(
        `Module size (${(zipBuffer.length / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum allowed size of 20MB`,
      );
    }

    let url = `/modules/v1/${namespace}/${name}/${system}/${version}`;

    if (overwrite) {
      url += "?overwrite=true";
    }

    const result = await authenticatedRequest(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/zip",
      },
      body: new Uint8Array(zipBuffer),
    });

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

export async function deleteVersion(metadata: IModuleMetadata): Promise<{
  deleted: IDeletedModule[];
}> {
  const { namespace, name, version, system } = metadata;

  if (!isValidVersion(version)) {
    throw new Error(`Invalid version name: ${version}`);
  }

  const result = await authenticatedRequest(
    `/modules/v1/${namespace}/${name}/${system}/${version}`,
    {
      method: "DELETE",
    },
  );

  if (!result.ok) {
    const errorData = await result.json().catch(() => ({}));
    throw new Error(
      `Failed to delete module version: ${result.status} ${result.statusText} - ${JSON.stringify(errorData)}`,
    );
  }

  return await result.json();
}

export async function deleteModule(target: IModuleDeleteTarget): Promise<{
  deleted: IDeletedModule[];
}> {
  const { namespace, name, system } = target;

  const result = await authenticatedRequest(
    `/modules/v1/${namespace}/${name}/${system}`,
    {
      method: "DELETE",
    },
  );

  if (!result.ok) {
    const errorData = await result.json().catch(() => ({}));
    throw new Error(
      `Failed to delete module: ${result.status} ${result.statusText} - ${JSON.stringify(errorData)}`,
    );
  }

  return await result.json();
}

/**
 * Zips a folder and returns it as a buffer
 * @param sourceDir Path to the directory to be zipped
 * @returns Promise that resolves to the zip file as a Buffer
 */
async function zipFolderToBuffer(sourceDir: string): Promise<Buffer> {
  const zip = new JSZip();

  // Build ignore patterns from .gitignore if present
  let ignorePatterns: string[] = [];
  try {
    const gitignorePath = join(sourceDir, ".gitignore");
    await access(gitignorePath);
    const raw = await readFile(gitignorePath, "utf8");
    ignorePatterns = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l !== "" && !l.startsWith("#"));
    // Always ignore .git directory by default
    if (!ignorePatterns.includes(".git")) {
      ignorePatterns.push(".git");
    }
  } catch (_err) {
    // if reading .gitignore fails, proceed without ignores
  }

  const matcher = ignore();
  if (ignorePatterns.length > 0) {
    matcher.add(ignorePatterns);
  }

  const shouldIgnore = (relativePath: string, isDirectory = false): boolean => {
    const normalized = relativePath.replace(/\\/g, "/");
    if (normalized.length === 0) {
      return false;
    }

    if (isDirectory) {
      return matcher.ignores(`${normalized}/`);
    }

    return matcher.ignores(normalized);
  };

  const addFiles = async (
    directory: string,
    relativePrefix = "",
  ): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = relativePrefix
        ? `${relativePrefix}/${entry.name}`
        : entry.name;
      const absolutePath = join(directory, entry.name);

      if (entry.isDirectory()) {
        if (shouldIgnore(relativePath, true)) {
          continue;
        }
        await addFiles(absolutePath, relativePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (shouldIgnore(relativePath)) {
        continue;
      }

      const fileContent = await readFile(absolutePath);
      zip.file(relativePath, fileContent);
    }
  };

  await addFiles(sourceDir);

  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}

function isValidVersion(version: string): boolean {
  return (
    typeof version === "string" &&
    version.trim() !== "" &&
    encodeURIComponent(version) === version
  );
}
