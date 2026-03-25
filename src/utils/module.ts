import archiver from "archiver";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { PassThrough } from "node:stream";
import { join } from "node:path";
import ignore from "ignore";

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

    if (!existsSync(path)) {
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

    const pass = new PassThrough();
    const chunks: Buffer[] = [];
    let settled = false;

    const fail = (err: Error): void => {
      if (settled) {
        return;
      }
      settled = true;

      try {
        archive.abort();
      } catch (_err) {
        // ignore abort errors
      }

      reject(err);
    };

    // Build ignore patterns from .gitignore if present
    let ignorePatterns: string[] = [];
    try {
      const gitignorePath = join(sourceDir, ".gitignore");
      if (existsSync(gitignorePath)) {
        const raw = readFileSync(gitignorePath, "utf8");
        ignorePatterns = raw
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l !== "" && !l.startsWith("#"));
      }
      // Always ignore .git directory by default
      if (!ignorePatterns.includes(".git")) {
        ignorePatterns.push(".git");
      }
    } catch (err) {
      // if reading .gitignore fails, proceed without ignores
    }

    // Collect data from the passthrough stream
    pass.on("data", (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    });

    // Propagate stream errors to the promise rejection
    pass.on("error", fail);

    // Resolve when archive output has ended.
    pass.on("end", () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(Buffer.concat(chunks));
    });

    // Handle archive warnings (e.g., file stat failures) but continue when appropriate
    archive.on("warning", (err: any) => {
      // according to archiver docs, warning with code ENOENT can be ignored
      if (err && err.code === "ENOENT") {
        // log and continue
        // eslint-disable-next-line no-console
        console.warn("archiver warning:", err.message || err);
        return;
      }
      fail(err instanceof Error ? err : new Error(String(err)));
    });

    archive.on("error", fail);

    // Pipe archive output to passthrough and finalize
    archive.pipe(pass);

    // Add files explicitly instead of using glob, which avoids a Node v25
    // warning path where internal file handles may be closed during GC.
    const matcher = ignore();
    if (ignorePatterns.length > 0) {
      matcher.add(ignorePatterns);
    }

    const shouldIgnore = (
      relativePath: string,
      isDirectory = false,
    ): boolean => {
      const normalized = relativePath.replace(/\\/g, "/");
      if (normalized.length === 0) {
        return false;
      }

      if (isDirectory) {
        return matcher.ignores(`${normalized}/`);
      }

      return matcher.ignores(normalized);
    };

    const addFiles = (directory: string, relativePrefix = ""): void => {
      const entries = readdirSync(directory, { withFileTypes: true });

      for (const entry of entries) {
        const relativePath = relativePrefix
          ? `${relativePrefix}/${entry.name}`
          : entry.name;
        const absolutePath = join(directory, entry.name);

        if (entry.isDirectory()) {
          if (shouldIgnore(relativePath, true)) {
            continue;
          }
          addFiles(absolutePath, relativePath);
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        if (shouldIgnore(relativePath)) {
          continue;
        }

        // Append file content directly to avoid archiver opening file handles
        // that may be finalized by GC on newer Node versions.
        const fileContent = readFileSync(absolutePath);
        archive.append(fileContent, { name: relativePath });
      }
    };

    addFiles(sourceDir);

    // Finalize the archive; errors will be emitted via 'error' or 'warning'
    archive
      .finalize()
      .catch((err) =>
        fail(err instanceof Error ? err : new Error(String(err))),
      );
  });
}

function isValidVersion(version: string): boolean {
  return (
    typeof version === "string" &&
    version.trim() !== "" &&
    encodeURIComponent(version) === version
  );
}
