export interface DangerCheck {
  type: "drop_table" | "drop_column" | "alter_type" | "drop_index";
  severity: "danger" | "warning";
  message: string;
  line: string;
}

const DANGER_PATTERNS: { regex: RegExp; type: DangerCheck["type"]; severity: DangerCheck["severity"] }[] = [
  { regex: /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?`?(\w+)`?/i, type: "drop_table", severity: "danger" },
  { regex: /DROP\s+COLUMN\s+(?:IF\s+EXISTS\s+)?`?(\w+)`?/i, type: "drop_column", severity: "danger" },
  { regex: /ALTER\s+COLUMN\s+`?(\w+)`?\s+TYPE\s+/i, type: "alter_type", severity: "warning" },
  { regex: /DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?`?(\w+)`?/i, type: "drop_index", severity: "warning" },
];

/**
 * Scan SQL text for destructive operations using regex.
 * Runs locally, no AI cost. Catches ~80% of dangerous patterns.
 */
export function detectDangers(sql: string): DangerCheck[] {
  const results: DangerCheck[] = [];

  for (const line of sql.split("\n")) {
    for (const pattern of DANGER_PATTERNS) {
      const match = line.match(pattern.regex);
      if (match) {
        results.push({
          type: pattern.type,
          severity: pattern.severity,
          message: line.trim(),
          line: line.trim(),
        });
      }
    }
  }

  return results;
}
