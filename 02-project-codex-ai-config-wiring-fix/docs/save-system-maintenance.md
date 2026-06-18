# 存档系统维护规范

## 1. 当前结论

前端当前采用单槽自动存档。存档真值是 `SaveGameV1`，持久化位置是浏览器 `localStorage` 中的 Zustand persist envelope。

- 存储 key：`SAVE_GAME_STORAGE_KEY = 'palace-galgame-flow'`
- envelope 结构：`{ state: { saveGame: SaveGameV1 }, version: number }`
- schema 构建 / 读写文件：`src/game/save/saveGameV1.ts`
- schema 版本、storage key、必需字段清单和默认进度块配置：`src/game/save/saveGameConfig.ts`
- store 接入：`src/game/store/gameFlowStore.ts`
- 启动页入口：`src/views/StartScene.tsx` 与 `src/App.tsx`
- 当前仍处开发阶段，存档不做跨结构迁移。只要 `SaveGameV1` 字段结构与当前代码不匹配，就直接删除旧 envelope，回溯显示无可用存档；不要写旧字段到新字段的 fallback。

## 2. 启动页语义

启动页四个按钮当前语义如下：

| 按钮 | 当前状态 | 规则 |
|---|---|---|
| 开始 | 已接入 | 先弹二级确认；确认后清空旧存档，重建初始状态，进入路线选择，并由 persist 写入新存档 |
| 前尘 | 未接入 | 只保留按钮文案，尚无成就 / 结局 / 前世记录系统 |
| 回溯 | 已接入 | 读取上一次 `SaveGameV1`，按存档进度恢复到路线选择、属性页、地图或寝殿 |
| 设置 | 未接入 | 只保留按钮文案 |

## 3. 存档边界

`SaveGameV1` 只保存长期真值，不保存瞬时 UI：

- 不保存：`currentView`、弹窗、正在显示的对白、地图临时事件文本、briefing。
- 必须保存：玩家数值、隐藏数值、时间、路线、妃嫔、库存、交易记录、关系进度、地点进度、侍寝进度、旬月通报、宫斗案件。
- NPC 旬级行动和 NPC-NPC 关系矩阵属于长期真值：它们决定本旬玩家能在何处遇到谁、谁在谁殿内同场、以及旬末 NPC 关系如何变化。
- `progress.npcActivity.entries` 中未收束的 `visit-consort.targetConsortId` 表示目标妃嫔本旬在自己寝宫会客；读档恢复或 UI 重建时不得因为目标自己的旧公共外出条目或特殊住址导致她从寝宫消失。玩家结束这次会客后，该 `visit-consort` 标记为 `resolved=true`，来访妃嫔回自己的寝宫，目标不再显示“会客中”。公共外出的 `resolved=true` 只表示已交谈，NPC 仍留在原目的地。
- `progress.craftWorks.activeWorks` 保存绣花、字画、调香进行中作品。作品进度、制作次数、成色评分、开始时间和最近制作时间属于长期真值；完成品进入 `inventory.items`，可送礼或变卖。缺少该进度块的旧存档视为不兼容。
- `cases.palaceStrifeCases` 中每个宫斗案件必须保存 `suspects` 数组。v0.5.1 起，案件裁判以嫌疑人独立 `suspicionRate` 为准，`convictionRate` 只是最高定案率展示值；缺少 `suspects` 的旧案件视为不兼容存档。
- `cases.pendingYangxinVerdict` 保存玩家相关待裁断案的养心殿对话事件状态。它是长期真值，因为刷新后仍必须继续“传唤 / 发言 / 选择 / 裁断”流程，不能退回娇娇通报或直接结案。
- 读取存档后，UI 阶段由 `resolveResumeViewFromSave` 从 durable state 推断。

当前恢复规则：

- 没有 `selectedRoute`：恢复到路线选择。
- 有路线但未完成开场引导：恢复到属性页。
- 已完成开场但未完成地图引导：恢复到地图。
- 已完成地图引导：恢复到寝殿。

## 4. 新局规则

开始新游戏必须调用 `startNewGame()`，不能只做 `setCurrentView('route-selection')`。

`startNewGame()` 必须：

- 删除 `SAVE_GAME_STORAGE_KEY` 对应的旧 envelope。
- 从初始状态重建 store，而不是以旧局 state 为底板。
- 清空时间、通报、案件、侍寝、库存、交易、关系、地点进度、临时文本和自定义妃嫔。
- 进入 `route-selection`。
- 依靠 Zustand persist 写入新的 `SaveGameV1`。

## 5. 回溯规则

回溯必须调用 `resumeLastSave()`。

`resumeLastSave()` 必须：

- 只从 `readSaveGameV1FromStorage()` 读取 `SaveGameV1`。
- 读取失败或发现结构不兼容时删除旧 envelope，留在启动页，并给出“暂无可回溯的存档。”。
- 读取成功后先走 `restoreSaveGameV1Fields()`，再根据 durable state 推断目标视图。
- 不恢复瞬时对白、弹窗和临时地图事件。
- 不做旧结构迁移，例如 `music -> talent`、旧住处名归一、缺失长期进度字段补默认值都不应存在；这些情况通过清档解决。

## 6. 维护要求

以后凡是新增会影响长期玩法的字段，都必须同步处理：

- 加入 `SaveGameV1Source` 与 `SaveGameV1`。
- 如果新增长期进度块或必需 section，需要同步更新 `saveGameConfig.ts` 的必需字段清单和默认进度块。
- 如果字段结构变化会影响旧存档正确性，提升 `SAVE_GAME_SCHEMA_VERSION` 或收紧 `isSaveGameV1()` 校验，使旧 envelope 自动失效并被删除。
- 在 `buildSaveGameV1()` 写入。
- 在 `restoreSaveGameV1Fields()` 读取。
- 在 `createInitialGameFlowFields()` 与 `applyRouteSelection()` 的新局路径中重置。
- 在 `gameFlowStore.save.test.ts` / `saveGameV1.test.ts` 覆盖导出、读取、新局清空、回溯恢复或不兼容存档清除。
- 更新本文档、`docs/game-state-model.md` 与必要的 `docs/game-system-breakdown.md`。不要再同步旧 handoff 总文档。

当前长期进度字段补充：

- `progress.palaceBanquet`：系统宫宴真值。保存当前宫宴季、曲谱报名快照、报名开启提醒去重标记、已结算宫宴季和最近一次宫宴结果；缺失则视为不兼容存档。
- `progress.musicHall.musicScoreMastery`：曲谱长期学习真值。按曲谱 `itemId` 保存难度、完成度、练习次数、表现上限、最近一次练习预演表现分和最近练习时间；若后续结构变化，清旧档而不是反向推断。
- `progress.craftWorks`：绣花 / 字画 / 调香作品真值。`SaveGameV1` schema `4` 起为必需字段；缺失则视为不兼容存档，不从背包或寝殿行动反推。
- `progress.npcActivity`：当前旬 NPC 行动表。缺失则视为不兼容存档，不能在恢复阶段临时生成来迁移旧档。
- `relations.npcRelationMatrix`：NPC-NPC 双向关系矩阵。缺失则视为不兼容存档，不能在恢复阶段补 `{}` 来迁移旧档。
- `cases.palaceStrifeCases[].suspects`：宫斗调查嫌疑人列表。缺失则视为不兼容存档，不能把旧 `convictionRate` 反推成单一嫌疑人来迁移旧档。
- `cases.pendingYangxinVerdict`：当前养心殿裁断事件。`SaveGameV1` schema `2` 起为必需字段，可为 `null`；缺失则视为不兼容存档。
