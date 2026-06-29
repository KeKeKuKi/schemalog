export interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  comment: string | null;
}

export interface TableDef {
  name: string;
  columns: ColumnDef[];
  primaryKey: string[];
  indexes: string[];
  sql: string; // original CREATE TABLE statement
}

/**
 * Parse SQL text and extract CREATE TABLE definitions.
 * Handles MySQL-style backtick-quoted identifiers.
 */
export function parseTables(sql: string): TableDef[] {
  const tables: TableDef[] = [];

  // Split on CREATE TABLE (case insensitive)
  const blocks = sql.split(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/i);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const table = parseCreateTable(block);
    if (table) {
      tables.push(table);
    }
  }

  return tables;
}

function parseCreateTable(block: string): TableDef | null {
  // Extract table name: `table_name` or table_name
  const nameMatch = block.match(/^`?(\w+)`?\s*\(/);
  if (!nameMatch) return null;

  const name = nameMatch[1];
  const columns: ColumnDef[] = [];
  const primaryKey: string[] = [];
  const indexes: string[] = [];

  // Find the column definitions section (between first ( and matching ))
  let depth = 0;
  let start = block.indexOf("(");
  let end = -1;

  for (let i = start; i < block.length; i++) {
    if (block[i] === "(") depth++;
    if (block[i] === ")") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) return null;

  const body = block.substring(start + 1, end);
  const lines = splitColumns(body);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // PRIMARY KEY
    if (/^PRIMARY\s+KEY/i.test(trimmed)) {
      const pkMatch = trimmed.match(/\(([^)]+)\)/);
      if (pkMatch) {
        pkMatch[1].split(",").forEach((col) => {
          const cleaned = col.trim().replace(/`/g, "");
          if (cleaned) primaryKey.push(cleaned);
        });
      }
      continue;
    }

    // INDEX / KEY / UNIQUE
    if (/^(UNIQUE\s+)?(INDEX|KEY)\s/i.test(trimmed)) {
      indexes.push(trimmed);
      continue;
    }

    // CONSTRAINT
    if (/^CONSTRAINT/i.test(trimmed)) {
      continue;
    }

    // Regular column: `name` type [constraints...] [COMMENT '...']
    const col = parseColumn(trimmed);
    if (col) columns.push(col);
  }

  if (columns.length === 0) return null;

  return {
    name,
    columns,
    primaryKey,
    indexes,
    sql: `CREATE TABLE \`${name}\` (\n${lines.join("\n")}\n)`,
  };
}

function parseColumn(line: string): ColumnDef | null {
  // Match: `col_name` type [NOT NULL] [DEFAULT value] [COMMENT '...'] [,]
  const match = line.match(
    /^`(\w+)`\s+(\w[\w\s(),]*?)(?:\s+(NOT\s+NULL|NULL))?(?:\s+DEFAULT\s+(['"][^'"]*['"]|[\w.()-]+))?(?:\s+COMMENT\s+['"]([^'"]*)['"])?\s*,?\s*$/i
  );

  if (!match) {
    // Try simpler pattern for columns without backticks
    const simpleMatch = line.match(
      /^(\w+)\s+(\w[\w\s(),]*?)(?:\s+(NOT\s+NULL|NULL))?(?:\s+DEFAULT\s+(['"][^'"]*['"]|[\w.()-]+))?\s*,?\s*$/i
    );
    if (!simpleMatch) return null;

    return {
      name: simpleMatch[1],
      type: simpleMatch[2].trim(),
      nullable: !simpleMatch[3] || simpleMatch[3].toUpperCase() !== "NOT NULL",
      defaultValue: simpleMatch[4]?.replace(/['"]/g, "") ?? null,
      comment: null,
    };
  }

  return {
    name: match[1],
    type: match[2].trim(),
    nullable: !match[3] || match[3].toUpperCase() !== "NOT NULL",
    defaultValue: match[4]?.replace(/['"]/g, "") ?? null,
    comment: match[5] ?? null,
  };
}

/**
 * Split CREATE TABLE body into individual column/constraint lines.
 * Handles multi-line definitions and trailing commas.
 */
function splitColumns(body: string): string[] {
  const lines: string[] = [];
  let current = "";

  for (const raw of body.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    current += (current ? " " : "") + trimmed;

    if (trimmed.endsWith(",")) {
      lines.push(current.slice(0, -1)); // remove trailing comma
      current = "";
    }
  }

  if (current.trim()) {
    lines.push(current.trim());
  }

  return lines;
}
