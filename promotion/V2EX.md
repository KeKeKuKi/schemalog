# 把你的 SQL 迁移文件变成人话 —— 一个 AI CLI 工具

## 问题

每个维护过数据库的人都知道这种感觉：

```
migrations/
├── 20230301_create_users.sql
├── 20230315_add_posts.sql
├── 20230422_add_comments.sql
├── 20230601_user_roles.sql
├── 20230815_add_email_tracking.sql
├── 20231120_subscriptions.sql
├── 20240201_refactor_user_status.sql
├── 20240510_cleanup_deprecated.sql
└── ... (还有 20 个)
```

三个月后，新人问你："`user_status = 2` 是什么意思？"你打开代码、翻 Git 历史、问老同事……十分钟过去了。

**迁移文件是数据库唯一的真相来源，但它只写给机器看。**

## 我做了什么

写了个 CLI 工具，叫 **Schemalog**。它扫描你的 `migrations/` 目录，用 AI 读每条 SQL，然后生成两份文档：

1. **SCHEMA.md** — 每条迁移的时间线、做了什么、有什么风险
2. **DATA_DICTIONARY.md** — 每张表、每个字段的含义和枚举值

用 Ghost CMS 的 8 条迁移跑了一遍，30 秒出结果：

```
$ schemalog generate
  1. 2015-09-15  Create posts                           🟢 safe
  2. 2015-09-15  Create users                           🟢 safe
  3. 2015-09-15  Create tags                             🟢 safe
  4. 2016-04-22  Create settings + 初始数据               🟢 safe
  5. 2019-05-22  Create members (会员系统)               🟢 safe
  6. 2020-06-15  Stripe 支付 + subscriptions            🟢 safe
  7. 2023-05-23  Email 追踪系统                          🟢 safe
  8. 2025-07-22  🔴 删除 10 个 deprecated 字段            🔴 danger
```

第 8 条被自动标红 —— DROP COLUMN × 10，跨 5 张表。这种操作不应该悄悄通过 code review。

## 实际输出

`schemalog dict` 生成的 `posts` 表数据字典：

| 字段 | 类型 | 解释 |
|------|------|------|
| `type` | VARCHAR(50) | 'post' 或 'page' |
| `status` | VARCHAR(50) | 'draft', 'published', 'scheduled' |
| `visibility` | VARCHAR(50) | 'public', 'members', 'paid' |
| `locale` | VARCHAR(6) | 语言区域，如 'en', 'zh-CN' |
| `mobiledoc` | TEXT | Mobiledoc 格式的富文本内容 |

80 多个字段，每个都有 AI 推断的含义。这就是那种"写起来烦、但有了就离不开"的文档。

## 怎么用

```bash
npm install -g schemalog

cd your-project
schemalog init --dir migrations --provider deepseek
schemalog generate       # → SCHEMA.md
schemalog dict           # → DATA_DICTIONARY.md
```

**AI 选型**：默认用 DeepSeek（¥1/百万 tokens，分析一次几分钱），也支持 OpenAI。

**增量缓存**：SHA256 对比，已经分析过的迁移不重复调用 AI，第二次运行零成本。

**GitHub Action**：PR 里改动了 SQL 文件 → 自动在 PR 下评论 changelog。

## 关于我

我是后端开发，这个工具最初是给自己用的。如果它能帮到你，我会很高兴；如果有什么想要的 feature，欢迎提 issue。

- npm: https://www.npmjs.com/package/schemalog
- GitHub: https://github.com/KeKeKuKi/schemalog
