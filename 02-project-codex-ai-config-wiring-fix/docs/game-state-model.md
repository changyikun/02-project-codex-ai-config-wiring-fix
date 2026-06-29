# 游戏统一状态模型 V1

## 1. 文档目标
- 这份文档只解决一件事：让前端、后端、存档、AI、数值结算共用同一套状态口径。
- 所有会影响胜负、晋升、怀孕、死亡、结局的字段，必须先写进状态模型，再允许接 UI 或 AI。
- V1 原则是“硬规则先算，AI 后包装”。AI 不直接决定真实数值，不直接写入存档真值。

## 2. V1 定版决定

### 2.1 时间单位
- 基础行动单位：`1 时间格`
- 每旬固定 `7` 格：
  - `0 清晨`
  - `1 上午`
  - `2 中午`
  - `3 下午`
  - `4 傍晚`
  - `5 夜晚`
  - `6 深夜`
- 每月固定 `3 旬`
- 每年固定 `12 月`
- 主循环内不使用浮点时间。引导剧情可临时用 `slotProgress`，但不作为长期存档真值。

### 2.2 体力口径
- 统一改为设计文档口径：
  - `stamina.max = 15`
  - `stamina.defaultPerXun = 10`
  - `stamina.min = 0`
- 跨旬刷新时，必须在下一旬清晨重新计算 `stamina`，不得直接继承上一旬剩余值。
- 当前基础公式先固定为 `nextXunStamina = stamina.defaultPerXun = 10`；未来若接入怀孕 / 伤病 / 特殊状态修正，也必须从这个跨旬重算入口叠加。
- 当前代码中的 `stamina = 100` 只是过渡值，V1 必须收口为 `0..15`。

### 2.3 主属性与副属性标准键
- 属性分配页中的 `state.stats` 是临时加点单位；点击“确认进入剧情”后必须调用 `finalizeAttributeAssignment()`，将所有玩家属性折算为运行时真值，并写入 `flags.attributeStatsFinalized=true`。
- 确认进入剧情后的正式游戏、存档、toast 和 runtime 公式只读取运行时真值；不得把加点单位继续带入正式流程，也不得对运行时真值再次执行加点倍率换算。
- 存档恢复时，`flags.attributeStatsFinalized=true` 是属性创建阶段已经结束的边界；此类存档即使尚未完成开场引导，也必须恢复到开场对白，不得回到属性分配页。
- 主属性：
  - `health` 健康，范围 `0..1000`
  - `fortune` 福德，运行时范围 `-100..100`；属性分配阶段可暂存 2..8 点，确认进入剧情时按每点 10 折算成运行时福德值
  - `intrigue` 心计，范围 `0..1000`
  - `appearance` 容貌，范围 `0..1000`
  - `temperament` 气质，范围 `0..1000`
- 资源属性：
  - `prestige` 声望，范围 `-2000..5000`
  - `favor` 宠爱，范围 `-100..100`
  - `stress` 压力，范围 `0..100`
  - `ambition` 野心，范围 `-100..100`
  - `silver` 银两，范围 `0..999999`
- 开发期可通过浏览器控制台 `palaceDebug.addSilver(数量)` 增加银两，或通过 `palaceDebug.addPrestige(数量)` 增加声望；这两个入口必须走 store 正式动作，同步 `state` 与 `hiddenStats` 的对应字段，并按当前主界面触发数值反馈。它们只用于调试，不得写入正式经济 / 声望来源设计。
- 副属性：
  - `poetry` 诗词，范围 `0..100`
  - `talent` 乐理，范围 `0..100`（沿用既有字段名，显示名不再按“才艺”解释）
  - `painting` 丹青，范围 `0..100`
  - `embroidery` 刺绣，范围 `0..100`
  - `medicine` 药理，范围 `0..100`
  - `politics` 政治，范围 `0..100`
- 属性分配阶段换算倍率：
  - 健康 / 心计 / 容貌 / 气质：`1` 加点 = `100` 运行时值。
  - 福德：`1` 加点 = `10` 运行时值。
- 诗词 / 乐理 / 丹青 / 刺绣 / 药理 / 政治：`1` 加点 = `10` 运行时值。

### 2.4 命名收口
- 玩家属性 schema 不新增乐理字段；当前前端长期真值继续使用既有 `talent` 字段承载乐理数值，界面与规则文案显示为“乐理”。
- 恢复旧的持久化状态时如遇到历史过渡字段 `music`，只允许一次性归并到 `talent`，不得继续把 `music` 作为玩家属性字段写回。
- 当前后端 Calc 契约中的 `charm / intellect / resilience` 不再作为长期主键。
- Calc 和 Narrative 之后都应只接收标准键，不再维护第二套翻译字段。

### 2.5 AI 边界
- 规则引擎负责：
  - 能不能做
  - 成功率是多少
  - 数值怎么变
  - 是否建案
  - 是否晋升
  - 是否怀孕
- AI 负责：
  - 对白
  - 文案细化
  - 三选项措辞
  - 阶段文风变化
  - 月度/案件/宫斗结果总结

## 3. 顶层存档结构

```ts
interface SaveGameV1 {
  meta: SaveMeta;
  world: WorldState;
  player: PlayerState;
  emperor: EmperorState;
  consorts: Record<string, ConsortState>;
  palace: PalaceState;
  relations: RelationState[];
  inventory: InventoryState;
  events: EventQueueState;
  cases: Record<string, CaseFileState>;
  route: RouteState;
  aiContext: AiContextState;
}
```

### 3.1 当前前端落地

当前前端已经落地单槽 `SaveGameV1`，实现位置为 `src/game/save/saveGameV1.ts` 与 `src/game/store/gameFlowStore.ts`。完整维护规则见 `docs/save-system-maintenance.md`。

当前持久化口径：

- 浏览器存储 key 为 `palace-galgame-flow`。
- `localStorage` 中保存的是 Zustand persist envelope：`{ state: { saveGame: SaveGameV1 }, version }`。
- `SaveGameV1` 只保存长期真值，不保存 `currentView`、弹窗、临时对白、地图临时文本等 UI 状态。
- 启动页“开始”会二级确认，确认后清空旧 envelope，从初始状态创建新局并写入新存档。
- 启动页“回溯”会读取上一次 `SaveGameV1`，并根据 durable state 推断恢复到路线选择、属性页、地图或寝殿。
- 当前游戏仍处开发阶段，存档结构不做跨版本迁移；缺少当前必需字段、schema 不匹配或 envelope 解析失败时，直接删除旧存档并让回溯显示无可用存档。
- 系统宫宴进度保存于 `progress.palaceBanquet`，包括当前宫宴季、已提交曲谱快照、报名提醒标记、已结算宫宴季和最近一次宫宴结果。
- 妙音堂曲谱学习进度保存于 `progress.musicHall.musicScoreMastery`，按曲谱 ID 记录难度、完成度、练习次数、表现上限、最近一次练习预演表现分和最近练习时间；后续若字段结构变化，必须清旧档或提升 schema，不做旧字段 fallback。
- 绣花、字画、调香作品进度保存于 `progress.craftWorks.activeWorks`。作品由点击寝殿对应行动进入对应类别面板后创建和推进，记录作品 ID、类别、进度、制作次数、成色评分、开始时间和最近制作时间；完成后从进行中列表移除并生成 `gift` 背包物品。当前 schema 为 `6`，缺少 `progress.craftWorks` 的旧存档按开发期规则直接清除。
- 随机事件进度保存于 `progress.randomEvents`。`triggerCounts` 记录已触发次数，`unlockedEventIds` 记录已经进入可抽池的后续事件，`pendingUnlocks` 记录已经由剧情行或选项解锁但要到下一旬清晨才释放的事件。
- 妃嫔旬级行动保存于 `progress.npcActivity`，记录当前旬每名 live 且非冷宫妃嫔的主行动、地点、目的、目标与是否已被玩家看见 / 触发。
- 皇帝日间互动进度保存于 `progress.emperorInteraction`，记录当前旬已触发的正阳门等待下朝、经李公公通传的养心殿求见或公共地点皇帝互动。皇帝本旬行程保存为 `schedule.slots[时辰].location`，当前心情保存为 `mood`；公共偶遇、养心殿求见和李公公闲聊都读取这份状态，不再在 UI 或求见时临时生成行程。侍寝 / 独寝结算改变皇帝心情时，必须同步写回 `progress.emperorInteraction.mood`。日间会面的动作与结算由 `emperorDayAudienceRuntime` 维护。本次会面的 `2` 次互动计数只存在于当前 `EmperorAudiencePanel`，退出即收束，不写入存档；`activeMapLocationEntryTime` 只作为本次地点入场临时上下文，也不写入存档。
- 公共外出 NPC 在 `resolved=true` 后仍应保留在原目的地展示，只禁用重复交互；这里的 `resolved` 表示玩家已交谈，不表示 NPC 离开地点。
- 未收束的 `visit-consort.targetConsortId` 是被拜访者本旬寝宫会客的真值；即使该目标自己的条目仍是公共外出，UI 也必须按目标在寝宫会客处理，并从公共地点可交互名单中排除。玩家结束殿内会客后，`visit-consort.resolved=true` 表示会客收束：来访者回自己的寝宫，被拜访者不再显示“会客中”。
- NPC-NPC 真实关系保存于 `relations.npcRelationMatrix`，展示用 `allies / rivals` 只作为初始倾向；旬末送礼、试探、拉拢、传话、施压等变化以关系矩阵为准。
- 常驻 NPC 与玩家的关系保存于 `relations.permanentNpcRelationships`。当前用于宫门杜娘、阿翎、建章宫太后和养心殿李公公，记录是否初见、长期好感、当前旬交互次数和最后一次互动；常驻 NPC 的买卖不耗次数，闲谈 / 送礼 / 打点银两 / 太后有效互动耗次数，缺少该关系块的旧存档不做默认补齐迁移。太后关系额外保存 `lastDowagerGreetingMonthKey` 与 `lastDowagerGreetingXunKey`，用于判断月度问安义务和每旬 `请安` 限制。
- 玩家与妃嫔的普通互动进度保存于 `relations.consortInteractionMap`。每个 `ConsortInteractionProgress` 以 `consortId + xunKey` 记录本旬好感 / 倾情变化量和 `actionCountThisXun`；玩家主动会面、公共地点对妃嫔的关系判定每旬每人最多 `3` 次，次数用尽后不得再写入普通关系变化。NPC 拜访玩家不走此计数，而由 `npcActivity.triggeredVisitIds` 保证每条拜访只触发一次。
- 互动计数触顶是剧情节奏状态，不是单纯 UI 禁用状态。最后一次主动会面互动后必须进入送客对白并退出场景；同旬再次拜访不得扣体力 / 推进时间，只显示宫人婉拒。
- 人物会面退出时，时间推进取决于“本次会面是否实际消耗过交互次数 / 主行动”。若妃嫔、公共地点偶遇妃嫔、常驻 NPC、太后或皇帝日间互动在本次页面内至少耗次一次，则主动返回或送客退出时推进 `1` 个时间格，并走地点行动同一套深夜睡觉收束；买卖、选礼、夜间拒见和单纯进入退出不推进时间。
- 毒药属于普通 `inventory` 数量物品，来源为掖庭院月姑姑交易；玩家主动下毒在 QTE 成功登记案件时通过 `consumeInventoryItem` 扣除对应毒药 `1` 份，失败不扣。
- 作品完成品属于普通 `inventory` 礼物物品，`itemId` 以 `crafted:` 开头。完成品可按礼物逻辑赠送，也可通过现有变卖逻辑换银两；调香第一版只作为礼物 / 商品，不接毒药、药效或特殊状态。
- 宫斗案件保存于 `cases.palaceStrifeCases`。v0.5.1 起，每个案件必须包含 `suspects` 数组，最多三名嫌疑人；每名嫌疑人保存主体类型、主体 ID、名称、定案率、是否实际发起者、是否被嫁祸以及嫌疑理由。`convictionRate` 仅同步最高嫌疑人的定案率，用于旧 UI 兼容展示，不再作为唯一裁判字段。
- 嫌疑人定案率达到 `100` 时，案件先写入 `status='pending_verdict'` 与 `pendingVerdictSuspectId`，不立即写 `convictedSuspectId`，也不立即扣处罚。玩家相关待裁断案由 `cases.pendingYangxinVerdict` 保存当前养心殿传唤 / 发言 / 选择 / 裁断事件状态；裁断完成后才写入 `convictedSuspectId`、`verdictSummary`、`penaltyApplied`、`archivedXunKey` 与 `resolutionSummary`。
- 三旬无人达到 `100` 定案率时，案件以疑案归档。旧存档若存在宫斗案件但缺少 `suspects`、缺少当前必需的 `cases.pendingYangxinVerdict` 字段、缺少 `progress.emperorInteraction.schedule`、缺少 `progress.emperorInteraction.mood`、缺少 `progress.randomEvents`、`relations.permanentNpcRelationships`，或 `consortInteractionMap` 里已有记录但缺少 `actionCountThisXun`，按开发期策略直接清档，不做 `convictionRate -> suspects`、旧事件结构、皇帝互动进度、随机事件进度、常驻 NPC 关系或互动计数迁移 fallback。

## 4. 顶层模块定义

### 4.1 `meta`
- `saveId`: 存档 ID
- `version`: 数据版本，固定为 `v1`
- `createdAt`
- `updatedAt`
- `checksum`
- `lastActionTraceId`

### 4.2 `world`
- `year`
- `month`
- `xun`
- `slotIndex`
- `slot`
- `phase`
  - `free` 自由行动
  - `forced` 强制事件
  - `settlement` 月结算
- `nightDuty`
  - `none`
  - `serve-emperor`
  - `banquet`
  - `case-forced`
- `recentDeathsHalfYear`
- `currentFestivalId?`
- `selectionYearCounter`

### 4.3 `player`

```ts
interface PlayerState {
  id: 'player';
  name: string;
  routeId: 'lanyinxuguo' | 'fushengrumeng' | 'yingluoyeting' | 'chenyuansucuo';
  age: number;
  familyId: string;
  familyLabel: string;
  rankId: RankId;
  residencePalaceId?: string;
  residenceRoomType?: 'main' | 'side' | 'wing';
  silver: number;
  stamina: number;
  maxStamina: 15;
  prestige: number;
  favor: number;
  stress: number;
  ambition: number;
  fortune: number;
  health: number;
  intrigue: number;
  appearance: number;
  temperament: number;
  skills: {
    poetry: number;
    talent: number;
    painting: number;
    embroidery: number;
    medicine: number;
    politics: number;
  };
  hidden: {
    lifespan: number;
    emperorTrueHeart: number;
    fertilityModifier: number;
    corruptionTag: number;
  };
  social: {
    dowagerFavor: number;
    servantFavor: number;
    officialLoyalty: number;
  };
  flags: {
    inColdPalace: boolean;
    canManageHarem: boolean;
    statsLocked: boolean;
    routeExclusiveQueenPath: boolean;
    alive: boolean;
    insane: boolean;
  };
  pregnancy: PregnancyState;
  nightly: {
    summonPity: number;
    servedThisMonth: number;
    servedLastMonth: number;
    lastServedAt?: TimeStampKey;
    lastInterestScore?: number;
  };
  intrigueState: {
    scandal: number;
    blacklist: string[];
    recentCrimeLevel: 0 | 1 | 2 | 3;
  };
}
```

### 4.4 `emperor`

```ts
interface EmperorState {
  id: 'emperor';
  name: string;
  age: number;
  mood: number;
  moodStage: '悲痛' | '悲伤' | '低落' | '平常' | '愉悦' | '喜悦';
  life: number;
  nightlySoloRate: number;
  recentDeathsThisMonth: number;
  recentNoDeathMonths: number;
  sincerityMap: Record<string, number>;
  interestMap: Record<string, number>;
  specialFlags: {
    hasEmpress: boolean;
    hasImperialHeir: boolean;
    avoidsCourtBecauseOfHeat: boolean;
  };
}
```

### 4.5 `consorts`

```ts
interface ConsortState {
  id: string;
  sourceType: 'fixed' | 'random' | 'custom';
  routeTag?: string;
  name: string;
  age: number;
  personality: '温柔' | '活泼' | '清冷' | '势利' | '圆滑';
  familyId: string;
  familyLabel: string;
  rankId: RankId;
  residencePalaceId?: string;
  residenceRoomType?: 'main' | 'side' | 'wing';
  silver: number;
  prestige: number;
  favor: number;
  stress: number;
  ambition: number;
  fortune: number;
  health: number;
  intrigue: number;
  appearance: number;
  temperament: number;
  skills: {
    poetry: number;
    talent: number;
    painting: number;
    embroidery: number;
    medicine: number;
    politics: number;
  };
  relationToPlayer: {
    goodwill: number;
    affection: number;
    hostility: number;
    corruption: number;
  };
  hidden: {
    trueHeartToEmperor: number;
    affectionToPlayer: number;
    blackening: number;
    fertilityModifier: number;
  };
  flags: {
    alive: boolean;
    insane: boolean;
    inColdPalace: boolean;
    pregnant: boolean;
    hasChild: boolean;
    canBeTargeted: boolean;
  };
  pregnancy: PregnancyState;
  nightly: {
    servedThisMonth: number;
    lastServedAt?: TimeStampKey;
    lastInterestScore?: number;
  };
}
```

### 4.6 `palace`

```ts
interface PalaceState {
  locations: Record<
    string,
    {
      id: string;
      name: string;
      openSlots: number[];
      type: 'map' | 'residence' | 'system';
      unlocked: boolean;
    }
  >;
  residences: Record<
    string,
    {
      id: string;
      name: string;
      capacity: 6;
      mainHall?: string;
      sideHalls: string[];
      wingRooms: string[];
    }
  >;
}
```

### 4.7 `relations`
- 用于保存非后妃攻略角色和长期关系链。

```ts
interface RelationState {
  sourceId: string;
  targetId: string;
  relationType: 'ally' | 'enemy' | 'romance' | 'family' | 'court';
  favor: number;
  affection: number;
  trust: number;
  hostility: number;
  lastChangedAt: TimeStampKey;
}
```

`relations.permanentNpcRelationships` 以常驻 NPC ID 为 key。`dowager` 代表建章宫太后，不属于妃嫔 roster；`li-gonggong` 代表养心殿太监总管李公公，其 `affinity` 会修正经他通传求见皇帝的成功率。太后关系状态除通用 `affinity / actionCountThisXun / lastActionId` 外，还使用 `lastDowagerGreetingMonthKey` 记录本月是否已向太后问安，使用 `lastDowagerGreetingXunKey` 限制每旬只能 `请安` 一次。

### 4.8 `inventory`

```ts
interface InventoryState {
  silver: number;
  items: Array<{
    itemId: string;
    name: string;
    category: 'gift' | 'food' | 'medicine' | 'poison' | 'quest';
    rarity: 'gray' | 'green' | 'blue' | 'purple' | 'red';
    quantity: number;
    expireAt?: TimeStampKey;
    metadata?: Record<string, string | number | boolean | null>;
  }>;
}
```

`metadata` 只用于同名实例物品的隐藏判定，例如御膳房银叶耳坠记录 `earringOwnerConsortId` 与提示字。玩家仍可把这类物品卖掉或送给任意对象；只有送给 metadata 中记录的失主时，送礼入口才触发额外彩蛋对白和好感奖励。metadata 不承载剧情正文、公式或多目标状态。

### 4.9 `events`

```ts
interface EventQueueState {
  pending: GameEventState[];
  history: GameEventState[];
}

interface GameEventState {
  eventId: string;
  type:
    | 'opening'
    | 'map'
    | 'banquet'
    | 'selection'
    | 'tribute'
    | 'nightly'
    | 'promotion'
    | 'pregnancy'
    | 'case'
    | 'ending';
  priority: number;
  scheduledAt: TimeStampKey;
  payload: Record<string, unknown>;
  resolved: boolean;
}
```

### 4.10 `cases`

```ts
interface CaseFileState {
  caseId: string;
  caseType: 'poison' | 'rumor' | 'theft' | 'miscarriage' | 'death';
  severity: 'low' | 'medium' | 'high' | 'lethal';
  victimId: string;
  status: 'collecting' | 'investigating' | 'verdict' | 'closed';
  createdAt: TimeStampKey;
  dueAt: TimeStampKey;
  turnsRemaining: number;
  imperialAttention: number;
  publicHeat: number;
  suspects: Array<{
    actorId: string;
    suspicion: number;
    evidence: number;
    alibi: number;
    concealment: number;
  }>;
  notes: string[];
  outcome?: {
    verdict: 'convicted' | 'suspicious' | 'unsolved';
    punishedActorId?: string;
    penaltyLevel?: number;
  };
}
```

### 4.11 `route`
- `routeId`
- `routeStage`
- `endingFlags`
- `exclusiveFlags`
- `unlockFlags`
- `scriptProgress`

### 4.12 `aiContext`
- 只存 AI 可读快照，不存 AI 真相源。

```ts
interface AiContextState {
  lastCalcTraceId?: string;
  lastNarrativeTraceId?: string;
  openingDialogueHistory: Array<{ speaker: string; text: string }>;
  monthlySummarySeeds: string[];
  cachedPrompts: Record<string, string>;
}
```

## 5. 关键子结构

### 5.1 `PregnancyState`

```ts
interface PregnancyState {
  status: 'none' | 'suspected' | 'confirmed' | 'stable' | 'late' | 'miscarried' | 'delivered';
  fatherId?: string;
  monthCount: number;
  conceptionAt?: TimeStampKey;
  dueMonth?: number;
  risk: number;
  protectedByMedicine: boolean;
  forcedAbort: boolean;
}
```

### 5.2 `RankId`
- 使用稳定英文 ID，显示名走字典。
- 例如：
  - `queen`
  - `imperial_noble_consort`
  - `noble_consort`
  - `consort`
  - `nine_pins`
  - `guipin`
  - `jieyu`
  - `ronghua`
  - `pin`
  - `guiren`
  - `meiren`
  - `cairen`
  - `changzai`
  - `yunv`
  - `xuanshi`
  - `daying`
  - `gengyi`
  - `gongnver`

### 5.3 `TimeStampKey`
- 固定格式：`Y{year}-M{month}-X{xun}-S{slotIndex}`
- 示例：`Y1-M3-X2-S5`

## 6. V1 强制落地字段
- 如果某字段会参与公式，就必须存档：
  - 玩家 `prestige / favor / stress / ambition / fortune`
  - 皇帝 `mood / sincerityMap / interestMap`
  - NPC `goodwill / affection / blackening / trueHeartToEmperor`
  - `progress.npcActivity`
  - `progress.randomEvents`
  - `relations.npcRelationMatrix`
  - `relations.permanentNpcRelationships`
  - `pregnancy`
  - `cases`
  - `nightly`
  - `inColdPalace / insane / alive`

## 7. 当前代码迁移建议
- `src/game/store/gameFlowStore.ts`
  - `stamina` 从 `100` 改为 `15` 制
  - `slotProgress` 改为仅 UI 使用
- `src/game/data/config.ts`
  - 保持玩家属性字段集合稳定，不再新增 `music`；乐理显示名继续落在既有 `talent` 字段上
- `server/src/types/contracts.ts`
  - Calc 请求体中的 `baseStats` 改为标准键
- 所有 AI prompt 改为使用统一状态快照，不再手写映射

## 8. 先不做的内容
- V1 不强制实现：
  - 全量子嗣教育系统
  - 朝堂派系详细模拟
  - 全 NPC 独立经济系统
  - 复杂遗诏和储位争夺
- 但必须预留字段，不允许以后推翻存档结构。

## 9. UI 临时态边界

- 剧情 / 对话是否正在显示属于 UI 临时态，不写入 `SaveGameV1`。
- `dialogueText`、`mapEventText`、`selectedHotspotId`、`activeGongmenNpc`、`expenseStrategyPanelOpen` 等只用于当前页面交互，不是长期存档真值。
- 这些临时态仍然会影响点击合法性：对白、通报或剧情结果未收起前，背景按钮必须被交互锁屏蔽。
- 后续若要把某段剧情推进变为长期进度，必须新增独立的 `flags` / `progress` 字段，而不是依赖当前是否有对话框显示。
