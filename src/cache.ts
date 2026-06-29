import fs from "fs";
import path from "path";
import crypto from "crypto";
import { MigrationFile } from "./scanner";
import { MigrationEntry } from "./output/markdown";

interface CachedEntry {
  hash: string;
  entry: MigrationEntry;
}

interface CacheData {
  files: Record<string, CachedEntry>; // filename → cached data
}

const CACHE_FILE = ".schemalog-cache.json";

function fileHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function loadCache(dir: string): CacheData {
  const cachePath = path.join(dir, CACHE_FILE);
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  }
  return { files: {} };
}

function saveCache(dir: string, cache: CacheData): void {
  const cachePath = path.join(dir, CACHE_FILE);
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
}

/**
 * Filter migrations through the cache.
 * Returns entries for ALL files (from cache or fresh).
 * Files whose hash hasn't changed come from cache, the rest need AI processing.
 */
export function prepareIncremental(
  migrations: MigrationFile[],
  projectRoot: string
): { fresh: MigrationFile[]; cached: MigrationEntry[]; cache: CacheData } {
  const cache = loadCache(projectRoot);
  const fresh: MigrationFile[] = [];
  const cached: MigrationEntry[] = [];

  for (const m of migrations) {
    const h = fileHash(m.sql);
    const cacheKey = path.basename(m.path);
    if (cache.files[cacheKey] && cache.files[cacheKey].hash === h) {
      cached.push(cache.files[cacheKey].entry);
    } else {
      fresh.push(m);
    }
    // Pre-populate hash so it's saved even if no new files are processed
    if (!cache.files[cacheKey]) {
      cache.files[cacheKey] = {} as CachedEntry;
    }
    cache.files[cacheKey].hash = h;
  }

  return { fresh, cached, cache };
}

/**
 * Save entries (from fresh AI analysis) to the cache, then persist.
 */
export function saveIncremental(
  projectRoot: string,
  cache: CacheData,
  entries: MigrationEntry[],
  files: MigrationFile[]
): void {
  for (let i = 0; i < files.length; i++) {
    const cacheKey = path.basename(files[i].path);
    cache.files[cacheKey] = {
      hash: fileHash(files[i].sql),
      entry: entries[i],
    };
  }
  saveCache(projectRoot, cache);
}
