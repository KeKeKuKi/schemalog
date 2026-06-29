# Ghost CMS 有 12 张表、80+ 个字段。你知道每个字段是什么意思吗？

Ghost 是全球最知名的开源博客平台，GitHub 3 万+ Star，服务着数百万博客。

它的数据库经历了 10 年演变——从 2015 年的 `posts` 和 `users` 两张表开始，到 2025 年 v6.0 大改版。8 次迁移，12 张表，80+ 字段，外加 Stripe 支付、邮件追踪、会员系统。

**这些迁移全在 `migrations/` 目录里，但没有一行注释解释每个字段是干什么的。**

---

## 你能回答这些问题吗？

打开 Ghost 源代碼裡的迁移文件，随便找一条：

```sql
ALTER TABLE posts DROP COLUMN created_by;
ALTER TABLE posts DROP COLUMN updated_by;
ALTER TABLE users DROP COLUMN created_by;
ALTER TABLE users DROP COLUMN updated_by;
ALTER TABLE tags DROP COLUMN created_by;
ALTER TABLE tags DROP COLUMN updated_by;
ALTER TABLE settings DROP COLUMN created_by;
ALTER TABLE settings DROP COLUMN updated_by;
ALTER TABLE members DROP COLUMN created_by;
ALTER TABLE members DROP COLUMN updated_by;
```

这是安全的清理还是危险的破坏？`created_by` 为什么要删？`updated_by` 被什么替代了？

再比如 `posts` 表里这些字段：

```sql
`type` VARCHAR(50) DEFAULT 'post'
`status` VARCHAR(50) DEFAULT 'draft'
`visibility` VARCHAR(50) DEFAULT 'public'
`locale` VARCHAR(6)
```

`type` 的取值有哪些？`status` 是 `draft/published` 还是 `active/inactive`？`visibility` 的 `public/members/paid` 三态什么时候加的？`locale` 为什么是 6 个字符？

没有人能立刻回答。答案散落在代码、Git 历史、和老员工的记忆里。

---

## 我用一个命令解决了这个问题

```bash
$ schemalog generate
$ schemalog dict
```

30 秒，8 条迁移全部分析完毕。这是它生成的输出：

### 1. 迁移历史一览

直接告诉你哪些是安全的、哪些有风险：

| # | 时间 | 变更 | 风险 |
|---|------|------|------|
| 1 | 2015-09-15 | Create posts | 🟢 safe |
| 2 | 2015-09-15 | Create users | 🟢 safe |
| 3 | 2015-09-15 | Create tags + posts_tags | 🟢 safe |
| 4 | 2016-04-22 | Create settings + 初始数据 | 🟢 safe |
| 5 | 2019-05-22 | Create members (会员系统) | 🟢 safe |
| 6 | 2020-06-15 | Stripe 支付 + subscriptions | 🟢 safe |
| 7 | 2023-05-23 | Email 追踪系统 | 🟢 safe |
| 8 | 2025-07-22 | **🔴 删除 10 个 deprecated 字段** | 🔴 danger |

第 8 条迁移被自动标红——删了 10 个字段，5 张表。在一个 10 年的项目里，这种操作不应该悄无声息地通过。

### 2. 每条迁移的解读

```
Analyzing: 20150722191500_v6_cleanup_deprecated_fields.sql
  🔴 danger  — Removes deprecated created_by and updated_by columns
               from posts, users, tags, settings, and members,
               plus deletes AMP settings.
  ⚠️  10 local danger(s) detected
```

不只告诉你"这次迁移删了字段"，还告诉你为什么要删（`created_by/updated_by` 被 Ghost 6.0 的 Action Log 替代了）——这些是 AI 从 SQL 里推断出来的。

### 3. 完整数据字典

12 张表，每一张都有解释。例如 `posts` 表：

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(24) | Primary key, unique identifier |
| `uuid` | VARCHAR(36) | Universally unique identifier |
| `title` | VARCHAR(2000) | Post title |
| `slug` | VARCHAR(191) | URL-friendly version of title |
| `mobiledoc` | TEXT | Content in Mobiledoc format |
| `html` | TEXT | Rendered HTML content |
| `plaintext` | TEXT | Plain text version |
| `type` | VARCHAR(50) | 'post' or 'page' |
| `status` | VARCHAR(50) | 'draft', 'published', 'scheduled' |
| `visibility` | VARCHAR(50) | 'public', 'members', 'paid' |
| `locale` | VARCHAR(6) | Language locale (e.g. 'en', 'zh-CN') |

80 多个字段，每一个都有 AI 推断的含义和枚举值。

---

## 这不是 Ghost 的问题，是你的问题

Ghost 是一个设计精良的项目。但即使是最好的项目，数据库文档也是会腐烂的。

你的项目也一样。每发一个版本，`migrations/` 目录就多几个 `.sql` 文件。
三个月后，`user_status` 和 `account_state` 有什么区别？没人说得清楚。

这不是缺人写文档，是**人不应该做这种事**。SQL 迁移是机器可读的，翻译成人话这件事，AI 天生就该做。

---

## Schemalog — 你的数据库文档从此不再说谎

```bash
npm install -g schemalog

cd your-project
schemalog init --dir migrations --provider deepseek
schemalog generate       # → SCHEMA.md
schemalog dict           # → DATA_DICTIONARY.md
```

**支持的命名格式**：`YYYYMMDD_description.sql` 或 `YYYYMMDDHHMMSS_description.sql`（Supabase / Drizzle / Flyway / 手写 SQL 都可以）

**AI Provider**：DeepSeek（国内支付宝充值，¥1/百万 tokens，一次分析几分钱）或 OpenAI

**增量缓存**：第二次运行不再调用 AI，零成本秒出结果。

**危险检测**：DROP TABLE / DROP COLUMN / ALTER TYPE 自动标红。

**GitHub Action**：PR 包含 SQL 迁移 → 自动评论 changelog。

---

**npm**: [npmjs.com/package/schemalog](https://www.npmjs.com/package/schemalog)
**源码**: 即将开源
**作者**: [@hamapipi](https://www.npmjs.com/~hamapipi)
