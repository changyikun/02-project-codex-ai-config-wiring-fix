# Codex 工作交接说明（统一版）

本文件用于让后续 Codex 对话快速接手当前项目状态。它合并了此前的对话系统交接与当前前端 / 规则交接，后续不要再并行维护多份同类 handoff。

项目根目录：

- `/Users/a1234/Desktop/02-project-codex-ai-config-wiring-fix`

## 1. 新对话先读什么

建议按这个顺序读取：

1. `docs/new-chat-start.md`
2. `.codex/skills/palace-game-frontend/SKILL.md`
3. `.codex/skills/palace-game-frontend/references/current-frontend-state.md`
4. `docs/codex-dialogue-handoff.md`
5. 如涉及系统规则，再读：
   - `docs/system-hard-rules-integrated.md`
   - `docs/rank-governance-architecture.md`
   - `docs/game-design-natural-language.md`
6. 如涉及剧情文本、系统提示词、角色对白或场景生成，再读：
   - `docs/character-dialogue-system-patch.md`

## 2. 当前必须保持的主流程

现有前端主链路仍然是：

1. `StartScene`
2. `RouteSelectionView`
3. `AttributeAssignmentView`
4. `OpeningDialogueView`
5. `MapMainView`
6. `ChamberMainView`

不要打断这条链。

## 3. 当前必须保持的基础约束

- 游戏是 `16:9` 横向舞台。
- 布局主体仍是 stage-style 的 `absolute + z-index`，不是普通页面流。
- `PalaceStatusBar` 仍是右上角常驻组件。
- 宫廷对话框必须保留现有古风边框和舞台式布局，不要替换成通用聊天框。
- 数值、判定、流程推进全部走本地硬规则。
- AI 只负责：
  - 文本润色
  - 叙事包装
  - 对话意图分类
- 即使 AI 不可用，主流程也必须跑通。

## 4. 当前已经完成的关键改动

### 4.1 工程清理

- 已删除一批确认未使用的根目录临时残留与旧 CSS 废段。
- `src/index.css` 已做过一轮保守修剪。
- `readme.md` 中“寝殿仍是预留入口”的旧描述已更新。

### 4.2 旬末 / 月末通报骨架

- `src/game/store/gameFlowStore.ts` 已接入旬报、月报、月俸与纪事留档。
- `src/views/ChamberMainView.tsx` 已接入娇娇通报弹层。
- `src/components/chamber/ChamberUtilityViews.tsx` 已把通报写入纪事页。

注意：月报已经不是纯占位，当前会记录账册、位分推进和迁宫结果。

### 4.3 寝殿与地图切换语义

- 从地图点进玩家自己的宫殿，不再进入空白外景，而是回到正常寝殿主界面。
- 外景左侧现在保留 `外出`，其语义始终是“回地图视角”。
- 外景左侧新增独立 `回宫` 快捷按钮，语义始终是“直接回寝殿”。

核心文件：

- `src/views/ChamberMainView.tsx`
- `src/views/MapMainView.tsx`

### 4.4 玩家住处已真正落地

- `state.residenceName` 现在是玩家当前住处的唯一前端真值来源。
- 地图上的“寝殿热点”不再固定写死为 `椒房殿`，而是根据 `state.residenceName` 动态生成。

### 4.5 开局年龄与用度说明

- `AttributeAssignmentView` 的年龄不再使用随机按钮，改为 `AGE_RANGE` 范围内的加减步进调整。
- 开场用度选择仍只有三档会写入 `monthlyExpenseStrategy`：`节衣缩食 / 量入为出 / 锦衣玉食`。
- 开场对话新增第四个说明入口 `先问清用度`，由当前说话人按显式分页解释三档月度开销含义；该选项不写状态、不进入地图，说明结束后本地返回用度选择。
- `ChamberUtilityViews` 中家族事务已在函数入口早退，后续宫斗 / 朝堂事务逻辑不再重复判断 `家族事务`，避免 TypeScript 收窄告警。
- 点击地图上的当前住处，会直接等同 `回宫`，不会先弹“进入此处”确认。
- 后宫布局里，玩家会按当前住处落到对应宫殿 / 主殿。

相关文件：

- `src/config/palaceUi.ts`
- `src/views/MapMainView.tsx`
- `src/components/consorts/HaremPalaceView.tsx`

### 4.5 位分推进与迁宫规则已接入月结算

- 当前位分不再完全静态。
- 月结算时，会按声望计算目标位分，再按“每月最多 2 级”推进。
- 位分推进后，会同步重排玩家住处。
- 月俸发放也改为按当前实际位分口径，而不是只按声望即时映射。

当前实现位置：

- `src/game/lib/rankRuntime.ts`
- `src/game/store/gameFlowStore.ts`

### 4.6 对话系统共享化与稳定性

- Opening / map guide / chamber guidance / consort audience / kitchen / tai hospital / miao yin hall / dowager 场景都应复用共享对话框体系。
- 对话框位置、大小、边距、文本区域、说话人区域、按钮区域、选项区域的共享布局已稳定。
- 长文本不再硬截断，对话框固定，文本区域滚动。
- 点击对话内容区会立刻补全文字机当前句。

共享入口：

- `src/components/dialogue/PalaceDialogueBox.jsx`
- `src/components/dialogue/GlobalDialogueStage.tsx`
- `src/index.css`

### 4.7 AI 对话等待态与 fallback 修复

- 已加入本地“回应中”过渡态，避免选项点击后界面像死掉。
- 修过多处 timeout / fallback 回弹到旧选项的问题。
- 修过 NPC 无法顺利收束对话的问题。
- `先行告退` 只在妃嫔对话场景保留，不应泛化到其他侧栏场景。

### 4.8 同 NPC 跨场景短记忆连续性

这是当前后端对话系统里最重要的 handoff 之一。

之前的问题：

- 同一 NPC 在不同场景里使用了不同 `sessionId / sceneId`
- 后端短记忆按场景级 id 分桶
- 结果是同一 NPC 跨场景不记得前面对话

当前修复：

- 短期记忆按 NPC 级别聚合
- `saveId` 仍然按存档隔离
- `npcId` 是真正身份锚点
- `sessionId` 规范成 `session:${npcId}`
- `sceneId` 规范成 `npc-shared:${npcId}`

核心后端文件：

- `server/src/modules/ai/dialogueOrchestrator.ts`

后续若继续做跨场景记忆，必须复用这个 NPC 级锚点，不要再引回 scene-specific memory bucketing。

## 5. 现在什么字段才是准的

### 5.1 玩家住处

以 `state.residenceName` 为准。

它现在会驱动：

- 地图寝殿热点
- 回宫逻辑
- 寝殿标题
- 后宫中玩家所在宫殿显示
- 部分通报文本

### 5.2 玩家当前位分

当前前端是用 `hiddenStats.initialRank` 承载“当前被跟踪的玩家位分标签”。

这意味着：

- 它已经不再只是“开局初始位分”的静态含义。
- 月结算后它会被更新。
- 若后续要做更干净的结构，建议拆成 `currentRankLabel` 与 `openingRankLabel` 两个字段，不要长期复用 `initialRank`。

在做新功能前，必须先意识到这一点，否则很容易把它误当成纯初始配置字段。

### 5.3 地图上的当前寝殿

地图热点现在来自 `buildMapHotspots(state.residenceName)`。

不要再写死：

- “玩家寝殿一定是 `椒房殿`”
- “点击宫殿都必须先弹进入确认”

这两个口径都已经过时。

### 5.4 同 NPC 的跨场景连续性

若两个场景中的同一人物没有共用稳定 `consortContext.id`，记忆仍然会裂开。

后续扩 NPC 时，先确保：

- 同一叙事角色复用同一个 `npcId`
- 不要给同一人不同场景造不同身份锚点

## 6. 当前对话系统的共享结构

### 6.1 共享 UI 入口

优先使用：

- `src/components/dialogue/PalaceDialogueBox.jsx`
- `src/components/dialogue/GlobalDialogueStage.tsx`
- `src/index.css`

这些场景应继续复用共享盒子 / 舞台结构，只允许做轻量场景修饰：

- opening
- map guide
- chamber guidance
- consort audience
- kitchen
- tai hospital
- miao yin hall
- dowager / other chamber NPC scenes

### 6.2 CSS authority

对话框几何与共用视觉，当前实质上由 `src/index.css` 底部共享 override 区块控制。

如果后续要改：

- 对话框位置
- 选项高度
- 说话人条
- 文本板
- 内容滚动

先查共享变量，不要优先加新的场景局部偏移。

## 7. 本轮新增的保守规则口径

### 7.1 位分推进

- 目标位分：按 `prestige` 查表
- 实际位分：每月最多向目标推进 2 级

### 7.2 当前迁宫口径

这是保守版本，不是最终完整宫规：

- `皇后`：`椒房殿`
- `妃` 及以上：走各路线的 `high`
- `才人` 到 `贵嫔`：走各路线的 `mid`
- `答应` 到 `美人`：走各路线的 `low`
- 更低位或失势：走各路线的 `exile`

路线对应表现在写在 `src/game/lib/rankRuntime.ts` 的 `PLAYER_RESIDENCE_PLAN_BY_ROUTE` 里。

后续若要扩展，请优先把它升级成文档驱动或配置表驱动，不要把更多条件散写进 UI。

## 8. 目前已知边界，不要误判为已完成

以下内容还没有完整接好：

- 宫殿空位竞争
- NPC 与玩家迁宫冲突处理
- 皇帝心情对晋升的限制
- 皇后 / 皇贵妃特殊位的完整规则
- 冷宫、处罚、案件、怀孕对位分和住处的联动
- 完整的“主殿 / 侧殿 / 偏殿”分配规则
- 完整的 belief / rumor / world_state 平台仍未搭建

也就是说，当前是：

- 玩家位分推进
- 玩家迁宫
- 地图与后宫同步
- 同 NPC 跨场景短记忆连续
- 最小长期 relation memory 闭环

这些已经成立，但完整后宫权力分配系统和完整 memory/world 平台都还没完成。

## 9. 后续最适合继续做的方向

优先级建议：

1. 宫殿空位与占位冲突规则
2. 玩家 / NPC 共用的迁宫分配器
3. 当前位分字段从 `hiddenStats.initialRank` 中正式拆出
4. 皇帝心情与晋升资格硬门
5. 月结算中的冷宫 / 处罚 / 案件联动
6. 审核所有 recurring NPC 的 id，保证跨场景记忆不分裂

如果只做前端交互，优先补：

1. 月报中的位分与迁宫 UI 呈现
2. 地图上当前住处更明确的视觉标识
3. 后宫宫殿布局中玩家居所的单独说明
4. 如果对话框几何再次漂移，先回收共享变量，不要继续堆场景局部样式

## 10. 当前改动涉及的关键文件

前端与规则：

- `src/game/store/gameFlowStore.ts`
- `src/game/lib/rankRuntime.ts`
- `src/game/types.ts`
- `src/config/palaceUi.ts`
- `src/views/MapMainView.tsx`
- `src/views/ChamberMainView.tsx`
- `src/components/consorts/HaremPalaceView.tsx`
- `src/components/chamber/ChamberUtilityViews.tsx`
- `src/index.css`
- `src/__tests__/app-flow.test.tsx`

对话 UI / runtime：

- `src/components/dialogue/PalaceDialogueBox.jsx`
- `src/components/dialogue/GlobalDialogueStage.tsx`
- `src/components/consorts/ConsortAudiencePanel.tsx`
- `src/components/chamber/KitchenView.tsx`
- `src/components/chamber/TaiHospitalView.tsx`
- `src/components/chamber/HuaQingPoolView.tsx`
- `src/components/chamber/BaohuaHallView.tsx`
- `src/components/chamber/MiaoYinHallView.tsx`
- `src/components/chamber/DowagerAudiencePanel.tsx`
- `src/game/lib/consortDialogueRuntime.ts`
- `src/game/lib/kitchenDialogueRuntime.ts`
- `src/game/lib/taiyiDialogueRuntime.ts`

后端：

- `server/src/modules/ai/dialogueOrchestrator.ts`
- `server/src/modules/ai/consortDialogueService.ts`
- `server/src/modules/memory/sessionMemoryService.ts`
- `server/src/modules/memory/sessionMemoryStore.ts`

## 11. 每次接手后的最低验证

如果改了前端主流程 / 地图 / 寝殿 / 后宫：

```bash
npx vitest run src/__tests__/app-flow.test.tsx
npm run build:web
```

如果改了 dialogue backend / short memory：

```bash
npm run build
npx vitest run server/tests/unit/consortDialogueService.test.ts
```

若是地图 / 寝殿 / 后宫 UI 改动，最好再人工刷新本地预览确认：

- `http://127.0.0.1:4173/`

## 12. 给后续 Codex 的建议起手句

```text
先读取 docs/new-chat-start.md、.codex/skills/palace-game-frontend/SKILL.md、docs/codex-dialogue-handoff.md，再继续当前凤华录项目的前端、本地硬规则和共享对话系统开发。优先遵守现有地图/寝殿语义、玩家当前住处动态映射、月结算中的位分推进与迁宫逻辑，以及同 NPC 跨场景短记忆连续性。
```

## 13. 本次会话操作总结（2026-05-09）

这次会话的主线不是重做平台，而是在现有 `relationCandidate + session memory` 基础上，开始补最小长期关系闭环。

### 13.1 已经落进代码的内容

后端新增了一个轻量、纯内存的长期关系层骨架：

- `server/src/modules/memory/relationMemoryTypes.ts`
- `server/src/modules/memory/relationMemoryStore.ts`
- `server/src/modules/memory/relationMemoryService.ts`
- `server/src/modules/ai/relationPromotion.ts`

当前闭环设计是：

1. AI / system 先产出结构化 `relationCandidates`
2. 本轮先写进 `sessionMemory.recentRelationCandidates`
3. 再由 `reviewRelationCandidatesForPromotion(...)` 做规则审批
4. 通过审批的候选写入 `RelationMemoryService`
5. 响应里透出 `relationMemory` debug 信息，供 runtime / trace 观察

### 13.2 本轮补到代码层的规则

promotion 目前完全是规则优先，没有引入 AI 审批器。

当前显式规则包括：

- `promotable !== true` 不升格
- `sourceEventId` 缺失不升格
- `confidence < 0.68` 不升格
- `importance === low` 不升格
- 相同 `dedupeKey` 不重复写长期 memory
- tool NPC 只允许 `boundary / preference`
- 长期关系只开放最小稳定集合：
  - `familiarity`
  - `trust`
  - `affinity`
  - `dependency`

当前 candidateType 到长期关系的最小映射是：

- `boundary -> familiarity`
- `conflict -> trust`
- `gift / preference -> affinity`

`rapport / promise` 暂时不进入长期 relation memory。

### 13.3 已改动的关键文件

除上面新增文件外，这轮还改了这些主链路文件：

- `server/src/types/contracts.ts`
- `server/src/types/schemas.ts`
- `server/src/modules/ai/knowledgeAccessPolicy.ts`
- `server/src/modules/ai/dialogueOrchestrator.ts`
- `server/src/modules/ai/relationCandidate.ts`
- `server/src/modules/ai/consortDialogueService.ts`
- `server/src/app.ts`
- `src/ai/consortDialogueAgent.ts`
- `src/game/types.ts`
- `src/game/lib/consortDialogueRuntime.ts`
- `src/game/lib/miaoyinDialogueRuntime.ts`
- `src/game/lib/taiyiDialogueRuntime.ts`
- `src/game/lib/baohuaDialogueRuntime.ts`
- `src/game/lib/gongmenToolDialogueRuntime.ts`
- `src/game/lib/dialogueTrace.ts`
- `src/components/consorts/ConsortAudiencePanel.tsx`
- `src/components/chamber/MiaoYinHallView.tsx`
- `src/components/chamber/TaiHospitalView.tsx`
- `src/views/MapMainView.tsx`

### 13.4 当前测试与状态

这轮已经新增或扩展了这些测试：

- `server/tests/unit/relationPromotion.test.ts`
- `server/tests/unit/consortDialogueService.test.ts`
- `server/tests/unit/dialoguePolicy.test.ts`

当前已确认通过：

- `relationPromotion.test.ts` 通过
- `dialoguePolicy.test.ts` 通过
- `consortDialogueService.test.ts` 通过
- `npm run build` 通过

当前 handoff 时应视为：

- 最小长期 relation memory 闭环已经进代码并通过当前验证
- 该实现仍然是轻量、纯内存、规则优先版本
- 下一位 Codex 接手后，可在这个闭环之上继续扩，而不是从 session-only 状态重新开始

### 13.5 接手后的第一优先级

先不要扩 belief / rumor / world 平台，先做这几步：

1. 先重新运行一次基线验证：

```bash
npx vitest run server/tests/unit/relationPromotion.test.ts server/tests/unit/consortDialogueService.test.ts server/tests/unit/dialoguePolicy.test.ts
npm run build
```

2. 如果出现红灯，优先收口：
   - `ConsortDialogueService` 的 relation memory 注入
   - `relationMemory` 响应字段与 schema / runtime 的类型对齐
   - 前端 trace 的最小透传与统计

3. 若基线已变绿，再继续做下一步：
   - relation candidate 的 promotion review 强化
   - 长期 relation snapshot 在更多场景里的读取

### 13.6 这轮明确没有做的事

以下内容仍然没做，也不要误判成已经上线：

- 数据库持久化
- rumor engine
- npc belief state
- public facts / player known / npc belief 多层系统
- world_state 单写平台
- 复杂 validator 框架
- UI 改版

这轮仍然是轻量架构推进，不是 memory platform 重构。

## 14. 本次会话补充操作总结（2026-05-09，代码清理与交接文档合并）

这一轮工作的重点不是新增系统能力，而是做两件事：

1. 把 handoff 文档正式收口到单一入口
2. 对共享对话场景做一轮保守代码清理，去掉重复 helper 和明显冗余状态更新

### 14.1 交接文档口径已统一

当前只保留这一份统一 handoff：

- `docs/codex-dialogue-handoff.md`

旧的并行文档已经删除：

- `docs/codex-work-handoff-current.md`

新的接手入口继续保留为：

- `docs/new-chat-start.md`

后续若补充交接内容，优先写回本文件，不要重新分叉出第二份“当前状态说明”。

### 14.2 本轮完成的代码清理

新增了一个共享对话辅助工具文件：

- `src/game/lib/dialogueSceneUtils.ts`

当前统一收口的 helper 只有三类：

- `trimDialogueHistory`
- `clampToRange`
- `createDialogueId`

这些 helper 之前分散复制在多个场景组件里，本轮已经改为统一复用，主要涉及：

- `src/components/chamber/TaiHospitalView.tsx`
- `src/components/chamber/KitchenView.tsx`
- `src/components/chamber/MiaoYinHallView.tsx`
- `src/components/chamber/BaohuaHallView.tsx`
- `src/components/chamber/HuaQingPoolView.tsx`
- `src/components/chamber/DowagerAudiencePanel.tsx`
- `src/components/consorts/ConsortAudiencePanel.tsx`

### 14.3 本轮去掉的冗余形态

本轮清掉的冗余主要有两类：

1. 同样的 `trim history / clamp / id generator` 在多个对话场景里各写一份
2. 一些 `setDialogueTurn(...)` 在下一行立刻被另一次状态设置覆盖，没有实际保留价值

注意：

- 并不是所有过渡态都被删了
- 只有那些“立即被覆盖”的状态更新被去掉
- 仍然保留了真正承担过渡对白 / busy 态作用的更新点

因此这次清理的目标是收口重复实现，不是改对话流程语义。

### 14.4 本轮顺手修掉的测试与构建噪音

这轮为了让清理后的基线重新稳定，还顺手做了两类修正：

1. `src/__tests__/app-flow.test.tsx`
   - 把两处妃嫔对白断言从旧文案改成当前实现文案
   - 把妃嫔 AI 超时 fallback 用例的等待点改成“等 fallback 选项真正出现”，避免测到 `busy=true` 的中间态

2. `server/tests/unit/consortDialogueService.test.ts`
   - 去掉了一个未定义却仍被传入的 `relationMemoryService` 参数
   - 这个参数会直接导致 `npm run build` 失败

这些修改的目的都是收口测试基线，不代表功能方向发生变化。

### 14.5 本轮验证结果

本轮已确认通过：

- `npx vitest run src/__tests__/app-flow.test.tsx`
- `npm run build`

因此当前 handoff 时可视为：

- 共享对话场景的重复 helper 已初步收口
- 主流程前端回归仍然是绿的
- build 基线是绿的

### 14.6 下一位 Codex 接手时的建议顺序

如果下一轮继续做“对话系统清理”而不是新功能，建议顺序是：

1. 先读本文件第 6、10、14 节
2. 先复跑：

```bash
npx vitest run src/__tests__/app-flow.test.tsx
npm run build
```

3. 若继续清理，优先看：
   - 各 dialogue runtime 之间重复的 fallback 结构
   - `app-flow.test.tsx` 里重复的场景初始化样板

不要在没有回归保护的前提下，直接把多个 NPC 场景再强行合并成一套超大抽象。

## 15. 本次会话补充操作总结（2026-05-09，当前最新）

这一节用于补充“本次对话里真正落地的改动”，方便后续 Codex 不必从聊天记录里反向还原。

### 15.1 本次会话完成的主线工作

本次会话没有扩新平台，主要做了 5 类收口：

1. 项目保守清理
2. 旬末 / 月末结算骨架接入
3. 地图、回宫、寝殿、玩家住处语义修正
4. 月结算中的位分推进与迁宫落地
5. 妃嫔 AI 对话 timeout / fallback 稳定性修复

### 15.2 项目保守清理

已做过一轮保守修剪，重点是删除“严格确认未使用”的内容，而不是扩重构：

- 删除根目录临时残留、缓存目录、预览产物
- 更新 `.gitignore`
- 删除 `src/index.css` 里确认未引用的旧 `theater / sprite / npc-designer / bedchamber-placeholder` 样式段
- 更新 `readme.md` 中“寝殿仍是预留入口”的过期描述

这轮清理后：

- CSS 体积已有一轮下降
- 主流程构建和测试仍然通过

### 15.3 旬末 / 月末结算骨架

当前已经不是“只会切时间”的空壳。

已接入：

- 旬报
- 月报
- 月俸结算
- 娇娇通报弹层
- 纪事留档

关键文件：

- `src/game/store/gameFlowStore.ts`
- `src/views/ChamberMainView.tsx`
- `src/components/chamber/ChamberUtilityViews.tsx`

当前口径：

- 跨旬会生成旬报
- 跨月会生成月报并发放月俸
- 通报会写进纪事页，而不是仅当场展示

### 15.4 地图 / 回宫 / 寝殿 / 玩家住处语义修正

这部分是本次会话最容易影响后续工作的地方。

已经成立的语义：

- `外出` 永远表示“回地图视角”
- `回宫` 永远表示“直接回寝殿”
- 外景场景里，左侧会并存 `外出` 与 `回宫`
- 从地图点进玩家当前住处，会直接等同 `回宫`
- 地图上的玩家寝殿热点不再写死为 `椒房殿`
- 地图寝殿热点、后宫落位、回宫入口都由 `state.residenceName` 驱动

关键文件：

- `src/views/ChamberMainView.tsx`
- `src/views/MapMainView.tsx`
- `src/config/palaceUi.ts`
- `src/components/consorts/HaremPalaceView.tsx`

后续如果要继续改地图或寝殿，不要再引回这些旧语义：

- “外出”和“回宫”二选一
- “玩家寝殿固定是椒房殿”
- “点玩家宫殿一定先弹进入确认”

### 15.5 位分推进与迁宫规则

月结算现在已经会驱动玩家实际住处变化。

当前规则是保守版：

- 按 `prestige` 推导目标位分
- 每月最多推进 2 级
- 位分推进后同步迁宫
- 月报会写出位分变化与迁宫结果
- 月俸按当前实际位分发放

关键文件：

- `src/game/lib/rankRuntime.ts`
- `src/game/store/gameFlowStore.ts`

要特别注意：

- `hiddenStats.initialRank` 目前已经承担“当前玩家位分标签”的运行时职责
- 它不再只是开局静态初始值
- 后续若做结构整理，优先拆成 `openingRankLabel` / `currentRankLabel`

### 15.6 妃嫔 AI 对话 timeout / fallback 修复

这次会话最后一轮收口的是“AI 对话未返回，请稍后重试”问题。

已确认并修正：

- 妃嫔对话入口现在走 `requestConsortDialogueWithFallback(...)`
- 不再要求严格 AI 成功返回才继续
- 前端妃嫔对话默认 timeout 已从 `2500ms` 放宽到：
  - 生产环境：`6000ms`
  - 测试环境：`80ms`
- 超时后应退回本地角色对白与本地选项，而不是把玩家卡在系统报错文案上

关键文件：

- `src/ai/consortDialogueAgent.ts`
- `src/game/lib/consortDialogueRuntime.ts`
- `src/components/consorts/ConsortAudiencePanel.tsx`
- `src/__tests__/app-flow.test.tsx`

如果后续又看到“AI 对话未返回，请稍后重试”这一类妃嫔对话报错，先检查：

1. 当前 bundle 是否已刷新
2. 入口是否又被改回 strict AI 路径
3. timeout 是否再次被压得过低
4. fallback 是否被新的组件态覆盖掉

### 15.7 本次会话最低验证结果

本次补充会话已确认通过：

- `npx vitest run src/__tests__/app-flow.test.tsx`
- `npm run build:web`

因此当前 handoff 时，可以把下面这些视为“已成立基线”：

- 妃嫔对话超时会 fallback
- 旬报 / 月报 / 月俸主链路可运行
- 玩家住处会驱动地图与后宫落位
- 位分推进会带动迁宫
- 地图 / 回宫 / 寝殿语义已经分清

### 15.8 下一位 Codex 接手时建议先确认什么

如果后续继续在这个方向上工作，建议先确认：

1. `state.residenceName` 是否仍然是住处真值来源
2. `hiddenStats.initialRank` 是否仍被当作当前位分使用
3. 妃嫔对话入口是否仍然是 fallback runtime
4. `app-flow.test.tsx` 是否仍然全绿
5. `build:web` 是否仍然通过

如果这些基线有任一项变红，先收口现有语义和回归，不要直接扩新功能。

### 15.9 玩家改名后的剧情称呼同步

本轮修正了“属性页改名后，后续剧情仍以默认名称呼玩家”的问题。

已经成立的规则：

- `state.name` 是玩家当前姓名真值
- 属性页改名走 `gameFlowStore.setPlayerName(name)`
- `setPlayerName` 会同步更新 `selectedRoute.defaultName` 与 `selectedRoute.baseState.name`
- 他人对玩家的直接称呼不得再写死路线默认名
- 完整姓名、姓氏、`某氏` 统一由 `src/game/lib/playerNameRuntime.ts` 解析
- 路线背景里的固定历史案名可以保留，但直接称呼玩家时必须读取当前姓名

已修正的文本入口：

- 影落掖庭开场：掖庭掌事称呼 `某氏`
- 影落掖庭开场：御前问话后的 `某家 / 某氏旧案余眷`
- 影落掖庭后宫初见：陈婉宁称呼当前玩家姓名
- 影落掖庭长春宫证物匣：陈婉宁称呼当前玩家姓名

关键文件：

- `src/game/store/gameFlowStore.ts`
- `src/views/AttributeAssignmentView.tsx`
- `src/game/lib/playerNameRuntime.ts`
- `src/game/lib/openingDialogueRuntime.ts`
- `src/game/lib/yingluoyetingStoryRuntime.ts`
- `src/__tests__/app-flow.test.tsx`
- `src/game/lib/yingluoyetingStoryRuntime.test.ts`

验证结果：

- `npm run build:web` 通过
- `npx vitest run src/game/lib/yingluoyetingStoryRuntime.test.ts` 通过
- `npx vitest run src/__tests__/app-flow.test.tsx -t "属性页改名会同步路线状态和影落掖庭开场称呼"` 通过
- 2026-06-02 已修复完整套跑中的夜晚侍寝通报状态污染；`npx vitest run src/__tests__/app-flow.test.tsx` 现已全量通过

### 15.10 属性加点按钮不可交互态

本轮修正属性加点页 `+ / -` 按钮只在点击逻辑里防越界、但视觉和语义上仍可点的问题。

已经成立的规则：

- 当前属性值到达字段下限时，`减少` 按钮禁用
- 当前属性值到达字段上限时，`增加` 按钮禁用
- 剩余点数为 0 时，所有仍需消耗点数的 `增加` 按钮禁用
- 路线锁定属性时，属性加减按钮继续全部禁用
- 属性加减按钮带有 `aria-label` 与 `title`，格式为 `属性名增加 / 属性名减少`

关键文件：

- `src/views/AttributeAssignmentView.tsx`
- `src/__tests__/app-flow.test.tsx`

验证结果：

- `npx vitest run src/__tests__/app-flow.test.tsx -t "属性加点按钮会在下限、上限和点数不足时禁用"` 通过
- `npm run build:web` 通过

### 15.11 外出反馈、跨旬顺序与数值 toast

本轮修正寝殿主循环反馈的三个问题：外出提示不会再被转场立刻吞掉，跨旬行动会先展示本次行动结果再展示下一旬通报，玩家核心数值变化会出现可叠加 toast。

已经成立的规则：

- 寝殿点击外出或寝殿行动里的外出探索时，只先设置寝殿对白，不立即进入地图
- 外出对白确认按钮显示 `前往地图`，确认后才调用 `enterMapMain()`
- 旬月通报必须等待当前寝殿对白收起后再展示
- `NumericChangeToastLayer` 挂在 `App` 转场层之外，页面切换不卸载 toast
- toast 观察玩家银两、声望、压力、真心与属性字段，按界面展示口径显示具体差值；后续修正后体力与宠爱不再触发 toast
- 每个数值差异独立生成一条 toast，多个 toast 可共存，最多保留 10 条，并使用独立定时器自动消失

关键文件：

- `src/views/ChamberMainView.tsx`
- `src/components/status/NumericChangeToastLayer.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/__tests__/app-flow.test.tsx`
- `codex-workdocs/2026-06-02-feedback-toast-and-numeric-text-audit.md`

验证结果：

- `npx vitest run src/__tests__/app-flow.test.tsx -t "点击外出会先停留在寝殿展示出行提示|跨旬行动会先展示本次行动结果|玩家数值变化会显示可叠加"` 通过
- `npx vitest run src/__tests__/app-flow.test.tsx -t "寝殿日常行动会显示对应剧情反馈|回宫反馈收起后不会覆盖后续寝殿行动剧情|普通行动推进到夜晚|结束本旬后会进入下一旬|结束本旬触发主角侍寝"` 通过
- `npm run build:web` 通过
- 2026-06-02 已修复完整套跑中的夜晚侍寝通报状态污染；`npx vitest run src/__tests__/app-flow.test.tsx` 现已全量通过

### 15.12 测试重置中的夜晚侍寝状态隔离

本轮修复完整 `app-flow` 套跑时“夜晚侍寝通报覆盖家族事务按钮”的状态污染问题。根因是测试辅助函数 `resetFlowStore()` 没有重置 `nightlyService`，前序用例留下的 `pendingNotice` 会进入后续直接渲染寝殿的用例，导致寝殿按钮被夜晚通报遮挡。

已经成立的规则：

- 测试级状态重置必须清空 `nightlyService.pendingEvent`
- 测试级状态重置必须清空 `nightlyService.pendingNotice`
- 测试级状态重置必须清空 `nightlyService.pendingMorningLines`
- 测试级状态重置必须清空 `nightlyService.queuedRolls`
- 直接渲染寝殿类测试不得继承前序夜晚通报状态

关键文件：

- `src/__tests__/app-flow.test.tsx`

验证结果：

- `npx vitest run src/__tests__/app-flow.test.tsx` 通过，75 passed
- `npm run build:web` 通过

### 15.13 数值变化文本收口到 toast

本轮按策划要求移除了寝殿行动反馈和侍寝通报里的直接数值加减文案。实际数值结算仍然保留，玩家侧反馈统一通过 toast 展示。

已经成立的规则：

- 寝殿行动 `summary` 不再写 `诗词 +2`、`丹青 +2`、`健康 +3`、`体力 +3` 等数值文案
- 寝殿行动结果对白只写叙事和行动收束，不直接展示属性上升 / 下降
- 侍寝通报不再写玩家宠爱、真心、声望的具体变化
- 他人侍寝或玩家在侍寝中替他人说话 / 点错时，不再在文本中写妃嫔宠爱变化
- `NumericChangeToastLayer` 已扩展到妃嫔与自定义妃嫔的宠爱 / 声望 / 压力变化，用于承接他人数值变化反馈
- `NumericChangeToastLayer` 只在 `map-main` 和 `bedchamber` 显示变化；角色选择、属性分配、开场剧情阶段只刷新基线，不弹初始化差值

关键文件：

- `src/config/palaceUi.ts`
- `src/game/lib/nightlyServiceRuntime.ts`
- `src/components/status/NumericChangeToastLayer.tsx`
- `src/game/lib/actionNarrativeRuntime.test.ts`
- `src/game/lib/nightlyServiceRuntime.test.ts`
- `src/__tests__/app-flow.test.tsx`

验证结果：

- `npx vitest run src/game/lib/actionNarrativeRuntime.test.ts src/game/lib/nightlyServiceRuntime.test.ts src/__tests__/app-flow.test.tsx -t "builds scene feedback|prioritizes the player|settles the player service|lets an allied consort|lets a hostile consort|寝殿日常行动会显示对应剧情反馈|玩家数值变化会显示可叠加"` 通过
- `npx vitest run src/game/lib/actionNarrativeRuntime.test.ts src/game/lib/nightlyServiceRuntime.test.ts src/__tests__/app-flow.test.tsx` 通过，87 passed
- `npm run build:web` 通过，仍有 Vite 大 chunk 警告
- 浏览器刷新 5173 页面后无 console error

### 15.14 初始化阶段不显示数值 toast

本轮修复角色初始化时显示大量数值变化 toast 的问题。toast 层仍然持续记录数值快照，但只有进入正式游玩视图后才显示变化。

已经成立的规则：

- `start` / `route-selection` / `attribute-assignment` / `opening-dialogue` 阶段不显示数值 toast
- 初始化阶段发生的路线初始数值、属性调整、开场状态变化只更新 toast 基线
- `map-main` / `bedchamber` 阶段继续显示玩家和妃嫔数值变化
- 离开正式游玩视图时会清掉当前 toast 与定时器，避免初始化界面残留旧提示

关键文件：

- `src/components/status/NumericChangeToastLayer.tsx`
- `src/__tests__/app-flow.test.tsx`

验证结果：

- `npx vitest run src/__tests__/app-flow.test.tsx -t "角色初始化和属性调整阶段不会显示数值变化 toast|玩家数值变化会显示可叠加"` 通过
- `npm run build:web` 通过，仍有 Vite 大 chunk 警告

### 15.15 对话选项态、夜晚通报顺序与 toast 拆分

本轮继续收口寝殿主循环反馈：

- 共享对话进入选项态后，对话正文不再响应点击，也不再因鼠标点击显示焦点框；键盘焦点样式改为 `:focus-visible`
- 选项态仍保留上一句正文可读，但实际交互只能落在选项按钮上
- 普通寝殿行动推进到夜晚时，先展示本次行动结果对白；对白收起后才展示夜晚侍寝通报或侍寝事件
- toast 改为每个数值差异独立一条，不再把同一时间点的多个变化塞进同一个 toast
- toast 最大可见数量从 5 调整为 10，以免同一事件多项变化被立即截断
- 2026-06-02 追加：toast 不再由状态变化直接显示；`NumericChangeToastLayer` 订阅 store 的每次状态提交，把差值按 `chamber-action` / `map-event` / `nightly-service` / `settlement` 事件桶排队
- 共享对话实际显示正文时会标记对应事件反馈点，toast 只在事件反馈出现后释放；夜晚通报和旬月通报分别使用专用事件桶，避免行动消耗和后续结算提前混在一起显示

关键文件：

- `src/components/dialogue/PalaceDialogueBox.jsx`
- `src/components/dialogue/GlobalDialogueStage.tsx`
- `src/views/ChamberMainView.tsx`
- `src/game/store/gameFlowStore.ts`
- `src/game/types.ts`
- `src/components/status/NumericChangeToastLayer.tsx`
- `src/index.css`
- `src/__tests__/app-flow.test.tsx`
- `codex-workdocs/2026-06-02-dialogue-nightly-toast-loop.md`

验证结果：

- `npx vitest run src/__tests__/app-flow.test.tsx -t "玩家数值变化会显示可叠加|普通行动推进到夜晚|跨旬行动会先展示|角色初始化和属性调整阶段不会显示"` 通过
- `npx vitest run src/__tests__/app-flow.test.tsx -t "全局对话舞台会把长段剧情分页展示|玩家数值变化会显示可叠加|普通行动推进到夜晚"` 通过
- `npx vitest run src/game/lib/actionNarrativeRuntime.test.ts src/game/lib/nightlyServiceRuntime.test.ts src/__tests__/app-flow.test.tsx` 通过，88 passed
- `npm run build:web` 通过，仍有 Vite 大 chunk 警告
- 浏览器刷新 `http://127.0.0.1:5173/` 后首页正常加载，console error 为 0

### 15.16 侍寝反馈、体力排除与通报去重

本轮继续修正夜晚侍寝到次日清晨这一段反馈节奏。

已经成立的规则：

- 他人侍寝导致玩家宠爱变化时，数值真值仍在夜间规则结算中写入
- 2026-06-02 后续修正：宠爱变化不再触发 toast，因此不再需要清晨释放宠爱 toast
- 体力增减不触发 toast，体力变化只通过常驻状态栏体现
- 清晨通报生成时会对最近一条同类、同年月旬、同标题通报做去重，避免同一次过夜推进重复追加
- 寝殿过夜转场 effect 增加 run key，避免同一过夜阶段被重复推进

关键文件：

- `src/components/status/NumericChangeToastLayer.tsx`
- `src/game/store/gameFlowStore.ts`
- `src/views/ChamberMainView.tsx`
- `src/__tests__/app-flow.test.tsx`

验证结果：

- `npx vitest run src/__tests__/app-flow.test.tsx -t "玩家数值变化会显示可叠加|他人侍寝影响玩家宠爱|结束本旬后会进入下一旬|普通行动推进到夜晚"` 通过
- `npx vitest run src/game/lib/actionNarrativeRuntime.test.ts src/game/lib/nightlyServiceRuntime.test.ts src/__tests__/app-flow.test.tsx src/game/store/gameFlowStore.save.test.ts` 通过，108 passed
- `npm run build:web` 通过，仍有 Vite 大 chunk 警告
- 浏览器刷新 `http://127.0.0.1:5173/` 后首页正常加载，console error 为 0

### 15.17 宠爱 toast 排除、声望 toast 与寝殿用度说明

本轮继续收口数值反馈和寝殿主界面用度调整。

已经成立的规则：

- 玩家宠爱 `favor` 不再进入 `NumericChangeToastLayer`
- 妃嫔 / 自定义妃嫔的宠爱变化也不再进入 `NumericChangeToastLayer`
- 玩家声望、妃嫔声望仍会进入 toast，并继续按事件桶等待对应对白 / 通报出现后释放
- 体力仍不进入 toast
- 寝殿“调整用度”现在与开场一致，包含 `节衣缩食 / 量入为出 / 锦衣玉食 / 先问清用度` 四个选项
- `先问清用度` 由娇娇解释三档含义，解释结束后返回用度选择，不写入下月策略

当前已接入的玩家声望来源：

- 月结用度：`锦衣玉食` 每月声望 `+10`，`量入为出` 为 `0`，`节衣缩食` 为 `-5`
- 家世月补贴：国公 / 一品 / 二三品 / 四品 / 六品等家世会在月结给不同声望补贴；商贾、罪臣会扣声望
- 家族事务接济：花费 `120` 银两登记家族接济，季度结算额外声望 `+12`
- 主角侍寝：侍寝兴致达到 `100` 时，规则层给玩家声望 `+10`
- 宫斗案件：玩家作为作案方定罪时会扣声望，轻 / 中 / 重分别按规则扣除

关键文件：

- `src/components/status/NumericChangeToastLayer.tsx`
- `src/views/ChamberMainView.tsx`
- `src/__tests__/app-flow.test.tsx`
- `docs/economy-governance-architecture.md`

验证结果：

- `npx vitest run src/__tests__/app-flow.test.tsx -t "玩家数值变化会显示可叠加|他人侍寝影响玩家宠爱|寝殿调整用度"` 通过
- `npx tsc -p tsconfig.json --noEmit` 通过
- `npx vitest run src/game/lib/actionNarrativeRuntime.test.ts src/game/lib/nightlyServiceRuntime.test.ts src/__tests__/app-flow.test.tsx src/game/store/gameFlowStore.save.test.ts` 通过，109 passed
- `npm run build:web` 通过，仍有 Vite 大 chunk 警告
- 浏览器刷新 `http://127.0.0.1:5173/` 后首页正常加载，console error 为 0

### 15.18 声望负值、新局状态重建与前尘 / 回溯核查

本轮修正了两个会影响长期主循环的状态问题。

规则口径：

- 玩家声望与妃嫔声望扣减不再以 0 为下限，统一按 `PRESTIGE_RANGE = [-2000, 5000]` 裁剪。
- `applyStoryEffects`、旬 / 月结算、玩家侍寝结算、NPC 宫斗定罪惩罚都使用同一个声望范围。
- 新建路线 / 新存档时，`applyRouteSelection` 从 `initialState` 与路线档案重建一局，不再把旧局 `current.state` 当底板合并。
- 路线选择会重置 `time`、临时文本、对话、结算通报、宫斗案件、侍寝状态、库存、交易记录、关系进度与自定义妃嫔，避免旧局时间和事件串入新局。

启动菜单核查：

- `StartScene` 中存在 `开始 / 前尘 / 回溯 / 设置` 四个按钮。
- 当时 `App.tsx` 只处理 `开始`，`前尘` 与 `回溯` 均未接入独立页面或读档逻辑。
- 2026-06-02 后续已接入 `回溯` 的单槽读档能力，最新口径见 15.19 与 `docs/save-system-maintenance.md`。
- `前尘` 仍未检索到可执行策划规则，目前只保留按钮文案。

关键文件：

- `src/game/store/gameFlowStore.ts`
- `src/game/store/gameFlowStore.save.test.ts`
- `src/views/StartScene.tsx`
- `src/App.tsx`

验证结果：

- `npx vitest run src/game/store/gameFlowStore.save.test.ts -t "fresh durable state|prestige losses|player penalties"` 通过
- `npx tsc -p tsconfig.json --noEmit` 通过
- `npx vitest run src/game/store/gameFlowStore.save.test.ts src/__tests__/app-flow.test.tsx` 通过，98 passed；仍有既有 React `act(...)` 测试警告
- `npm run build:web` 通过，仍有 Vite 大 chunk 警告
- 浏览器刷新 `http://127.0.0.1:5173/` 后首页正常加载，console error 为 0

### 15.19 启动页存档入口与单槽回溯

本轮把启动页按钮纳入存档系统，而不是只做视图跳转。

已经成立的规则：

- `SaveGameV1` 仍是当前前端存档真值，`localStorage` key 统一为 `palace-galgame-flow`。
- `src/game/save/saveGameV1.ts` 新增 `SAVE_GAME_STORAGE_KEY`、`readSaveGameV1FromStorage()`、`clearSaveGameV1Storage()`。
- 启动页“开始”不再直接进入路线选择，而是先弹二级确认。
- 确认新开后调用 `gameFlowStore.startNewGame()`：清空旧存档，从初始状态重建新局，进入 `route-selection`，并由 persist 写入新存档。
- 启动页“回溯”调用 `gameFlowStore.resumeLastSave()`：读取上一次 `SaveGameV1`，恢复 durable state，并按存档进度进入路线选择、属性页、地图或寝殿。
- 无存档时，回溯留在启动页并显示“暂无可回溯的存档。”。
- `前尘` 仍未接入玩法；`设置` 仍未接入设置页。

维护规范：

- 新增 `docs/save-system-maintenance.md` 作为存档功能全局维护文档。
- 后续新增长期字段必须同步 `SaveGameV1Source`、`SaveGameV1`、`buildSaveGameV1()`、`restoreSaveGameV1Fields()`、新局重置路径与测试。
- 不得再用 `setCurrentView('route-selection')` 表示“开始新游戏”。

关键文件：

- `src/App.tsx`
- `src/views/StartScene.tsx`
- `src/game/save/saveGameV1.ts`
- `src/game/store/gameFlowStore.ts`
- `src/__tests__/app-flow.test.tsx`
- `docs/save-system-maintenance.md`

验证结果：

- `npx tsc -p tsconfig.json --noEmit` 通过
- `npx vitest run src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts src/__tests__/app-flow.test.tsx -t "开始新游戏|回溯|SaveGameV1|fresh durable state"` 通过
- `npx vitest run src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts src/__tests__/app-flow.test.tsx` 通过，104 passed；仍有既有 React `act(...)` 测试警告
- `npm run build:web` 通过，仍有 Vite 大 chunk 警告
- `web_game_playwright_client` 点击启动页“开始”后截图确认二级确认弹窗可见
- in-app browser 刷新 `http://127.0.0.1:5173/` 后能看到“开始 / 回溯”入口，console error 为 0

### 15.20 剧情 / 对话显示期间屏蔽背景 UI

本轮修复“剧情、旁白或对话文本显示时，背景按钮仍可点击并触发行动 / 面板 / 转场”的问题。

已经成立的规则：

- `GlobalDialogueStage` 新增 `global-dialogue-stage__interaction-lock`，在共享对话舞台内提供透明点击拦截层。
- 该拦截层只负责吃掉对话框外的鼠标事件；对话框正文、下一步按钮和分支选项仍保持可交互。
- `ChamberMainView` 新增寝殿交互锁：寝殿对白、旬月通报、侍寝通报、过夜遮罩、连翘赠礼和用度选项期间，侧栏、行动按钮、底部工具和快速回宫不会执行。
- `MapMainView` 新增地图交互锁：地图剧情 / 引导、掖庭剧情和宫门 NPC 对话期间，地图侧栏、热点、进入地点和热点快捷入口不会越过当前剧情。
- 旧测试中连续点击多个寝殿行动的写法已调整：当前行动反馈必须先收起，才能触发下一次行动。

维护口径：

- 新剧情文本优先复用 `GlobalDialogueStage`，默认继承交互锁。
- 如果某个场景需要对白显示时保留旁侧操作，必须明确它属于同场景操作，并确认层级与 handler 不会让背景主循环继续结算。
- 不能只依赖 CSS 遮挡；主循环关键 handler 仍要有阻塞态判断，防止键盘、测试或程序化点击绕过。

关键文件：

- `src/components/dialogue/GlobalDialogueStage.tsx`
- `src/index.css`
- `src/views/ChamberMainView.tsx`
- `src/views/MapMainView.tsx`
- `src/__tests__/app-flow.test.tsx`
- `codex-workdocs/2026-06-02-dialogue-ui-lock.md`

验证结果：

- `npx vitest run src/__tests__/app-flow.test.tsx -t "屏蔽|全局对话舞台会把长段剧情分页展示"` 通过
- `npx vitest run src/__tests__/app-flow.test.tsx` 通过，83 passed；仍有既有 React `act(...)` 警告
- `npx tsc -p tsconfig.json --noEmit` 通过
- `npm run build:web` 通过，仍有 Vite 大 chunk 警告
- Playwright 实测：对白显示时点击背景“泼墨作画”不会改变清晨 / 体力 10；收起对白后同按钮正常推进到上午 / 体力 9

### 15.21 系统宫宴第一版闭环

本轮处理两件事：妙音堂听曲 toast 延迟，以及系统宫宴报名 / 结算闭环。

已经成立的规则：

- 妙音堂听曲先结算压力变化，再推进时间，并在妙音堂行动结果出现时触发 `chamber-action` toast；不再等到后续旬月通报才集中显示。
- `PalaceBanquetProgressState` 是系统宫宴真值，保存当前宫宴季、曲谱报名快照、报名提醒标记、已结算宫宴季和最近结果。
- 宫宴报名提醒只在跨入报名开启节点时生成，不在玩家已经处于报名期的任意行动后补弹，避免打断普通流程。
- 妙音堂报名期由 `palaceBanquetSchedule` 判断；每届只记录一张有效曲谱，曲谱提交后写入快照并消耗库存。
- 系统宫宴在 3 月上旬傍晚触发，结算后占用傍晚 / 夜晚并停到深夜；同届通过 `lastResolvedSeasonKey` 防重复。
- 宫宴表现由 `palaceBanquetRuntime` 结算：曲谱品质、才艺、听曲次数和连翘关系影响完成度，完成度影响声望变化和通报文本。
- 宫宴报名提醒与结算通报使用 `SettlementReportKind = 'event'`，继续走全局通报遮罩和背景 UI 锁。

关键文件：

- `src/game/lib/palaceBanquetSchedule.ts`
- `src/game/lib/palaceBanquetRuntime.ts`
- `src/game/store/gameFlowStore.ts`
- `src/game/save/saveGameV1.ts`
- `src/components/chamber/MiaoYinHallView.tsx`
- `src/views/ChamberMainView.tsx`
- `src/components/status/NumericChangeToastLayer.tsx`

验证结果：

- `npx tsc -p tsconfig.json --noEmit` 通过
- `npx vitest run src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts src/__tests__/app-flow.test.tsx` 通过，109 passed；仍有既有 React `act(...)` 测试警告
