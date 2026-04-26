import archiver from "archiver";
import { existsSync, readFileSync } from "node:fs";
import { PassThrough } from "node:stream";
import { join } from "node:path";

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
    pass.on("error", (err: Error) => reject(err));

    // Resolve when the passthrough is fully closed. Using 'close' ensures
    // underlying file descriptors have been released by the archiver.
    pass.on("close", () => {
      try {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      } finally {
        // Best-effort cleanup
        try {
          archive.destroy();
        } catch (_e) {
          // ignore
        }
      }
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
      reject(err);
    });

    archive.on("error", (err: Error) => {
      reject(err);
    });

    // Pipe archive output to passthrough and finalize
    archive.pipe(pass);

    // Add all files in the directory while respecting .gitignore patterns
    // Use glob with ignore patterns so that unwanted files are excluded
    archive.glob("**/*", { cwd: sourceDir, dot: true, ignore: ignorePatterns });

    // Finalize the archive; errors will be emitted via 'error' or 'warning'
    archive.finalize().catch((err) => reject(err));
  });
}

function isValidVersion(version: string): boolean {
  return (
    typeof version === "string" &&
    version.trim() !== "" &&
    encodeURIComponent(version) === version
  );
}
