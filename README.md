# Schemalog

Your database docs stop lying. AI-powered changelog and data dictionary from SQL migrations.

## What it does

Scans your `migrations/*.sql` files and generates:

- **`SCHEMA.md`** — a human-readable changelog with risk detection (DROP TABLE, DROP COLUMN, etc.)
- **`DATA_DICTIONARY.md`** — every table and column explained by AI

```
$ schemalog generate
Provider: DEEPSEEK
Scanning migrations/ ...
Found 4 migration(s).

Analyzing: 20240629_create_users.sql ...
  🟢 safe    — Create a users table with id, email, name, and created_at columns.
Analyzing: 20240702_drop_legacy_status_field.sql ...
  🔴 danger  — DROP TABLE legacy_logs + DROP COLUMN old_status.
  ⚠️  2 local danger(s) detected

Done. → SCHEMA.md
```

## Quick Start

### 1. Install

```bash
npm install -g schemalog
```

### 2. Get an API key

Schemalog needs an AI API key to interpret SQL. DeepSeek is recommended (Chinese users can pay with Alipay/WeChat):

- [DeepSeek](https://platform.deepseek.com) — ¥1/million input tokens
- [OpenAI](https://platform.openai.com) — GPT-4o-mini or similar

### 3. Initialize your project

Your migration files should be named like:

```
migrations/
├── 20240629_create_users.sql
├── 20240630_add_verified_at_to_users.sql
├── 20240701143022_create_orders.sql      ← HHMMSS optional
└── 20240702_drop_legacy_status_field.sql
```

```bash
cd your-project
schemalog init --dir migrations --provider deepseek
```

### 4. Generate

```bash
export SCHEMALOG_API_KEY=sk-xxxxxxxx
schemalog generate                # → SCHEMA.md
schemalog dict                    # → DATA_DICTIONARY.md
```

## Commands

| Command | Description |
|---|---|
| `schemalog init` | Create `.schemalog.json` config |
| `schemalog generate` | Generate migration changelog → `SCHEMA.md` |
| `schemalog dict` | Generate data dictionary → `DATA_DICTIONARY.md` |

### Options

```
schemalog generate [-k api-key] [-p provider] [-f]
  -k, --api-key    API key (or set SCHEMALOG_API_KEY env)
  -p, --provider   deepseek (default) | openai
  -f, --force      Re-analyze all, ignore cache

schemalog dict [-k api-key] [-p provider]
  -k, --api-key    API key
  -p, --provider   deepseek | openai
```

## Features

- **🟢🟡🔴 Risk detection** — DROP? ALTER TYPE? Automatically flagged
- **💾 Incremental cache** — Only re-analyzes new/changed files. Zero API cost on re-runs
- **🤖 Multi-provider** — DeepSeek, OpenAI, or any compatible API
- **📊 Data dictionary** — Every column explained with AI-inferred meaning and enum values
- **🔌 GitHub Action** — Auto-comment migration changelog on pull requests

## Supported SQL file naming

```
YYYYMMDD_description.sql
YYYYMMDDHHMMSS_description.sql
```

The prefix is parsed as a timestamp, everything after the first underscore becomes the description (underscores → spaces).

## Pricing

Schemalog is free for open source repositories. For private repos, a Pro tier is planned ($9/mo). Currently everything is free during v1.

## GitHub Action

```yaml
# .github/workflows/schemalog.yml
name: Database Changelog
on:
  pull_request:
    paths: ["migrations/**/*.sql"]
jobs:
  changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install -g schemalog
      - run: schemalog generate
        env:
          SCHEMALOG_API_KEY: ${{ secrets.SCHEMALOG_API_KEY }}
```

## License

MIT
