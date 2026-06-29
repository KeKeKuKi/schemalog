import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { MigrationFile } from "../scanner";
import { MigrationAnalysis } from "../ai/client";
import { DangerCheck } from "../danger/detector";

export interface MigrationEntry {
  timestamp: string;
  description: string;
  sql: string;
  analysis: MigrationAnalysis;
  dangers: DangerCheck[];
}

/** Register Handlebars helpers */
function registerHelpers() {
  Handlebars.registerHelper("inc", (index: number) => index + 1);
  Handlebars.registerHelper("join", (arr: string[]) => (arr.length ? arr.join(", ") : "(none)"));
  Handlebars.registerHelper("riskEmoji", (risk: string) => {
    switch (risk) {
      case "safe":    return "🟢";
      case "warning": return "🟡";
      case "danger":  return "🔴";
      default:        return "⚪";
    }
  });
}

/**
 * Generate SCHEMA.md from analyzed migrations.
 */
export function generateMarkdown(entries: MigrationEntry[]): string {
  registerHelpers();

  const templatePath = path.resolve(__dirname, "templates", "changelog.hbs");
  const templateSource = fs.readFileSync(templatePath, "utf-8");
  const template = Handlebars.compile(templateSource);

  return template({ migrations: entries });
}

/**
 * Write the generated markdown to disk.
 */
export function writeMarkdown(content: string, outDir: string): string {
  const outPath = path.resolve(outDir, "SCHEMA.md");
  fs.writeFileSync(outPath, content, "utf-8");
  return outPath;
}
