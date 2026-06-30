# Show HN: Schemalog — AI reads your SQL migrations and writes changelogs humans can understand

Hi HN,

Every project I join follows the same pattern: the `migrations/` directory grows file by file, sprint by sprint, and after six months nobody knows what half the columns actually mean.

`user_status` vs `account_state`? `visibility = 'members'` vs `visibility = 'paid'`? Good luck finding anyone who remembers.

So I built **Schemalog**. Point it at your migration directory, it scans every `.sql` file, sends them to an LLM (DeepSeek or OpenAI), and generates:

- **SCHEMA.md** — a chronological changelog describing every migration in plain English, with automatic danger detection (DROP TABLE/COLUMN = 🔴 danger)
- **DATA_DICTIONARY.md** — every table, every column, with AI-inferred descriptions and enum values

Incremental caching means only new/changed migrations hit the API. After the first run, subsequent runs are free and instantaneous.

**Quick demo** — I ran it on Ghost CMS's 8 migrations spanning 10 years. 30 seconds, ~¥0.02 in API costs:

```
$ schemalog generate
Analyzing 8 migration(s)…
  ✅ 20150915_create_posts.sql       🟢 safe
  ✅ 20150915_create_users.sql       🟢 safe
  ✅ 20150915_create_tags.sql        🟢 safe
  ✅ 20160422_create_settings.sql    🟢 safe
  ✅ 20190522_create_members.sql     🟢 safe
  ✅ 20200615_create_subscriptions.sql 🟢 safe
  ✅ 20230523_add_email_tracking.sql 🟢 safe
  ✅ 20250722_v6_cleanup.sql         🔴 danger — 10 DROP COLUMNs detected
```

There's also a GitHub Action that comments the changelog on every PR containing SQL changes.

**Why not just write docs manually?** Because they rot. The migration files are the single source of truth — they're what actually hits the database. Schemalog reads the truth and translates it.

npm: `npm install -g schemalog`
Source: https://github.com/KeKeKuKi/schemalog
DeepSeek key needed (¥1/million tokens, each analysis costs a few cents)

Feedback welcome. This is v1 — I'd love to hear what would make this useful for your workflow.
