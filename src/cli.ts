#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";

interface SchemalogConfig {
  migrationsDir: string;
  outputDir: string;
  provider?: string;
}

const CONFIG_FILE = ".schemalog.json";

const program = new Command();

program
  .name("schemalog")
  .description("AI-powered database schema changelog generator")
  .version("1.2.0");

/**
 * schemalog init — create a .schemalog.json config file
 */
program
  .command("init")
  .description("Initialize schemalog in the current project")
  .option("-d, --dir <path>", "migrations directory", "migrations")
  .option("-o, --output <path>", "output directory", ".")
  .option("-p, --provider <name>", "AI provider: deepseek (default) | openai", "deepseek")
  .action((options) => {
    const config: SchemalogConfig = {
      migrationsDir: options.dir,
      outputDir: options.output,
      provider: options.provider,
    };

    const configPath = path.resolve(process.cwd(), CONFIG_FILE);

    if (fs.existsSync(configPath)) {
      console.log(`Config already exists at ${configPath}`);
      console.log("Edit manually or delete and re-run init.");
      process.exit(0);
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    console.log(`Created ${CONFIG_FILE}`);
    console.log(`  provider:   ${config.provider}`);
    console.log(`  migrations: ${config.migrationsDir}/`);
    console.log(`  output:     ${config.outputDir}/SCHEMA.md`);
    console.log(`\nNext: export SCHEMALOG_API_KEY=your-api-key`);
    console.log(`      npx schemalog generate`);
  });

/**
 * schemalog generate — scan migrations, analyze with AI, output SCHEMA.md
 */
program
  .command("generate")
  .description("Generate SCHEMA.md from SQL migration files")
  .option("-k, --api-key <key>", "API key (or set SCHEMALOG_API_KEY env)")
  .option("-p, --provider <name>", "AI provider override: deepseek | openai")
  .option("-f, --force", "Re-analyze all migrations, ignoring cache")
  .action(async (options) => {
    const apiKey = options.apiKey || process.env.SCHEMALOG_API_KEY;
    if (!apiKey) {
      console.error("Error: SCHEMALOG_API_KEY not set.");
      console.error("  Use -k <key> or: export SCHEMALOG_API_KEY=your-key");
      process.exit(1);
    }

    // Load config
    const configPath = path.resolve(process.cwd(), CONFIG_FILE);
    let config: SchemalogConfig;

    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } else {
      config = { migrationsDir: "migrations", outputDir: "." };
    }

    const provider = options.provider || config.provider || "deepseek";
    const migrationsDir = path.resolve(process.cwd(), config.migrationsDir);
    const projectRoot = process.cwd();

    // Lazy-load core modules so CLI starts fast for simple commands like "init"
    const { scanMigrations } = await import("./scanner");
    const { analyzeMigration } = await import("./ai/client");
    const { detectDangers } = await import("./danger/detector");
    const { generateMarkdown, writeMarkdown } = await import("./output/markdown");
    const { prepareIncremental, saveIncremental } = await import("./cache");

    console.log(`Provider: ${provider.toUpperCase()}`);
    console.log(`Scanning ${config.migrationsDir}/ ...`);
    const files = scanMigrations(migrationsDir);

    if (files.length === 0) {
      console.log("No .sql migration files found.");
      process.exit(0);
    }

    // Incremental filter (skip if --force)
    const { fresh, cached, cache } = options.force
      ? { fresh: files, cached: [], cache: { files: {} } }
      : prepareIncremental(files, projectRoot);

    if (!options.force && cached.length > 0) {
      console.log(`Cache hit: ${cached.length}/${files.length} unchanged, ${fresh.length} to analyze.\n`);
    } else {
      console.log(`Found ${files.length} migration(s).\n`);
    }

    const entries = [...cached];
    const freshEntries = [];

    for (const file of fresh) {
      console.log(`Analyzing: ${path.basename(file.path)} …`);
      const analysis = await analyzeMigration(file.sql, file.description, apiKey, provider);
      const dangers = detectDangers(file.sql);

      const entry = {
        timestamp: file.timestamp,
        description: file.description,
        sql: file.sql,
        analysis,
        dangers,
      };

      freshEntries.push(entry);
      entries.push(entry);

      const riskIcon = analysis.risk === "safe" ? "🟢" : analysis.risk === "warning" ? "🟡" : "🔴";
      console.log(`  ${riskIcon} ${analysis.risk.padEnd(7)} — ${analysis.summary}`);
      if (dangers.length) {
        console.log(`  ⚠️  ${dangers.length} local danger(s) detected`);
      }
    }

    // Persist cache for fresh entries
    if (freshEntries.length > 0) {
      saveIncremental(projectRoot, cache, freshEntries, fresh);
    }

    // Sort all entries by timestamp for final output
    entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const md = generateMarkdown(entries);
    const outPath = writeMarkdown(md, path.resolve(process.cwd(), config.outputDir));

    const skipNote = !options.force && cached.length > 0 ? ` (${fresh.length} new, ${cached.length} cached)` : "";
    console.log(`\nDone. → ${outPath}${skipNote}`);
    console.log(`Total: ${entries.length} migrations in changelog.`);
  });

/**
 * schemalog diff — compare current schema against a base reference
 */
program
  .command("diff")
  .description("Compare current migration schema against a base reference")
  .option("-b, --base <path>", "Path to base migrations directory or .sql file")
  .option("-r, --base-ref <ref>", "Git ref (branch/tag/commit) to compare against")
  .option("-d, --dir <path>", "Migrations directory to diff (default: from .schemalog.json)")
  .option("--json", "Output as JSON")
  .action(async (options) => {
    const configPath = path.resolve(process.cwd(), CONFIG_FILE);
    let config: SchemalogConfig;

    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } else {
      config = { migrationsDir: "migrations", outputDir: "." };
    }

    const migrationsDir = path.resolve(process.cwd(), options.dir || config.migrationsDir);

    if (!options.base && !options.baseRef) {
      console.error("Error: --base <path> or --base-ref <ref> is required.");
      console.error("  schemalog diff --base-ref main");
      console.error("  schemalog diff --base path/to/migrations");
      console.error("  schemalog diff --base path/to/dump.sql");
      process.exit(1);
    }

    if (options.base && options.baseRef) {
      console.error("Error: --base and --base-ref are mutually exclusive.");
      process.exit(1);
    }

    const { scanMigrations } = await import("./scanner");
    const { parseTables } = await import("./parser");
    const { diffSchemas } = await import("./diff");
    const { formatDiffMarkdown } = await import("./output/diff");

    // Parse current
    console.log(`Current: ${config.migrationsDir}/ (${migrationsDir})`);
    const currentFiles = scanMigrations(migrationsDir);
    const currentTables = new Map<string, ReturnType<typeof parseTables>[0]>();
    for (const f of currentFiles) {
      for (const t of parseTables(f.sql)) {
        currentTables.set(t.name, t);
      }
    }

    // Parse base
    let baseFiles: ReturnType<typeof scanMigrations>;
    let baseLabel: string;

    if (options.baseRef) {
      const { readMigrationsFromGit, isGitAvailable } = await import("./git");
      if (!isGitAvailable()) {
        console.error("Error: git not found in PATH. --base-ref requires git.");
        process.exit(1);
      }
      baseLabel = options.baseRef;
      console.log(`Base:    ${options.baseRef} (git ref, ${config.migrationsDir}/)`);
      try {
        baseFiles = readMigrationsFromGit(options.baseRef, config.migrationsDir);
        console.log(`Found ${baseFiles.length} migration(s) at ref.`);
      } catch (e: any) {
        console.error(`Error reading from git: ${e.message}`);
        process.exit(1);
      }
    } else {
      const basePath = path.resolve(process.cwd(), options.base);
      baseLabel = options.base;
      const baseStat = fs.statSync(basePath);
      if (baseStat.isDirectory()) {
        console.log(`Base:    ${options.base}/ (${basePath})`);
        baseFiles = scanMigrations(basePath);
      } else {
        console.log(`Base:    ${options.base} (${basePath})`);
        const sql = fs.readFileSync(basePath, "utf-8");
        baseFiles = [{ path: basePath, timestamp: "", description: "Base reference", sql }];
      }
    }

    const baseTables = new Map<string, ReturnType<typeof parseTables>[0]>();
    for (const f of baseFiles) {
      for (const t of parseTables(f.sql)) {
        baseTables.set(t.name, t);
      }
    }

    const diffs = diffSchemas(
      Array.from(currentTables.values()),
      Array.from(baseTables.values())
    );

    if (options.json) {
      console.log(JSON.stringify(diffs, null, 2));
    } else {
      const md = formatDiffMarkdown(diffs, "current", baseLabel);
      const outPath = path.resolve(process.cwd(), config.outputDir, "SCHEMA_DIFF.md");
      fs.writeFileSync(outPath, md, "utf-8");
      console.log(md);
      console.log(`\nDiff saved to ${outPath}`);
    }
  });

/**
 * schemalog dict — extract table structures, AI explains each column, output DATA_DICTIONARY.md
 */
program
  .command("dict")
  .description("Generate a data dictionary from SQL files (table & column descriptions)")
  .option("-k, --api-key <key>", "API key (or set SCHEMALOG_API_KEY env)")
  .option("-p, --provider <name>", "AI provider: deepseek | openai")
  .action(async (options) => {
    const apiKey = options.apiKey || process.env.SCHEMALOG_API_KEY;
    if (!apiKey) {
      console.error("Error: SCHEMALOG_API_KEY not set.");
      process.exit(1);
    }

    const configPath = path.resolve(process.cwd(), CONFIG_FILE);
    let config: SchemalogConfig;

    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } else {
      config = { migrationsDir: "migrations", outputDir: "." };
    }

    const provider = options.provider || config.provider || "deepseek";
    const migrationsDir = path.resolve(process.cwd(), config.migrationsDir);

    const { scanMigrations } = await import("./scanner");
    const { parseTables } = await import("./parser");
    const { generateDictionary } = await import("./ai/client");
    const { generateDictionaryMarkdown } = await import("./output/dictionary");

    console.log(`Provider: ${provider.toUpperCase()}`);
    console.log(`Scanning ${config.migrationsDir}/ ...`);
    const files = scanMigrations(migrationsDir);

    if (files.length === 0) {
      // Try the migrations directory directly if no timestamped files found
      console.log("No timestamped migration files found.");
      console.log("For a single SQL dump, try: schemalog dict --file your_dump.sql");
      process.exit(0);
    }

    // Parse all tables from all files, keep the latest version of each
    const tableMap = new Map<string, { table: ReturnType<typeof parseTables>[0]; sql: string }>();

    for (const file of files) {
      const tables = parseTables(file.sql);
      for (const table of tables) {
        tableMap.set(table.name, { table, sql: file.sql });
      }
    }

    const tableList = Array.from(tableMap.values()).map((t) => t.table);

    if (tableList.length === 0) {
      console.log("No CREATE TABLE statements found in migration files.");
      process.exit(0);
    }

    console.log(`Found ${tableList.length} table(s) across ${files.length} file(s).\n`);

    // Build SQL summary for AI
    const sqlSummary = tableList.map((t) => t.sql).join("\n\n");

    console.log("Generating data dictionary with AI …");
    const result = await generateDictionary(sqlSummary, apiKey, provider);

    const md = generateDictionaryMarkdown(tableList, result.tables);
    const outPath = path.resolve(process.cwd(), config.outputDir, "DATA_DICTIONARY.md");
    fs.writeFileSync(outPath, md, "utf-8");

    console.log(`\nDone. → ${outPath}`);
    console.log(`Described ${result.tables.length} table(s).`);
  });

/**
 * schemalog view — open an interactive schema visualization in the browser
 */
program
  .command("view")
  .description("Open interactive schema visualization in browser")
  .option("-d, --dir <path>", "Migrations directory (default: from .schemalog.json)")
  .option("-o, --output <path>", "Output file path", "SCHEMA_VIEW.html")
  .option("--no-open", "Generate HTML without opening browser")
  .action(async (options) => {
    const configPath = path.resolve(process.cwd(), CONFIG_FILE);
    let config: SchemalogConfig;

    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } else {
      config = { migrationsDir: "migrations", outputDir: "." };
    }

    const migrationsDir = path.resolve(process.cwd(), options.dir || config.migrationsDir);
    const { scanMigrations } = await import("./scanner");
    const { parseTables } = await import("./parser");
    const { generateSchemaView } = await import("./output/view");

    console.log(`Scanning ${config.migrationsDir}/ ...`);
    const files = scanMigrations(migrationsDir);

    if (files.length === 0) {
      console.log("No .sql migration files found.");
      process.exit(0);
    }

    // Collect latest version of each table
    const tableMap = new Map<string, ReturnType<typeof parseTables>[0]>();
    for (const f of files) {
      for (const t of parseTables(f.sql)) {
        tableMap.set(t.name, t);
      }
    }

    const tables = Array.from(tableMap.values());
    console.log(`Found ${tables.length} table(s) across ${files.length} migration(s).`);

    const html = generateSchemaView(tables, "Database Schema", `${tables.length} tables · ${files.length} migrations`);
    const outPath = path.resolve(process.cwd(), options.output);
    fs.writeFileSync(outPath, html, "utf-8");

    console.log(`→ ${outPath}`);

    if (options.open) {
      const { execSync } = await import("child_process");
      const cmd = process.platform === "darwin"
        ? `open "${outPath}"`
        : process.platform === "win32"
        ? `start "" "${outPath}"`
        : `xdg-open "${outPath}"`;
      try {
        execSync(cmd);
        console.log("Opened in browser.");
      } catch {
        console.log("Open manually:", outPath);
      }
    }
  });

program.parse();
