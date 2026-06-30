import { TableDef, ColumnDef } from "./parser";

export interface Relation {
  from: { table: string; column: string };
  to: { table: string; column: string };
  confidence: "high" | "medium" | "low";
}

/**
 * Infer foreign-key relationships from column naming conventions.
 * "High" confidence: exact match on table name (e.g., user_id → users.id).
 * "Medium": partial match (author_id → users via common patterns).
 * "Low": prefix match only.
 */
export function inferRelations(tables: TableDef[]): Relation[] {
  const relations: Relation[] = [];
  const tableNames = new Set(tables.map((t) => t.name));

  for (const table of tables) {
    for (const col of table.columns) {
      // Skip primary key columns and non-id columns
      if (col.name === "id" || col.name === "uuid") continue;

      const rel = matchColumn(col.name, table.name, tableNames, tables);
      if (rel) {
        // Avoid duplicates
        const dup = relations.find(
          (r) =>
            r.from.table === rel.from.table &&
            r.from.column === rel.from.column &&
            r.to.table === rel.to.table
        );
        if (!dup) relations.push(rel);
      }
    }
  }

  return relations;
}

function matchColumn(
  colName: string,
  ownTable: string,
  tableNames: Set<string>,
  tables: TableDef[]
): Relation | null {
  // Pattern 1: <table>_id → <table>.id (highest confidence)
  const exactMatch = colName.match(/^(.+)_id$/);
  if (exactMatch) {
    const targetTable = exactMatch[1];
    // Handle plural: article_tags → me_article_tag
    if (tableNames.has(targetTable)) {
      return {
        from: { table: ownTable, column: colName },
        to: { table: targetTable, column: "id" },
        confidence: "high",
      };
    }
    // Try with me_ prefix
    const withMe = "me_" + targetTable;
    if (tableNames.has(withMe)) {
      return {
        from: { table: ownTable, column: colName },
        to: { table: withMe, column: "id" },
        confidence: "high",
      };
    }
    // Try with t_ prefix
    const withT = "t_" + targetTable;
    if (tableNames.has(withT)) {
      return {
        from: { table: ownTable, column: colName },
        to: { table: withT, column: "id" },
        confidence: "high",
      };
    }
    // If we can't find target but name looks plausible, still note it (low confidence)
    // Check if it's not a self-ref
    if (targetTable !== ownTable) {
      // Find table with closest name match
      const similar = findSimilarTable(targetTable, tableNames);
      if (similar) {
        return {
          from: { table: ownTable, column: colName },
          to: { table: similar, column: "id" },
          confidence: "medium",
        };
      }
    }
  }

  // Pattern 2: <something>_by → users (common pattern)
  const byMatch = colName.match(/^(.+)_by$/);
  if (byMatch && tableNames.has("users")) {
    return {
      from: { table: ownTable, column: colName },
      to: { table: "users", column: "id" },
      confidence: "medium",
    };
  }
  if (byMatch && tableNames.has("me_user")) {
    return {
      from: { table: ownTable, column: colName },
      to: { table: "me_user", column: "id" },
      confidence: "medium",
    };
  }

  // Pattern 3: <table>_id in join tables (e.g., article_id, tag_id in article_tag)
  const joinMatch = colName.match(/^(.+)_id$/);
  if (joinMatch) {
    const target = joinMatch[1];
    // For join tables like me_article_tag, check all tables
    for (const t of tables) {
      if (t.name === target || t.name.endsWith("_" + target) || t.name === "me_" + target) {
        if (t.name !== ownTable) {
          return {
            from: { table: ownTable, column: colName },
            to: { table: t.name, column: "id" },
            confidence: "medium",
          };
        }
      }
    }
  }

  // Pattern 4: parent_id → self-reference
  if (colName === "parent_id") {
    return {
      from: { table: ownTable, column: colName },
      to: { table: ownTable, column: "id" },
      confidence: "high",
    };
  }

  return null;
}

function findSimilarTable(
  target: string,
  tableNames: Set<string>
): string | null {
  for (const name of tableNames) {
    if (name.endsWith(target) || name.endsWith(target + "s")) return name;
  }
  return null;
}
