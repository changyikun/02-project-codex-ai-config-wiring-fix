# 文档维护索引

本目录现在按“主源文档 + 专项文档 + 归档文档”维护。后续改动不要把同一条规则复制到所有文档中。

## 当前维护文档

| 文档 | 用途 | 维护规则 |
| --- | --- | --- |
| `new-chat-start.md` | 新对话 / 新开发者接手入口 | 只维护读取顺序和文档边界 |
| `game-state-model.md` | 状态字段、属性口径、存档真值 | 状态模型主源 |
| `game-system-breakdown.md` | 前端、runtime、配置、测试的实现地图 | 架构地图主源 |
| `save-system-maintenance.md` | 存档 schema、启动 / 回溯、清档规则 | 存档专项主源 |
| `palace-strife-architecture.md` | 宫斗、调查、裁断专项设计 | 宫斗专项主源 |
| `nightly-pregnancy-architecture.md` | 侍寝、怀孕专项设计 | 侍寝专项主源 |
| `emperor-behavior-architecture.md` | 皇帝日间行为、心情、养心殿互动 | 皇帝专项主源 |
| `rank-governance-architecture.md` | 位分、降位、冷宫、权限 | 位分专项主源 |
| `economy-governance-architecture.md` | 月俸、用度、银两干预、宫务开销 | 经济专项主源 |
| `imperial-heir-architecture.md` | 皇嗣管理、生育后续 | 皇嗣专项主源 |
| `fixed-romance-npc-profiles.md` | 固定可攻略 NPC 人设设定 | 角色设定主源 |
| `routes/*` | 路线专项剧情 / 设定 | 路线专项源 |

## 归档文档

`docs/archive/` 下的文件只保留历史设计背景，不再维护。归档文档与当前维护文档冲突时，以当前维护文档为准。

归档分区：

- `archive/legacy-rules/`：旧规则稿、自然语言稿、旧 B 版宫斗稿。
- `archive/legacy-ai/`：当前玩法未接入的旧 AI 接口 / Foundation 接口说明。
- `archive/proposals/`：世界记忆、persona 等历史 proposal。
- `archive/retired-overviews/`：过度膨胀的总交接 / 总规则文档，已停止维护。

## 修改写入规则

- 版本摘要写 `CHANGELOG.md`。
- 单次任务证据写 `codex-workdocs/`。
- 状态 / 存档字段写 `game-state-model.md` 和 `save-system-maintenance.md`。
- 代码结构和模块边界写 `game-system-breakdown.md`。
- 玩法规则只更新对应专项 `*-architecture.md`，不要再维护单一总规则文档。
- 新对话入口只维护 `new-chat-start.md`，不要再维护巨型 handoff 文档。

不要因为一次玩法修改而同时改所有文档；只有该文档的职责确实被影响时才更新。
