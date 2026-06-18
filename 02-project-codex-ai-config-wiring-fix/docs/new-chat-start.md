# 新对话接手入口

本文件只负责说明后续 Codex 或开发者应该先读哪些仍在维护的文档。`docs/archive/` 下的文件是历史资料，不再作为当前开发规则源维护。

## 1. 先读当前文档索引

1. `docs/README.md`
2. `CHANGELOG.md` 最新版本段
3. 与任务直接相关的专项文档

如果本轮是代码实现，还需要先看当前 dirty worktree，避免覆盖未提交改动。

## 2. 当前权威文档

按问题类型读取，不要把同一规则同步写入所有文档：

| 问题类型 | 读取 / 维护文档 |
| --- | --- |
| 状态字段、属性口径、存档真值 | `docs/game-state-model.md` |
| 前端 / runtime / 配置架构 | `docs/game-system-breakdown.md` |
| 存档入口、schema、清档规则 | `docs/save-system-maintenance.md` |
| 宫斗专项 | `docs/palace-strife-architecture.md` |
| 侍寝 / 怀孕专项 | `docs/nightly-pregnancy-architecture.md` |
| 皇帝行为专项 | `docs/emperor-behavior-architecture.md` |
| 位分 / 冷宫 / 权限专项 | `docs/rank-governance-architecture.md` |
| 经济 / 宫务专项 | `docs/economy-governance-architecture.md` |
| 皇嗣专项 | `docs/imperial-heir-architecture.md` |
| 固定角色人设 | `docs/fixed-romance-npc-profiles.md` |

## 3. 配置表说明

- 剧情 CSV：`src/game/narrative/csv/README.md`
- 数值 CSV：`src/game/numerics/csv/README.md`
- 公式页：`src/game/numerics/formula-pages/`

剧情正文和演出元数据以剧情 CSV 为当前唯一来源；核心可调数值以 numerics CSV 为来源；公式如果要配置化，必须写在公式页并通过解析器执行。

## 4. 归档文档规则

`docs/archive/` 下的文件只用于追溯历史设计，不再同步后续修改。若归档文档与当前权威文档冲突，以当前权威文档为准。

`docs/archive/retired-overviews/codex-dialogue-handoff.md` 和 `docs/archive/retired-overviews/system-hard-rules-integrated.md` 已停止维护，不再作为新对话接手入口或当前规则源。

需要重新启用某个归档文档时，先把它移出 `docs/archive/`，再在 `docs/README.md` 中登记新的维护职责。

## 5. 每次改动后的最小验证

```powershell
npx tsc --noEmit
npx vitest run src/__tests__/app-flow.test.tsx
npm run build:web
```

视改动范围补充专项测试。若只改文档，可以至少运行 `git diff --check`。

## 6. Changelog 维护规则

- `CHANGELOG.md` 按版本更新，不再按日期新增章节。
- 新增内容只写入最新版本章节；除格式迁移外，不回改旧版本章节。
- 如果最新版本中后续修正了该版本里已经写过的条目，不覆盖原条目原文；在最新版本末尾追加修订记录，格式为：`版本号 - 修改内容简述 - 见第 N 条`。
- 每个版本内主要变更使用编号条目，便于后续修订记录引用。
