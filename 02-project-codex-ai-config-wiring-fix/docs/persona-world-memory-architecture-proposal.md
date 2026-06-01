# 人物与世界观记忆存储架构计划（Proposal）

## 背景与目标

本项目当前已经明确不是“全流程写死的线性剧情”，而是：

- 以硬规则驱动宫廷模拟底座
- 在特定轮次、条件、倾向下触发轻量剧情节点
- 在硬规则和剧情节点之间加入 AI 对话增强层

目标不是让 AI 直接接管世界，而是让 AI 在**受控的事实边界**内增强角色口吻、日常互动、情绪表达和候选记忆提取。

因此，这份 proposal 的核心目标只有一句：

**把“人物是谁、世界真实发生了什么、谁知道什么、哪些内容能长期记住”拆成不同层，并给每一层单独的读写规则。**

这份方案严格遵守以下原则：

- 人设只读
- 会话短存
- 关系分档
- 世界单写
- 情绪数值化
- 长期记忆必须审批 / 规则判断后再入库

同时保留现有双 AI 结构定位：

- `narrative-text-ai` 负责口吻、对白、氛围、候选记忆提取
- `relationship-judge-ai` 负责微量关系倾向判断
- 两者都不得直接写长期记忆，不得直接创造世界真相

## 当前 repo 现状与缺口

## 1. 已有基础

### 前端

- [src/App.tsx](/C:/02-project/src/App.tsx) 已把流程切成 `start -> route-selection -> attribute-assignment -> opening-dialogue -> map-main -> bedchamber`。
- [src/game/store/gameFlowStore.ts](/C:/02-project/src/game/store/gameFlowStore.ts) 已承担当前主状态仓，包含：
  - 玩家数值 `state`
  - 隐藏数值 `hiddenStats`
  - 时间 `time`
  - 路线选择 `selectedRoute`
  - 情缘状态 `bondProfile`
  - 妃嫔列表 `concubines`
  - 每旬关系变化进度 `consortInteractionMap`
  - 厨房 / 太医院 / 宝华殿等场景进度
- [src/views/OpeningDialogueView.tsx](/C:/02-project/src/views/OpeningDialogueView.tsx) + [src/game/lib/openingDialogueRuntime.ts](/C:/02-project/src/game/lib/openingDialogueRuntime.ts) 已实现开场对话的 AI + fallback 双轨。
- [src/components/consorts/ConsortAudiencePanel.tsx](/C:/02-project/src/components/consorts/ConsortAudiencePanel.tsx) + [src/game/lib/consortDialogueRuntime.ts](/C:/02-project/src/game/lib/consortDialogueRuntime.ts) 已形成“场景对话 + 关系判定 + 本地落地”的最小闭环。
- [src/game/lib/relationshipJudgeRuntime.ts](/C:/02-project/src/game/lib/relationshipJudgeRuntime.ts) 已把关系 AI 收口成 `friendly / flirt / cold / reject / neutral` 五类。

### 后端

- [server/src/app.ts](/C:/02-project/server/src/app.ts) 已用 `Fastify + service 注入` 组织后端。
- [server/src/routes/aiRoutes.ts](/C:/02-project/server/src/routes/aiRoutes.ts) 已提供：
  - `/api/v1/ai/calc`
  - `/api/v1/ai/opening-dialogue`
  - `/api/v1/ai/consort-dialogue`
  - `/api/v1/ai/relationship-judge`
  - `/api/v1/ai/temple-ambient`
  - `/api/v1/ai/narrative/:traceId`
- [server/src/modules/ai/openingDialogueService.ts](/C:/02-project/server/src/modules/ai/openingDialogueService.ts) 与 [server/src/modules/ai/consortDialogueService.ts](/C:/02-project/server/src/modules/ai/consortDialogueService.ts) 已明确强调“AI 只负责文本包装，不负责真实数值”。
- [server/src/types/contracts.ts](/C:/02-project/server/src/types/contracts.ts) 和 [server/src/types/schemas.ts](/C:/02-project/server/src/types/schemas.ts) 已有较清晰的请求 / 响应契约。

### 文档

- [docs/game-state-model.md](/C:/02-project/docs/game-state-model.md) 已提出“硬规则先算，AI 后包装”“AI 不是真相源”的主原则。
- [docs/system-hard-rules-integrated.md](/C:/02-project/docs/system-hard-rules-integrated.md) 已确认双 AI 只是增强层。
- [docs/character-story-nodes-and-relationship-ai.md](/C:/02-project/docs/character-story-nodes-and-relationship-ai.md) 已给出角色节点结构和关系 AI 上限。
- [docs/custom-consort-ai-interface.md](/C:/02-project/docs/custom-consort-ai-interface.md) 已强调“AI 只出草案，系统二次确认后落地”。
- [reports/game-architecture.txt](/C:/02-project/reports/game-architecture.txt) 已提供大量角色、规则、场景和事件原始约束。

## 2. 关键缺口

当前 repo 还没有独立的 memory architecture，主要问题是：

- `gameFlowStore` 既像前端投影，又像临时真源，还顺带保存部分关系结果，职责过重。
- 当前“记忆”主要是 `history`、`recentContext`、`bondProfile.recentContext`、`consortInteractionMap` 这类本地短字段，缺少统一语义。
- 还没有独立区分：
  - `npc_core`
  - `world_state`
  - `session_memory`
  - `relation_memory`
  - `emotion_state`
  - `npc_belief_state`
  - `memory_event_log`
- 还没有“谁知道什么”的正式建模。当前 `consortContext.summary`、`recentContext`、`npcProfile` 都是一次性 prompt 拼接，不是可审计的知识层。
- AI 服务当前是**单次请求 / 单次回应**模型，没有 server-side memory retrieval / commit。
- 长期事实还没有单入口写入机制。前端组件会直接 patch 本地状态，但这些 patch 还不是“世界真相”意义上的统一提交。
- 当前没有 `saveId / sessionId / requestId / sceneId` 级别的隔离规范，后续很容易出现串档和跨场景污染。

## 记忆分层设计

建议正式把记忆拆成以下 7 层。

## 1. `npc_core`

定位：**只读人物核心设定层**。

用途：

- 身份、位分、公开人设、隐藏核心
- 口吻、禁忌、说话习惯
- 能知道什么、不能知道什么
- 角色节点顺序约束
- 该角色允许承担的剧情职责

特点：

- 来源于配置 / 文档 / 人设档
- 不由 AI 写入
- 只允许策划或配置更新

建议字段：

| 字段 | 说明 |
| --- | --- |
| `npcId` | 角色稳定 ID |
| `routeScope` | 适用路线 |
| `identity` | 身份称谓 |
| `publicPersona` | 公开人设 |
| `hiddenCore` | 核心驱动力 |
| `speechStyle` | 口吻关键词 |
| `taboos` | 禁忌话题 |
| `knowledgeBoundary` | 可知边界定义 |
| `storyGuards` | 节点顺序 / 不可跳段规则 |
| `sceneRoles` | 该角色可承接的场景职责 |

## 2. `world_state`

定位：**世界真相唯一来源**。

用途：

- 当前时间、位分、位置、路线阶段
- 玩家与关键角色硬数值状态
- 已发生事件、事件结果、剧情 gating
- 已公开事实、仍未公开秘密
- 影响规则引擎和主流程的所有硬事实

特点：

- 只能由规则引擎 / world apply service 单写
- AI 不能直写
- 允许为 retrieval 生成只读投影，但真源始终唯一

建议字段：

| 字段 | 说明 |
| --- | --- |
| `saveId` | 存档隔离主键 |
| `revision` | 世界版本号 |
| `timeState` | 年 / 月 / 旬 / 时段 |
| `playerStateRef` | 玩家硬状态快照或引用 |
| `actorStateRefs` | 关键角色硬状态引用 |
| `routeState` | 路线阶段 / 结局旗标 |
| `eventState` | 事件状态、节点 gating |
| `publicFactIds` | 当前已公开事实集合 |
| `secretFactIds` | 当前世界已成立但未公开的事实集合 |
| `updatedAt` | 更新时间 |

## 3. `session_memory`

定位：**当前 session / 当前场景短期记忆**。

用途：

- 最近若干轮对话
- 当前场景上下文
- 玩家这轮意图
- 最近检索到的事实
- 当前话题、当前情绪氛围

特点：

- 可快速写入
- 生命周期短
- 切场景可压缩总结
- 不直接代表长期事实

建议字段：

| 字段 | 说明 |
| --- | --- |
| `saveId` | 存档隔离 |
| `sessionId` | 会话隔离 |
| `sceneId` | 场景隔离 |
| `npcId` | 当前交互对象 |
| `recentTurns` | 最近对话轮次 |
| `sceneSummary` | 当前场景摘要 |
| `intentTags` | 本轮意图标签 |
| `retrievedRefs` | 本轮用到的事实引用 |
| `expiresAt` | 过期时间 |

## 4. `relation_memory`

定位：**NPC 与玩家之间的长期关系记忆**。

用途：

- 被谁救过、被谁羞辱过
- 收过什么礼、做过什么承诺
- 哪次争执改变了关系
- 哪次暧昧是关系转折点

特点：

- 不是纯数值
- 但也不是开放式流水文本
- 需要规则批准后才能写入

建议字段：

| 字段 | 说明 |
| --- | --- |
| `memoryId` | 记忆项 ID |
| `saveId` | 存档隔离 |
| `npcId` | 角色 ID |
| `playerId` | 玩家 ID |
| `memoryType` | `gift / promise / hurt / favor / intimacy / conflict / alliance` |
| `summary` | 结构化摘要 |
| `importance` | 重要度 |
| `sourceEventId` | 来源事件 |
| `status` | `approved / superseded / revoked` |
| `createdAt` | 写入时间 |

## 5. `emotion_state`

定位：**可计算、可衰减的数值化情绪层**。

用途：

- `trust`
- `affection`
- `tension`
- `suspicion`
- `respect`
- `mood`

特点：

- 由规则引擎和有限 AI 候选共同驱动
- 必须可解释、可限幅、可衰减
- 不与关系记忆混写

建议字段：

| 字段 | 说明 |
| --- | --- |
| `saveId` | 存档隔离 |
| `ownerId` | 情绪拥有者 |
| `targetId` | 情绪指向对象 |
| `trust` | 信任 |
| `affection` | 倾情 / 好感情绪轴 |
| `tension` | 紧张 / 对抗 |
| `suspicion` | 怀疑 |
| `respect` | 敬重 |
| `mood` | 当前心境 |
| `lastDecayAt` | 上次衰减时间 |

## 6. `npc_belief_state`

定位：**NPC 的认知层，不等于世界真相**。

这是本 proposal 的重点层。

用途：

- 某 NPC 已知什么
- 某 NPC 只是怀疑什么
- 某 NPC 误会了什么
- 某 NPC 听过什么传闻

特点：

- 可以与世界真相不一致
- 允许多个 NPC 对同一事件认知不同
- 允许“误解”长期存在
- 读取给 AI 时优先使用 belief，不直接暴露 truth

建议字段：

| 字段 | 说明 |
| --- | --- |
| `saveId` | 存档隔离 |
| `npcId` | 角色 ID |
| `factKey` | 对应事实键 |
| `beliefType` | `known / suspected / misunderstood / rumor` |
| `beliefSummary` | 该 NPC 自己认知下的表述 |
| `confidence` | 确信度 |
| `sourceEventId` | 由什么事件得知 |
| `updatedAt` | 更新时间 |

## 7. `memory_event_log`

定位：**所有写入事件的审计日志**。

用途：

- 谁在什么时候提了什么候选记忆
- 哪条被批准
- 哪条被拒绝
- 为什么拒绝
- 某次 world patch 前后是什么

特点：

- 不参与 prompt
- 但必须完整
- 用于冲突排查、回滚、验因

建议字段：

| 字段 | 说明 |
| --- | --- |
| `eventId` | 事件 ID |
| `saveId` | 存档隔离 |
| `requestId` | 请求链路 ID |
| `sessionId` | 会话 ID |
| `actorId` | 当前交互主体 |
| `operation` | `candidate / approve / reject / apply_world / apply_relation / summarize_session` |
| `targetScope` | 写入目标 |
| `payload` | 详细内容 |
| `result` | 结果 |
| `reason` | 原因 |
| `createdAt` | 时间 |

## 世界真相 / NPC 认知 / 关系记忆的边界设计

必须明确把五类内容拆开：

| 层 | 定义 | 可否冲突 |
| --- | --- | --- |
| `world truth` | 客观已发生事实 | 不可冲突 |
| `public fact` | 已被系统认定为公开的事实 | 与 truth 一致 |
| `player known` | 玩家当前知道的事实 | 可少于 truth |
| `npc belief` | 某 NPC 自己相信的事实 | 可与 truth 不一致 |
| `rumor / guess` | 传闻、推测、误解 | 可以互相冲突 |

建议 scope 统一采用**先存档、再层级**的命名方式，防止串档：

```txt
save/{saveId}/world/truth/{factKey}
save/{saveId}/world/public/{factKey}
save/{saveId}/player/known/{factKey}
save/{saveId}/npc/{npcId}/belief/{factKey}
save/{saveId}/relation/{npcId}/player/state
save/{saveId}/relation/{npcId}/player/memory/{memoryId}
save/{saveId}/emotion/{ownerId}/{targetId}
save/{saveId}/session/{sessionId}/scene/{sceneId}
save/{saveId}/audit/{eventId}
```

推荐事实类型：

- `world truth`
  - `player.rank = 贵嫔`
  - `event.du_knows_aling = true`
  - `secret.escape_plan.started = true`
- `public fact`
  - `public.player_promoted = true`
  - `public.du_yunyan_is_ill = true`
- `npc belief`
  - `npc/du_yunyan/belief/player_has_old_lover = suspected`
  - `npc/yao_linger/belief/player_smear_me = known`
- `rumor`
  - `rumor.player_favored_by_emperor`
  - `rumor.aling_related_to_player`

关键边界规则：

1. `world truth` 只能由规则服务写。
2. `public fact` 最好由 `world truth` 派生，不让 AI 单独创建。
3. `npc belief` 只能在“该 NPC 有合理接触路径”时更新。
4. `rumor` 永远不能反写成 `world truth`，除非有事件验证。
5. prompt 默认给 NPC 的是 `npc_core + allowed world slice + npc_belief_state + relation + emotion + session`，不是整个 world truth。

## 每轮对话执行流程

建议把一次完整对话执行链路固定为以下 9 步。

1. **确定上下文**
   - 输入 `saveId / sessionId / requestId / sceneId / npcId / routeId`

2. **读取基础设定**
   - 读 `npc_core`
   - 读 `world_state` 的最小必要切片
   - 读 `relation_state + emotion_state`
   - 读 `npc_belief_state`
   - 读 `session_memory`

3. **做权限裁剪**
   - retrieval service 根据 `knowledgeBoundary` 和 scene rules 裁剪 prompt
   - 不让 NPC 看见其不应知道的 truth

4. **调用 narrative AI**
   - AI 只输出：
     - `replyText`
     - `sceneTone`
     - `memoryCandidates`
     - `emotionHints`
     - `unsafeFactFlags`

5. **调用 calc / rule engine**
   - 关系微调、情绪限幅、事件 gating、公开性判断，都在这里做

6. **执行 memory write policy**
   - 允许直接写：`session_memory`
   - 允许规则限幅后写：`emotion_state`
   - 允许审批后写：`relation_memory`
   - 不允许 AI 直写：`world_state`
   - `npc_belief_state` 只能根据“是否听见 / 是否看见 / 是否被通报”规则写

7. **world_state 单入口提交**
   - 所有世界真相更新统一走 `worldStateService.applyPatch()`

8. **写审计日志**
   - 把 candidate、批准结果、拒绝理由、最终 patch 全写入 `memory_event_log`

9. **返回给前端**
   - 返回对白
   - 返回前端投影 patch
   - 返回 debug traceId / requestId

推荐伪代码：

```ts
const context = await memoryRetrievalService.buildDialogueContext(input);
const aiDraft = await narrativeService.generate(context.prompt);
const calcResult = await ruleEngine.evaluate(input, context, aiDraft);
const commitPlan = await memoryWritePolicy.review({
  input,
  context,
  aiDraft,
  calcResult,
});
await sessionMemoryService.write(commitPlan.sessionWrites);
await emotionStateService.apply(commitPlan.emotionWrites);
await relationMemoryService.applyApproved(commitPlan.relationWrites);
await worldStateService.apply(commitPlan.worldPatch);
await beliefStateService.apply(commitPlan.beliefWrites);
await memoryEventLogService.append(commitPlan.auditEvents);
return buildDialogueResponse(aiDraft, calcResult, commitPlan.clientProjection);
```

必须强调：

- `narrative AI` 只能产出 `memory candidates`
- 不能直接写长期记忆
- `world_state` 只能单写入口更新

## 数据结构建议

## MVP 推荐

MVP 阶段不建议一上来做复杂分布式存储。建议先做**仓储抽象 + 内存实现 / JSON 实现**，接口稳定后再换 SQLite 或正式数据库。

这一点可以复用 [server/src/modules/foundation/repository.ts](/C:/02-project/server/src/modules/foundation/repository.ts) 已经存在的 `repository + snapshot + audit` 风格。

### 1. `npc_core`

建议先以配置方式存放，不急着做数据库。

关键字段：

- `npc_id`
- `route_scope`
- `identity`
- `public_persona`
- `hidden_core`
- `speech_style_json`
- `taboos_json`
- `knowledge_boundary_json`
- `story_guards_json`
- `version`

### 2. `world_state`

建议每个 `saveId` 一份单文档。

关键字段：

- `save_id`
- `revision`
- `route_id`
- `time_json`
- `player_state_json`
- `actor_state_json`
- `event_state_json`
- `public_fact_ids_json`
- `secret_fact_ids_json`
- `updated_at`

### 3. `session_memory`

关键字段：

- `save_id`
- `session_id`
- `scene_id`
- `npc_id`
- `recent_turns_json`
- `summary_text`
- `intent_tags_json`
- `retrieved_refs_json`
- `expires_at`
- `updated_at`

### 4. `relation_state`

建议把“关系数值主状态”单独拆出，不和 `relation_memory` 混存。

关键字段：

- `save_id`
- `npc_id`
- `player_id`
- `trust`
- `affection`
- `tension`
- `suspicion`
- `respect`
- `intimacy_stage`
- `last_interaction_at`
- `revision`

### 5. `emotion_state`

关键字段：

- `save_id`
- `owner_id`
- `target_id`
- `mood`
- `trust_delta`
- `affection_delta`
- `tension_delta`
- `suspicion_delta`
- `last_decay_at`

### 6. `memory_items`

这是长期记忆主表，建议类型化。

关键字段：

- `memory_id`
- `save_id`
- `scope_type`
- `scope_key`
- `memory_type`
- `subject_id`
- `object_id`
- `fact_key`
- `summary`
- `importance`
- `status`
- `candidate_source`
- `source_event_id`
- `confidence`
- `created_at`
- `approved_at`

### 7. `npc_belief_state`

关键字段：

- `belief_id`
- `save_id`
- `npc_id`
- `fact_key`
- `belief_type`
- `belief_summary`
- `confidence`
- `source_event_id`
- `updated_at`

### 8. `memory_event_log`

关键字段：

- `event_id`
- `save_id`
- `request_id`
- `session_id`
- `scene_id`
- `actor_id`
- `operation`
- `target_scope`
- `payload_json`
- `result`
- `reason`
- `created_at`

## 服务与 API 建议

## 1. 建议新增目录

```txt
server/src/modules/memory/
  memoryTypes.ts
  memoryRepository.ts
  memoryRetrievalService.ts
  memoryWritePolicy.ts
  worldStateService.ts
  relationStateService.ts
  relationMemoryService.ts
  emotionStateService.ts
  beliefStateService.ts
  sessionMemoryService.ts
  memoryEventLogService.ts
  memoryOrchestrator.ts
```

## 2. 为什么单独放 `modules/memory/`

当前 `server/src/modules/ai/` 已经比较明确是“生成服务层”。  
memory 层本质上是**状态与策略层**，不应该混进单个 AI service。

因此建议：

- `ai/` 继续负责生成
- `memory/` 负责检索、提交、审计
- `routes/` 再决定哪些能力是否要暴露为接口

## 3. API 建议

结合当前 repo，建议分两层推进。

### 第一层：先做内部服务，不强制前端改协议

先保持：

- `/api/v1/ai/opening-dialogue`
- `/api/v1/ai/consort-dialogue`
- `/api/v1/ai/relationship-judge`

不变。

但在它们内部注入：

- `memoryRetrievalService`
- `memoryWritePolicy`
- `worldStateService`

这样风险最低。

### 第二层：补充显式 memory / world 接口

建议新增：

- `POST /api/v1/memory/retrieve`
- `POST /api/v1/memory/commit`
- `POST /api/v1/world/apply`
- `POST /api/v1/session/summarize`
- `GET /api/v1/memory/log/:saveId/:requestId`

用途：

- 调试
- GM / 后台审计
- 后续 free chat 编排

### 第三层：未来 free chat 统一入口

后续可新增：

- `POST /api/v1/ai/free-chat`

由它内部统一完成：

- 读取上下文
- narrative 生成
- relationship judge / rule engine
- candidate 审批
- world commit

## 4. 契约建议

当前 dialogue 类请求最终都建议补入这些公共字段：

- `saveId`
- `sessionId`
- `requestId`
- `sceneId`
- `actorId`
- `targetNpcId`

这样才能真正防串档、能审计、能回溯。

## 与现有代码库的衔接点

## 1. 应保持不动的部分

- [src/App.tsx](/C:/02-project/src/App.tsx) 的视图切换结构可保持。
- [src/views/MapMainView.tsx](/C:/02-project/src/views/MapMainView.tsx) 与 [src/views/ChamberMainView.tsx](/C:/02-project/src/views/ChamberMainView.tsx) 的 UI 层不需要因 memory proposal 重写。
- [server/src/modules/ai/openingDialogueService.ts](/C:/02-project/server/src/modules/ai/openingDialogueService.ts) 和 [server/src/modules/ai/consortDialogueService.ts](/C:/02-project/server/src/modules/ai/consortDialogueService.ts) 的“AI 只做文本”原则应保留。
- 现有硬规则文档与数值公式不应因为 memory 层而改口径。

## 2. 最适合插入 memory 层的位置

### `openingDialogue`

接入点：

- [src/views/OpeningDialogueView.tsx](/C:/02-project/src/views/OpeningDialogueView.tsx)
- [src/game/lib/openingDialogueRuntime.ts](/C:/02-project/src/game/lib/openingDialogueRuntime.ts)
- [server/src/modules/ai/openingDialogueService.ts](/C:/02-project/server/src/modules/ai/openingDialogueService.ts)

建议：

- 开场阶段先只接 `session_memory`
- 长期只落：
  - `openingTendency` 的最终选择
  - 开场引导完成 flag
- 不要让开场对白写入大量 relation memory

### `relationshipJudge`

接入点：

- [src/game/lib/relationshipJudgeRuntime.ts](/C:/02-project/src/game/lib/relationshipJudgeRuntime.ts)
- [src/components/consorts/ConsortAudiencePanel.tsx](/C:/02-project/src/components/consorts/ConsortAudiencePanel.tsx)

建议：

- 继续保留 `friendly / flirt / cold / reject / neutral` 的轻量接口
- 但最终落地不要只在前端 `applyConsortRelationshipJudgement`
- 应改成“前端提交选择 -> 服务端规则限幅 -> 返回 projection patch”

### `consort dialogue / future free_chat`

当前最适合成为 memory MVP 第一接入点。

原因：

- 已有 `history`
- 已有 `recentContext`
- 已有 `consortContext`
- 已有 relationship judge 与 scene follow-up 链

建议：

- 先把 `history` 从纯前端数组升级为 `session_memory`
- 再把 `recentContext` 的长期部分拆入 `relation_memory`
- 最后把 NPC 可知范围替换为 `npc_belief_state`

## 3. `gameFlowStore` 的定位

[src/game/store/gameFlowStore.ts](/C:/02-project/src/game/store/gameFlowStore.ts) 应保留，但定位必须调整为：

- 前端渲染投影
- 本地交互缓存
- 离线 fallback 运行容器

而不应继续被视为长期真源。

建议后续原则：

- world 真源在后端
- store 只保存当前投影、最近返回值、离线兜底状态
- store 中的 `bondProfile / consortInteractionMap / kitchenProgress / templeProgress / medicalProgress` 可逐步迁到 server-side memory/state，再回传投影

## 风险与防错机制

如果不做上述拆分，最容易出现的问题如下。

| 风险 | 发生原因 | 防法 |
| --- | --- | --- |
| 人设 OOC | AI 直接靠自由 prompt 发挥 | `npc_core` 只读 + `storyGuards` |
| NPC 越权知情 | 直接把全局 world truth 喂给 AI | retrieval 只给 `belief_state` |
| 世界事实互相打架 | world truth 与 public / rumor 混写 | `world_state` 单写 |
| session 串档 | 缺少 `saveId / sessionId` 作用域 | 所有 key 先带 `saveId` |
| AI 胡诌入库 | AI 直写长期记忆 | candidate -> policy -> commit |
| 多 NPC 认知不一致但无区分 | 只有一个“memory bucket” | 引入 `npc_belief_state` |
| 关系变化不可解释 | 只有数值没有记忆来源 | `relation_memory + event_log` |
| 主线 gating 崩坏 | AI 自行推进世界事实 | world patch 只能走规则入口 |

建议的防错机制：

1. 长期记忆必须带 `sourceEventId`。
2. 每次 commit 必须带 `requestId`。
3. `memoryWritePolicy` 必须能输出 `reject reason`。
4. `worldStateService` 必须做 `revision` 校验，防并发覆盖。
5. `npc_belief_state` 必须有 `beliefType`，不能只存一句文本。
6. `session_memory` 必须有 TTL 或总结压缩，否则 prompt 会无限膨胀。
7. 传闻必须默认低置信度，且不得自动升级成 truth。

## 分阶段实施路线图

## P0：必须先做

1. 定义 `saveId / sessionId / requestId / sceneId` 统一作用域。
2. 在后端新增 `modules/memory/` 基础仓储和类型。
3. 明确 `npc_core / world_state / session_memory / relation_state / emotion_state / npc_belief_state / memory_event_log` 的最小 schema。
4. 建立 `worldStateService.applyPatch()` 单写入口。
5. 在 `consort-dialogue` 链路先接 `session_memory retrieval + audit log`。
6. narrative AI 改为只产出 `memoryCandidates`，不再隐式假装写事实。

## P1：尽快做

1. 把 `relationshipJudge` 的落地从纯前端 patch 调整为服务端限幅提交。
2. 接入 `relation_memory` 和 `emotion_state`。
3. 为固定角色建立 `npc_core.knowledgeBoundary`。
4. 建立 `npc_belief_state` 的写入规则，至少覆盖：
   - 亲眼所见
   - 当面听见
   - 娇娇通报
   - 宫内公开事件
5. 给 `openingDialogue` 和后续 `free_chat` 统一接入 retrieval。

## P2：后续增强

1. 加 `rumor_memory` 的传播与衰减。
2. 加冲突检测和回滚工具。
3. 加 session summary 压缩策略。
4. 加 SQLite / 正式数据库适配。
5. 加 GM / debug 查询接口和对账工具。
6. 加“公共事实投影”与“玩家已知事实投影”的自动派生。

## 一句话架构原则总结

**人物设定只读，世界真相单写，NPC 只按各自认知说话，AI 只能提出记忆候选而不能直接把候选写成长期事实。**
