# 人物、人设一致性与世界观记忆架构 Proposal V2

## 背景与目标

本 proposal 面向 02-project 当前的宫廷题材规则模拟 / 文游架构，不是通用聊天 memory 方案。

本项目不是：

- 纯 AI 聊天器
- 纯酒馆式陪聊器
- 全流程写死的线性 AVG

更准确的定位是：

- 规则驱动的宫廷模拟 / 文游底座
- 在特定轮次、条件、倾向下触发轻量剧情节点
- 在硬规则和剧情节点之间加入 AI 语聊增强层

AI 的作用是：

- 增强对白表现
- 增强角色连续互动
- 做关系倾向分类
- 做文本包装
- 提取 memory candidates

AI 不是：

- 世界生成器
- 硬规则裁判
- 真相来源
- 主线推进器

一句话原则：

> 硬规则决定真实结果，AI 只做受控的互动增强层。

本方案重点解决：

- 人设不串
- 世界观不漂
- NPC 不越权知道信息
- session 不串档
- AI 不把临时胡诌写成长期事实
- 不同 NPC 即使面对同一事实，也能按自己的认知、立场、语气作答
- AI 可以增强互动，但不能破坏规则、剧情 gating、角色边界

## 当前 Repo 现状与缺口

### 已有基础

前端当前已形成稳定主链路：

- `src/App.tsx` 固定主流程：`start -> route-selection -> attribute-assignment -> opening-dialogue -> map-main -> bedchamber`
- `src/game/store/gameFlowStore.ts` 保存玩家数值、隐藏数值、时间、妃嫔、道具、地点进度、情缘状态、每旬关系上限
- `src/views/OpeningDialogueView.tsx` 接入开场引导对话
- `src/views/MapMainView.tsx` 接入地图、宫门、杜娘、阿翎入口
- `src/views/ChamberMainView.tsx` 接入寝殿、地点场景、功能面板
- `src/components/consorts/ConsortAudiencePanel.tsx` 已形成 `history / recentContext -> consort dialogue -> relationship judge -> 本地规则落地` 的最小闭环
- `src/game/lib/openingDialogueRuntime.ts` 已强制开场 AI 不写真实数值，`timeCost = 0`，选项固定
- `src/game/lib/relationshipJudgeRuntime.ts` 已把关系 AI 收口成 `friendly / flirt / cold / reject / neutral`

后端当前已形成双 AI route 基础：

- `server/src/app.ts` 负责 Fastify app 组装和 service 注入
- `server/src/routes/aiRoutes.ts` 已有：
  - `/api/v1/ai/calc`
  - `/api/v1/ai/opening-dialogue`
  - `/api/v1/ai/consort-dialogue`
  - `/api/v1/ai/relationship-judge`
  - `/api/v1/ai/taiyi-ambient`
  - `/api/v1/ai/temple-ambient`
  - `/api/v1/ai/miaoyin-ambient`
  - `/api/v1/ai/narrative/:traceId`
- `server/src/modules/ai/dialogueSystemPrompt.ts` 已有宫廷对白总约束
- `server/src/modules/ai/consortDialogueService.ts` 已明确 narrative AI 只负责对白、氛围、分支措辞与角色口吻，不负责真实数值
- `server/src/modules/ai/relationshipJudgeService.ts` 已限制 relationship judge 只能返回五类 tone 和有限 delta

文档层已经明确硬规则优先：

- `docs/game-state-model.md`：明确“硬规则先算，AI 后包装”，AI 不直接写存档真值
- `docs/system-hard-rules-integrated.md`：明确双 AI 只是增强层，无 AI 也必须完整跑通
- `docs/character-story-nodes-and-relationship-ai.md`：明确剧情节点有硬触发条件，AI 只生成文本和关系倾向判定
- `docs/custom-consort-ai-interface.md`：明确自定义剧情妃由 AI 出草案，系统二次确认后落地
- `game word/固定核心NPC人设.md`、`game word/固定可攻略NPC人设.md`、`game word/固定工具NPC人设.md` 已有角色分层与调用口径
- `game word/系统硬规则总稿.docx`、`game word/角色剧情节点与关系AI接口.docx` 等规则源文件强调真实结果由固定数值系统判定

### 当前关键缺口

当前 repo 还没有独立 memory engine，主要缺口是：

- `gameFlowStore` 既像前端投影，又临时承担长期状态，后续容易串档
- 旧 proposal 主要解决 memory 分层，但缺少生成控制层
- 当前 prompt 能收到 `consortContext.summary`、`recentContext`，但没有检索前的知情权限裁剪
- 没有 `saveId / sessionId / requestId / sceneId` 级别的统一隔离
- 没有 `world_state` 单写入口和 revision check
- 没有长期记忆审批链路
- 没有输出后校验层来检查 OOC、越权知情、rumor as truth、绕过 gating

## 为什么“只有 Memory 分层”仍不足以防人设串档

只拆 `world_state / relation_memory / session_memory` 只能解决“存在哪里”，不能解决“能不能说、该怎么说、当前场景能说到什么程度”。

人设串档和世界观漂移通常来自：

- AI 拿到了不该给这个 NPC 的 truth
- 同一 NPC 在公开场合说出了私密场景才该说的话
- 角色底卡有语气，但没有 forbidden / must-not-say / ambiguity rules
- AI 把 rumor 当 truth 使用
- AI 自己生成了未授权世界事实
- 输出后没有 validator 检查越权、OOC、跳 gating

因此 v2 需要从“memory 存储架构”升级为：

> 静态设定层 + 运行真相层 + 关系与情绪层 + 认知层 + 会话层 + 审计层 + 生成控制层。

## 完整分层架构设计

### A. 静态层

#### `npc_core`

定位：只读人物核心设定层。

存什么：

- `npcId`
- 身份、角色类型、路线归属
- 公开人设
- 隐藏核心
- 角色职责
- 关键故事节点 guard
- 是否进入情缘管理
- 是否可攻略

谁能读：

- `memoryRetrievalService`
- `personaGuardService`
- AI prompt builder
- consistency validator

谁能写：

- 策划 / 配置
- 代码配置迁移脚本

写入条件：

- 只能来自固定人设文档、配置表、经审批的自定义剧情妃草案

AI 是否允许直接写：

- 不允许

生命周期：

- 长期只读，版本化更新

当前衔接：

- `game word/固定可攻略NPC人设.md`
- `game word/固定核心NPC人设.md`
- `game word/固定工具NPC人设.md`
- `src/game/data/openingNarrativeProfiles.ts`
- `src/game/data/concubineRoster.ts`

#### `persona_guard`

定位：约束 NPC “如何说话 / 能说到什么程度”的结构化层。

存什么：

- 说话正式度
- 情绪外显程度
- 暧昧风格
- 冲突风格
- 面对秘密时的处理方式
- 主动性限制
- taboo topics
- must-not-say patterns
- 必须保持模糊的话题
- 称呼规则
- OOC 风险说明

建议结构：

```ts
interface PersonaGuard {
  npcId: string;
  version: string;
  formalityRange: [number, number];
  emotionalExposureRange: [number, number];
  romanceStyle: 'none' | 'restrained' | 'teasing' | 'devotional' | 'dangerous';
  conflictStyle: 'ritual_pressure' | 'soft_knife' | 'direct_rebuke' | 'avoidant';
  secrecyStyle: 'deny' | 'deflect' | 'partial_hint' | 'silence';
  initiativeLimit: 'reactive' | 'guided' | 'proactive';
  tabooTopics: string[];
  mustNotSayPatterns: string[];
  mustStayAmbiguousFacts: string[];
  addressRules: string[];
  oocRiskNotes: string[];
}
```

谁能读：

- prompt builder
- `consistencyValidator`
- `sceneModeService`

谁能写：

- 策划 / 配置

AI 是否允许直接写：

- 不允许

生命周期：

- 长期只读，随人设版本更新

当前衔接：

- `server/src/modules/ai/dialogueSystemPrompt.ts` 的通用 prompt 规则应逐步结构化迁入
- `docs/character-dialogue-system-patch.md` 可作为 persona guard 的规则来源
- 固定人设文档里的 `speech_patterns / forbidden_topics / emotional_responses` 可映射到本层

#### `canon_fact_registry`

定位：比 `world_state` 更静态的世界观常量和不可运行态改写的事实层。

存什么：

- 世界观常量
- 路线限制
- 固定角色先验
- 位分体系
- 血脉与后位限制
- 储君资格限制
- 固定场景规则
- 不可被运行时 patch 改写的规则事实

例子：

- 和亲公主 / 异国贡女默认有血脉封顶
- 生母为和亲 / 异国血脉的孩子默认不得入储君候选，仅指定路线例外
- 工具 NPC 娇娇和杜娘不进入情缘管理
- AI 不得决定怀孕、位分、案件结论、血脉真相

谁能读：

- rule engine
- `worldStateService`
- `knowledgeAccessPolicy`
- `consistencyValidator`

谁能写：

- 硬规则配置
- 策划版本更新

AI 是否允许直接写：

- 不允许

生命周期：

- 静态版本化，不随存档运行态变动

当前衔接：

- `docs/game-state-model.md`
- `docs/system-hard-rules-integrated.md`
- `reports/game-architecture.txt`
- `game word/系统硬规则总稿.docx`
- 位分、怀孕、宫斗、皇嗣、皇帝行为等专项规则文档

### B. 运行真相层

#### `world_state`

定位：当前存档的世界真相唯一来源。

存什么：

- 时间：年、月、旬、时段
- 玩家状态：位分、宠爱、声望、压力、福德、怀孕、血脉相关隐藏状态
- 皇帝状态：心情、真心 map、夜晚倾向
- 妃嫔状态：位分、宠爱、健康、怀孕、冷宫、存活、关系硬状态
- 案件状态：嫌疑、证据、调查阶段、结论
- 路线状态：路线阶段、剧情 gating、结局 flag
- 公开事实 ID
- 秘密事实 ID

谁能读：

- rule engine
- `memoryRetrievalService` 的裁剪投影
- UI projection builder

谁能写：

- `worldStateService.applyPatch()`

写入条件：

- 必须来自硬规则、剧情节点、合法系统操作
- 必须通过 revision check

AI 是否允许直接写：

- 不允许

生命周期：

- 每个 save 长期存在

当前衔接：

- `gameFlowStore` 目前保存的很多字段后续应迁为 world projection
- `docs/game-state-model.md` 可作为结构基线

### C. 关系与情绪层

#### `relation_state`

定位：NPC 与玩家之间的当前关系数值状态。

存什么：

- 好感
- 倾情
- 信任
- 敌意
- 怀疑
- 亲密阶段
- 是否交好 / 交恶
- 本旬关系变化累计

谁能读：

- rule engine
- relationship judge prompt builder
- narrative retrieval

谁能写：

- 规则服务
- relationship judge 服务端限幅后落地

AI 是否允许直接写：

- 不允许

生命周期：

- 存档长期

当前衔接：

- `consort.stats.relationToPlayer`
- `consort.stats.affection`
- `consortInteractionMap`
- `bondProfile`

#### `relation_memory`

定位：长期关系事件记忆，不是纯数值。

存什么：

- 送过重要礼物
- 许过承诺
- 曾被羞辱
- 共担秘密
- 被救 / 救人
- 背叛
- 暧昧转折
- 关键冲突

谁能读：

- `memoryRetrievalService`
- narrative prompt builder

谁能写：

- `relationMemoryService`
- 必须经过 `memoryWritePolicy`

写入条件：

- 必须有 `sourceEventId`
- 必须达到重要度阈值
- 必须去重
- 必须明确 scope

AI 是否允许直接写：

- 不允许，只能提 candidate

生命周期：

- 长期，可 supersede / revoke

当前衔接：

- 先从 `ConsortAudiencePanel` 的 follow-up、送礼、责罚、拉拢中提取候选

#### `emotion_state`

定位：可计算、可衰减的数值化情绪层。

存什么：

- `trust`
- `affection`
- `tension`
- `suspicion`
- `respect`
- `mood`
- `lastDecayAt`

谁能读：

- prompt builder
- rule engine
- relationship judge

谁能写：

- rule engine
- `emotionStateService`

写入条件：

- 必须限幅
- 可按时间衰减
- 不能和长期关系记忆混写

AI 是否允许直接写：

- 不允许，只能给 `emotionHints`

生命周期：

- 存档长期，但可周期衰减

### D. 认知层

#### `npc_belief_state`

定位：某 NPC 的私有认知，不等于世界真相。

存什么：

- 某 NPC 已知什么
- 某 NPC 怀疑什么
- 某 NPC 误会什么
- 某 NPC 听过什么传闻
- 置信度
- 知情路径

建议 `beliefType`：

- `known`
- `suspected`
- `misunderstood`
- `rumor`
- `withheld`

谁能读：

- `memoryRetrievalService`
- prompt builder

谁能写：

- `beliefStateService`

写入条件：

- 亲眼所见
- 当面听见
- 被正式通报
- 由公开事件派生
- 由传闻传播，但只能低置信度

AI 是否允许直接写：

- 不允许

生命周期：

- 长期，可修正，可被新证据覆盖

#### `player_known`

定位：玩家当前知道的事实。

存什么：

- 玩家见过的线索
- 玩家听过的公开/私密信息
- 玩家已解锁的秘密
- 玩家对某案件/血脉/旧案的认知进度

谁能读：

- UI
- narrative retrieval
- story gating

谁能写：

- story node
- rule engine

AI 是否允许直接写：

- 不允许

生命周期：

- 存档长期

#### `public_world_facts`

定位：宫中已公开事实。

存什么：

- 晋位
- 入冷宫
- 死亡
- 公开怀孕
- 公开案件立案
- 公开赏罚

谁能读：

- 大多数 NPC，仍受场景限制

谁能写：

- 由 `world_state` 派生

AI 是否允许直接写：

- 不允许

生命周期：

- 存档长期

#### `rumor_memory`

定位：传闻、推断、误解的独立层。

存什么：

- 传闻内容
- 来源
- 涉及对象
- 传播范围
- 置信度
- 是否已被证伪
- 衰减时间

谁能读：

- 允许接触传闻的 NPC
- 宫斗/流言系统

谁能写：

- rumor service
- 宫斗事件
- 场景传播规则

AI 是否允许直接写：

- 不允许，只能提出 rumor candidate

生命周期：

- 可衰减，可证伪，可升级为 NPC belief；不能自动升级为 truth

### E. 会话层

#### `session_memory`

定位：当前 session / 当前场景短期记忆。

存什么：

- 最近若干轮对话
- 当前场景摘要
- 本轮意图
- 已检索到的事实引用
- 临时情绪
- 当前未落地的 memory candidates

谁能读：

- prompt builder
- session summary service

谁能写：

- session service
- AI 可参与短期候选，但不代表长期事实

AI 是否允许直接写：

- 可写短存候选，不可进长期

生命周期：

- TTL
- 离场 summary
- 换 session 后隔离

当前衔接：

- 替代当前前端 `history` / `recentContext` 的一部分职责

### F. 审计层

#### `memory_event_log`

定位：所有写入、候选、拒绝、校验的 append-only 审计日志。

存什么：

- requestId
- sessionId
- actorId
- operation
- memory candidate
- approve / reject
- reject reason
- world patch
- relation patch
- validator result
- createdAt

谁能读：

- debug
- rollback
- GM 工具

谁能写：

- 所有 memory / world / validator 服务 append

AI 是否允许直接写：

- 不允许

生命周期：

- 长期审计

### G. 生成控制层

#### `knowledge_access_policy`

定位：检索前的知识访问控制层。

核心规则：

- 工具 NPC 默认只能读 public facts + 自己功能范围
- 固定妃嫔可读 public facts + self belief + relation with player + 已亲眼/当面听闻事实
- 皇帝 / 太后可读更高层政治公开事实，但隐藏血脉、医疗秘密、玩家私密关系仍需事件解锁
- 太医类 NPC 读取 medical facts 必须有诊脉 / 问诊 / 通报事件
- 路线旧人只能读 route public facts + shared past + 已通报外部消息
- 所有 NPC 默认不能读 `lineage_secret / hidden_emperor_truth / private_medical / case_truth / untriggered_route_node`

#### `scene_mode`

定位：当前场景的表达强度和信息披露级别。

建议枚举：

- `public_audience`
- `private_chamber`
- `night_companion`
- `investigation`
- `ceremony`
- `route_node`
- `free_chat_light`
- `free_chat_sensitive`

#### `interaction_contract`

定位：本轮 AI 被允许输出什么。

约束内容：

- 是否可给选项
- 是否可进入 follow-up
- 是否可提及秘密
- 是否可生成 memory candidates
- 是否可触发 story node
- 是否只能日常闲谈
- 是否允许暧昧
- 是否允许冲突升级

#### `consistency_validator`

定位：输出后校验层。

检查项：

- 是否引用 NPC 未被授权访问的 fact
- 是否违反 persona_guard
- 是否越过 scene_mode 边界
- 是否把 rumor 当 truth
- 是否擅自生成世界事实
- 是否绕过剧情 gating
- 是否替玩家说话或替玩家决定
- 是否出现 OOC 风险

建议结果：

```ts
interface ValidationResult {
  pass: boolean;
  severity: 'pass' | 'warn' | 'rewrite' | 'block';
  reasons: string[];
}
```

## 世界真相 / NPC 认知 / 关系记忆 / 传闻 的边界设计

必须明确区分：

| 类型 | 定义 | 是否可与 truth 不一致 | 是否能进 prompt |
| --- | --- | --- | --- |
| `world truth` | 客观真实发生的事实 | 不可 | 只能裁剪后进入 |
| `public facts` | 系统认定已公开的事实 | 与 truth 一致 | 可按场景进入 |
| `player known` | 玩家已知道的事实 | 可少于 truth | 用于 UI 和玩家视角 |
| `npc belief` | 某 NPC 自己相信/怀疑/误会的事实 | 可以 | 只给对应 NPC |
| `rumor / inference / misunderstanding` | 传闻、推断、误解 | 可以 | 必须标明不确定 |
| `relation memories` | NPC 与玩家的关系历史 | 不等同 truth | 可按关系阶段进入 |

推荐 scope：

```txt
save/{saveId}/canon/{factKey}
save/{saveId}/world/truth/{factKey}
save/{saveId}/world/public/{factKey}
save/{saveId}/player/known/{factKey}
save/{saveId}/npc/{npcId}/belief/{factKey}
save/{saveId}/rumor/{rumorId}
save/{saveId}/relation/{npcId}/{playerId}/state
save/{saveId}/relation/{npcId}/{playerId}/memory/{memoryId}
save/{saveId}/emotion/{ownerId}/{targetId}
save/{saveId}/session/{sessionId}/scene/{sceneId}
save/{saveId}/audit/{eventId}
```

给 NPC prompt 的内容应是：

```txt
npc_core
persona_guard
allowed world slice
npc_belief_state
public_world_facts allowed by scene
relation_state / relation_memory
emotion_state
session_memory
scene_mode constraints
interaction_contract
```

绝不能直接给全量 `world truth`。

## 每轮对话执行流程

推荐每轮对话固定为以下链路：

1. 前端提交：
   - `saveId`
   - `sessionId`
   - `requestId`
   - `sceneId`
   - `npcId`
   - `routeId`
   - `actionId`

2. `memoryRetrievalService` 读取：
   - `npc_core`
   - `persona_guard`
   - `world_state` 最小必要切片
   - `relation_state`
   - `relation_memory`
   - `emotion_state`
   - `npc_belief_state`
   - `session_memory`

3. `knowledge_access_policy` 过滤不可见事实。

4. `sceneModeService` 解析当前场景，生成 `scene_mode`。

5. `interactionContractService` 生成本轮输出合同。

6. `narrative-text-ai` 生成：

```ts
interface NarrativeDraft {
  reply: string;
  options: Array<{
    id: string;
    label: string;
    effectHint: string;
    fallbackToneTag?: 'friendly' | 'flirt' | 'cold' | 'reject' | 'neutral';
  }>;
  memoryCandidates: MemoryCandidate[];
  emotionHints: EmotionHint[];
  unsafeFactFlags: string[];
}
```

7. `relationship-judge-ai` 只判断 tone，不直接改硬数值。

8. `memoryWritePolicy` 审批：
   - `session_memory` 可直接短写
   - `emotion_state` 可规则限幅写
   - `relation_memory` 需审批
   - `npc_belief_state` 必须有知情路径
   - `world_state` 禁止 AI 直写

9. `worldStateService.applyPatch()` 单入口提交真实状态。

10. `consistencyValidator` 检查最终输出。

11. `memoryEventLogService` 记录：
    - candidate
    - approve / reject
    - reject reason
    - world patch
    - validator pass/fail

12. 返回：
    - 对白
    - 选项
    - 前端 projection patch
    - requestId / traceId

必须强调：

- narrative AI 只能提 `memoryCandidates`
- AI 不能直接写长期记忆
- `world_state` 只能由单写入口更新
- 输出前必须过 consistency / policy

## 数据结构建议

MVP 阶段建议先做 repository 抽象 + 内存 / JSON 实现，后续再换 SQLite 或正式数据库。可参考 `server/src/modules/foundation/repository.ts` 的 transaction / snapshot / audit 风格。

### `npc_core`

主键：

- `npcId`

关键字段：

- `roleType`
- `routeScope`
- `identity`
- `publicFace`
- `hiddenCore`
- `speechStyle`
- `storyGuards`
- `relationshipManaged`
- `canRomance`
- `version`

是否需要 `sourceEventId`：

- 不需要

是否需要 `confidence`：

- 不需要

生命周期：

- 静态长期

### `persona_guard`

主键：

- `npcId + version`

关键字段：

- `formalityRange`
- `emotionalExposureRange`
- `romanceStyle`
- `conflictStyle`
- `secrecyStyle`
- `initiativeLimit`
- `tabooTopics`
- `mustNotSayPatterns`
- `mustStayAmbiguousFacts`
- `addressRules`

revision/version：

- 必须有 `version`

生命周期：

- 静态长期

### `canon_fact_registry`

主键：

- `factKey`

关键字段：

- `factType`
- `value`
- `immutable`
- `routeScope`
- `ruleDocRef`
- `version`

生命周期：

- 静态长期，版本化

### `world_state`

主键：

- `saveId`

关键字段：

- `revision`
- `time`
- `player`
- `emperor`
- `consorts`
- `cases`
- `route`
- `events`
- `publicFactIds`
- `secretFactIds`
- `updatedAt`

是否需要 `sourceEventId`：

- patch 必须带

生命周期：

- 存档长期

### `session_memory`

主键：

- `saveId + sessionId + sceneId`

关键字段：

- `recentTurns`
- `summary`
- `intentTags`
- `retrievedRefs`
- `pendingMemoryCandidates`
- `expiresAt`
- `updatedAt`

生命周期：

- TTL / 离场 summary

### `relation_state`

主键：

- `saveId + npcId + playerId`

关键字段：

- `favor`
- `affection`
- `trust`
- `hostility`
- `suspicion`
- `intimacyStage`
- `xunDelta`
- `revision`
- `lastSourceEventId`

生命周期：

- 存档长期

### `relation_memory`

主键：

- `memoryId`

关键字段：

- `saveId`
- `npcId`
- `playerId`
- `memoryType`
- `summary`
- `importance`
- `status`
- `sourceEventId`
- `confidence`
- `createdAt`
- `approvedAt`

生命周期：

- 长期，可 supersede / revoke

### `emotion_state`

主键：

- `saveId + ownerId + targetId`

关键字段：

- `mood`
- `trust`
- `affection`
- `tension`
- `suspicion`
- `respect`
- `lastDecayAt`
- `revision`
- `lastSourceEventId`

生命周期：

- 长期，可衰减

### `npc_belief_state`

主键：

- `beliefId`

关键字段：

- `saveId`
- `npcId`
- `factKey`
- `beliefType`
- `beliefSummary`
- `confidence`
- `accessPath`
- `sourceEventId`
- `updatedAt`

生命周期：

- 长期，可修正

### `memory_items`

主键：

- `memoryId`

关键字段：

- `saveId`
- `scopeType`
- `scopeKey`
- `memoryType`
- `subjectId`
- `objectId`
- `factKey`
- `summary`
- `importance`
- `status`
- `candidateSource`
- `sourceEventId`
- `confidence`
- `createdAt`
- `approvedAt`

生命周期：

- 长期

### `memory_event_log`

主键：

- `eventId`

关键字段：

- `saveId`
- `requestId`
- `sessionId`
- `sceneId`
- `actorId`
- `operation`
- `targetScope`
- `payload`
- `result`
- `reason`
- `createdAt`

生命周期：

- append-only 长期审计

## 服务与 API 建议

建议新增目录：

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
  personaGuardService.ts
  knowledgeAccessPolicy.ts
  sceneModeService.ts
  interactionContractService.ts
  consistencyValidator.ts
  memoryEventLogService.ts
  memoryOrchestrator.ts
```

### 接入方式

第一阶段不要破坏现有 route：

- 保留 `/api/v1/ai/opening-dialogue`
- 保留 `/api/v1/ai/consort-dialogue`
- 保留 `/api/v1/ai/relationship-judge`
- 先在对应 service 内部注入 retrieval + policy + audit

第二阶段新增显式接口：

- `POST /api/v1/memory/retrieve`
- `POST /api/v1/memory/commit`
- `POST /api/v1/world/apply`
- `POST /api/v1/session/summarize`
- `GET /api/v1/memory/log/:saveId/:requestId`

第三阶段新增统一 free chat：

- `POST /api/v1/ai/free-chat`

由 `memoryOrchestrator` 统一编排：

- retrieval
- access policy
- scene mode
- narrative AI
- relationship judge
- write policy
- validator
- commit
- audit

## 与现有代码库的衔接点

### 先不动的文件

- `src/App.tsx`
- `src/views/MapMainView.tsx`
- `src/views/ChamberMainView.tsx`
- 当前 UI 结构
- 当前硬规则文档
- 当前 fallback 文案
- 当前 `/api/v1/ai/*` route 名称

### 最佳接入点

#### `ConsortAudiencePanel`

这是 memory MVP 最佳接入点。

原因：

- 已有 `history`
- 已有 `recentContext`
- 已有 `consortContext`
- 已有 relationship judge
- 已有本地规则落地

升级方式：

1. 请求体补 `saveId / sessionId / requestId / sceneId`
2. `history/recentContext` 服务端化为 `session_memory`
3. relationship judge 仍返回 tone
4. 服务端做关系限幅与审计
5. 重要互动变成 `relation_memory` candidate

#### `openingDialogueRuntime`

适合接：

- `session_memory`
- 开场引导短期上下文
- `openingTendency` 最终选择
- `openingGuideFinished` flag

不适合接：

- 大量长期关系记忆
- 主线事实推进
- 世界观新事实生成

#### `relationshipJudgeRuntime`

适合保留：

- 五类 tone 分类
- fallbackToneTag

后续升级：

- 前端不直接最终落地关系值
- 服务端限幅后返回 projection patch
- 写入 `relation_state`
- 追加 `memory_event_log`

#### `gameFlowStore`

`gameFlowStore` 应保留，但定位必须调整为：

- 前端渲染投影
- 本地交互缓存
- 离线 fallback 容器

不应继续作为长期真源。

原因：

- 无法可靠处理多 session
- 无法审计 memory 写入
- 无法执行 knowledge access policy
- 无法保证 world revision
- 无法支持后续服务端 free chat 和跨设备存档

长期真源应迁到：

- `world_state`
- `relation_state`
- `session_memory`
- `memory_event_log`

## 风险与防错机制

| 风险 | 原因 | 防错机制 |
| --- | --- | --- |
| OOC | 只有自由 prompt，没有 persona guard | `persona_guard + consistency_validator` |
| 世界观漂移 | AI 生成未授权事实 | `world_state` 单写，AI 只能 candidate |
| NPC 越权知情 | prompt 拿全量 truth | `knowledge_access_policy` 检索前裁剪 |
| rumor 升级 truth | 传闻无类型 | `rumor_memory.confidence`，禁止反写 truth |
| 长期记忆污染 | AI 一句话直写长期库 | `memoryWritePolicy` 审批 + reject reason |
| session 串档 | 无作用域隔离 | 所有 key 带 `saveId / sessionId / requestId` |
| 关系变化不可解释 | 只有数值 delta | `sourceEventId + relation_memory + audit` |
| gating 被 AI 绕过 | narrative 生成主线进展 | `interaction_contract + validator` |
| 并发覆盖 | 多次 patch 同时写 | `revision check` |
| prompt 膨胀 | session 无限追加 | TTL / session summary |

关键机制：

- `requestId`：每轮请求可追踪
- `sourceEventId`：每条长期记忆和状态 patch 可追源
- `revision check`：防止世界状态覆盖
- `reject reason`：长期记忆拒绝必须可解释
- `confidence`：belief / rumor 必须标注置信度
- `TTL / summary`：session 不能无限增长
- `validator pass/fail`：输出必须可拦截
- `audit trail`：所有写入必须可回放

## 分阶段实施路线图

### P0：必须先做

1. 定义 `saveId / sessionId / requestId / sceneId`
2. 新增 `worldStateService.applyPatch()` 单写入口
3. 新增 `session_memory`
4. 新增 `memory_event_log`
5. narrative 响应契约增加 `memoryCandidates`
6. 在 `consort-dialogue` 链路先接最小 retrieval + policy
7. 明确 `gameFlowStore` 是 projection，不是长期真源

### P1：尽快做

1. 建 `persona_guard`
2. 建 `knowledge_access_policy`
3. 建 `scene_mode / interaction_contract`
4. 建 `relation_state / relation_memory`
5. 建 `emotion_state`
6. 建 `npc_belief_state`
7. relationship judge 改为服务端限幅
8. `consistency_validator` 先覆盖越权 fact、rumor as truth、硬规则字段污染

### P2：后续增强

1. `rumor_memory` 传播、衰减、来源追踪
2. `session_summary` 压缩和长期提炼
3. debug / rollback / audit 工具
4. public facts 自动从 world truth 派生
5. SQLite 或正式数据库落地
6. `POST /api/v1/ai/free-chat` 统一入口
7. 自定义剧情妃的人设卡进入 `npc_core + persona_guard`，AI 草案仍需系统审批

## 一句话架构原则总结

> 人设只读、认知分层、会话短存、关系分档、世界单写、情绪数值化，AI 只能提候选，长期记忆审批后入库，回复必须经过权限与一致性校验。

## 与旧版 Proposal 相比，这版新增了什么，为什么必须新增

旧版 proposal 主要解决“记忆怎么分层存”，但还不足以防止人设串档和世界观漂移。v2 新增五个关键层：

1. `persona_guard`
   - 把角色“怎么说、不能怎么说”结构化
   - 避免只靠 prompt 软提醒

2. `knowledge_access_policy`
   - 在检索前裁剪事实
   - 防止 NPC 看到不该知道的信息

3. `scene_mode / interaction_contract`
   - 约束同一 NPC 在不同场景下的表达强度、秘密披露和暧昧程度
   - 防止公开场合说私密话、日常闲聊推进主线

4. `canon_fact_registry`
   - 保存不可随运行态 patch 改写的世界常量、路线限制和固定先验
   - 防止 AI 或临时逻辑改写硬规则基础

5. `consistency_validator`
   - 输出后检查越权、OOC、rumor as truth、擅自造事实和绕 gating
   - 让生成结果在进入 UI 前有系统级拦截点

这些层必须新增，因为本项目不是聊天器，而是有硬规则、宫廷身份、剧情节点和隐藏真相的模拟底座。只做 memory bucket，AI 仍然可能“知道太多、说太满、写太真、推进太快”。
