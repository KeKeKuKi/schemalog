# I built a CLI that reads your SQL migrations and auto-generates changelogs + data dictionaries with AI

Every project reaches this point: the `migrations/` folder has 30+ files, and nobody — not even the original authors — can tell you what `user_status = 2` means without digging through code.

The SQL migration files are the single source of truth for your database schema. They're machine-readable, but not human-readable. That gap is exactly what LLMs are good at filling.

**What it does:**

1. Scans migration files (`YYYYMMDD_description.sql`)
2. Sends each one to an LLM (DeepSeek or OpenAI)
3. Generates `SCHEMA.md` — every migration explained in plain English, dangerous operations (DROP TABLE/COLUMN/INDEX) automatically flagged in red
4. Generates `DATA_DICTIONARY.md` — every table, every column, with AI-inferred descriptions and enum values
5. Caches results by SHA256 — only new/changed files hit the API

**Why I built this:**

I work on a Java blog platform with 12 tables. We manage migrations manually with timestamped SQL files. After a year of development, half the columns made no sense to new team members. Writing docs by hand is tedious and instantly out of date. AI can read the SQL and infer what things mean — so why not automate it?

**A real example — Ghost CMS:**

I ran it on Ghost CMS's 8 migrations spanning 10 years (2015-2025). In 30 seconds, it produced a full changelog showing how Ghost's schema evolved from 2 tables to 12, correctly flagging the v6 cleanup migration (10 DROP COLUMNs across 5 tables) as 🔴 danger.

**Stack:** TypeScript, Commander.js, DeepSeek API, Handlebars

**Links:**
- npm: `npm install -g schemalog`
- GitHub: https://github.com/KeKeKuKi/schemalog
- npm page: https://www.npmjs.com/package/schemalog

Would love feedback from anyone who manages SQL migrations. What would make this actually useful in your workflow?
