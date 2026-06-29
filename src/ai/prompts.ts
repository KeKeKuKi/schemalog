/**
 * System prompt for the migration analysis agent.
 */
export const SYSTEM_PROMPT = `You are a database expert. Analyze SQL and produce clear, accurate summaries.
Always return valid JSON. Never include markdown fencing or commentary outside the JSON.`;

export const DICTIONARY_SYSTEM_PROMPT = `You are a database architect. Given CREATE TABLE statements, explain each table's purpose and each column's meaning in plain language.
Always return valid JSON. Never include markdown fencing or commentary outside the JSON.`;

/**
 * Prompt to analyze a single migration SQL file.
 */
export function analyzeMigrationPrompt(sql: string, description: string): string {
  return `Analyze this database migration SQL. It was described as "${description}".

Return a JSON object with this exact structure (no markdown, no code fences, just the raw JSON):

{
  "summary": "1-2 sentences explaining what this migration does, in plain English",
  "tables": ["table1", "table2"],
  "risk": "safe" | "warning" | "danger",
  "riskReason": "if not safe, explain why. if safe, use empty string",
  "operations": ["CREATE TABLE users", "ADD COLUMN verified_at", ...]
}

Risk levels:
- safe: purely additive (CREATE TABLE, ADD COLUMN, CREATE INDEX)
- warning: modifies existing data (UPDATE, ALTER COLUMN with USING, renaming)
- danger: destructive (DROP TABLE, DROP COLUMN, ALTER COLUMN with value loss)

SQL:
${sql}`;
}

/**
 * Prompt to generate a data dictionary from table definitions.
 */
export function dictionaryPrompt(tablesJson: string): string {
  return `Here are the CREATE TABLE statements for a database:

${tablesJson}

For each table, return a JSON object describing its purpose and each column's meaning.
The output must be exactly this structure (no markdown, no code fences):

{
  "tables": [
    {
      "name": "users",
      "description": "Stores registered user accounts and profile information",
      "columns": [
        { "name": "id", "description": "Auto-incrementing unique identifier" },
        { "name": "email", "description": "Login email, unique per user" },
        { "name": "status", "description": "Account status: 0=inactive, 1=active, 2=banned" }
      ]
    }
  ]
}

Rules:
- Describe each column based on its name, type, constraints, and relationship to other tables.
- If a column name suggests an enum or status field, list the likely values.
- Reference related tables (e.g., "Foreign key to users.id").
- Keep descriptions concise: one sentence per column.`;
}
