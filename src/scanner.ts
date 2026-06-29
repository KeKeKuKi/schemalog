import fs from "fs";
import path from "path";

export interface MigrationFile {
  /** Absolute path to the .sql file */
  path: string;
  /** Parsed timestamp: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS */
  timestamp: string;
  /** Human-readable description from filename */
  description: string;
  /** Raw SQL content */
  sql: string;
}

/**
 * Scan a directory for SQL migration files.
 * Expected naming: YYYYMMDD[_HHMMSS]_description.sql
 */
export function scanMigrations(dir: string): MigrationFile[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`Migrations directory not found: ${dir}`);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f: string) => f.endsWith(".sql"))
    .map((f: string) => {
      const fullPath = path.resolve(dir, f);
      const parsed = parseFilename(f);
      const sql = fs.readFileSync(fullPath, "utf-8");
      return { ...parsed, path: fullPath, sql };
    })
    .sort((a: MigrationFile, b: MigrationFile) => a.timestamp.localeCompare(b.timestamp));

  return files;
}

/**
 * Parse a migration filename into timestamp and human-readable description.
 *
 * Input:  20240629_create_users.sql
 * Output: { timestamp: "2024-06-29", description: "Create users" }
 *
 * Input:  20240629143022_add_verified_at_to_users.sql
 * Output: { timestamp: "2024-06-29 14:30:22", description: "Add verified at to users" }
 */
function parseFilename(filename: string): Pick<MigrationFile, "timestamp" | "description"> {
  const name = filename.replace(/\.sql$/i, "");

  // Try 14-digit timestamp first (YYYYMMDDHHMMSS)
  const fullMatch = name.match(/^(\d{8})(\d{6})_(.+)$/);
  if (fullMatch) {
    const date = fullMatch[1].replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
    const time = fullMatch[2].replace(/^(\d{2})(\d{2})(\d{2})$/, "$1:$2:$3");
    return {
      timestamp: `${date} ${time}`,
      description: fullMatch[3].replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) + ".",
    };
  }

  // Try 8-digit timestamp (YYYYMMDD)
  const dateMatch = name.match(/^(\d{8})_(.+)$/);
  if (dateMatch) {
    const date = dateMatch[1].replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
    return {
      timestamp: date,
      description: dateMatch[2].replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) + ".",
    };
  }

  // Fallback: use filename as-is
  return {
    timestamp: "unknown",
    description: name.replace(/_/g, " ") + ".",
  };
}
