import { execSync } from "child_process";
import { MigrationFile } from "./scanner";
import path from "path";

function gitRoot(): string {
  return execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
}

/**
 * Read migration files from a git ref (branch, tag, commit).
 * Uses `git ls-tree` to list files and `git show` to read content.
 * `migrationsDir` can be relative (to CWD) or absolute — we convert to git-root-relative.
 */
export function readMigrationsFromGit(
  ref: string,
  migrationsDir: string
): MigrationFile[] {
  const root = gitRoot();
  const absDir = path.resolve(migrationsDir);
  const relDir = path.relative(root, absDir).replace(/\\/g, "/");

  const output = execSync(
    `git -C "${root}" ls-tree -r --name-only ${ref} -- "${relDir}"`,
    { encoding: "utf-8" }
  ).trim();

  if (!output) {
    throw new Error(`No files found in "${relDir}" at ref ${ref}`);
  }

  const filenames = output.split("\n").filter((f) => f.endsWith(".sql"));

  if (filenames.length === 0) {
    throw new Error(`No .sql files found in "${relDir}" at ref ${ref}`);
  }

  return filenames.map((filepath) => {
    const sql = execSync(`git -C "${root}" show "${ref}:${filepath}"`, { encoding: "utf-8" });
    return {
      path: filepath,
      timestamp: "",
      description: path.basename(filepath),
      sql,
    };
  });
}

export function isGitAvailable(): boolean {
  try {
    execSync("git --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
