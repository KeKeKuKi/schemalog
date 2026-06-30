import { TableDef } from "./parser";

export interface TableDiff {
  table: string;
  status: "added" | "removed" | "modified" | "unchanged";
  addedColumns: string[];
  removedColumns: string[];
  modifiedColumns: { name: string; oldType: string; newType: string }[];
  indexChanges: string[];
}

/**
 * Compare two sets of parsed tables and produce per-table diffs.
 */
export function diffSchemas(current: TableDef[], base: TableDef[]): TableDiff[] {
  const currentMap = new Map(current.map((t) => [t.name, t]));
  const baseMap = new Map(base.map((t) => [t.name, t]));
  const allNames = new Set([...currentMap.keys(), ...baseMap.keys()]);
  const diffs: TableDiff[] = [];

  for (const name of allNames) {
    const cur = currentMap.get(name);
    const bas = baseMap.get(name);

    if (cur && !bas) {
      diffs.push({
        table: name,
        status: "added",
        addedColumns: cur.columns.map((c) => c.name),
        removedColumns: [],
        modifiedColumns: [],
        indexChanges: [],
      });
    } else if (!cur && bas) {
      diffs.push({
        table: name,
        status: "removed",
        addedColumns: [],
        removedColumns: bas.columns.map((c) => c.name),
        modifiedColumns: [],
        indexChanges: [],
      });
    } else if (cur && bas) {
      const curCols = new Map(cur.columns.map((c) => [c.name, c]));
      const basCols = new Map(bas.columns.map((c) => [c.name, c]));
      const allCols = new Set([...curCols.keys(), ...basCols.keys()]);

      const addedColumns: string[] = [];
      const removedColumns: string[] = [];
      const modifiedColumns: { name: string; oldType: string; newType: string }[] = [];

      for (const col of allCols) {
        const cc = curCols.get(col);
        const bc = basCols.get(col);

        if (cc && !bc) {
          addedColumns.push(col);
        } else if (!cc && bc) {
          removedColumns.push(col);
        } else if (cc && bc && cc.type !== bc.type) {
          modifiedColumns.push({ name: col, oldType: bc.type, newType: cc.type });
        }
      }

      const indexChanges: string[] = [];
      for (const idx of cur.indexes) {
        if (!bas.indexes.includes(idx)) indexChanges.push(`+ ${idx}`);
      }
      for (const idx of bas.indexes) {
        if (!cur.indexes.includes(idx)) indexChanges.push(`- ${idx}`);
      }

      const hasChanges =
        addedColumns.length > 0 ||
        removedColumns.length > 0 ||
        modifiedColumns.length > 0 ||
        indexChanges.length > 0;

      diffs.push({
        table: name,
        status: hasChanges ? "modified" : "unchanged",
        addedColumns,
        removedColumns,
        modifiedColumns,
        indexChanges,
      });
    }
  }

  return diffs.sort((a, b) => {
    const order = { added: 0, removed: 1, modified: 2, unchanged: 3 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });
}
