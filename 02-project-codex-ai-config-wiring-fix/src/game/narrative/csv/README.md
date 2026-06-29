# 剧情 CSV 表头说明

本文说明本目录下剧情 CSV 的统一表头含义。  
当前版本中，这些 CSV 是正常玩法唯一的剧情正文和基础演出元数据来源；AI 生成剧情暂不接入当前玩法链路。按钮逻辑、条件判断、数值公式、状态流转仍由 TypeScript 代码负责。

## 文件分工

| 文件 | 内容范围 |
| --- | --- |
| `opening_dialogues.csv` | 开场、路线引导、初始用度解释 |
| `map_chamber_dialogues.csv` | 地图引导、寝殿行动、地图 / 回宫 / 入地点转场、旬末 / 睡觉相关剧情 |
| `route_mainline_dialogues.csv` | 路线主线节点，例如影落掖庭主线 |
| `location_encounters.csv` | 御膳房、太医院、妙音堂、宝华殿、华清池等地点行动与偶遇 本地剧情 |
| `relationship_audiences.csv` | 妃嫔会面、太后会面、NPC 拜访玩家、送客 / 偶遇收束 |
| `emperor_yangxin_dialogues.csv` | 皇帝日间互动、养心殿求见、侍寝演出固定剧情 |
| `palace_strife_verdict.csv` | 宫斗调查、养心殿裁断、求情 / 旁听固定发言 |
| `npc_tools_dialogues.csv` | 宫门杜娘、阿翎、养心殿李公公等工具型 NPC 对话 |

新增剧情时先选择最接近的系统域文件，不要一段剧情新建一个 CSV，也不要把不同系统的剧情合并到一张大表。

## 统一表头

所有 CSV 必须使用同一套列名：

```csv
id,group,routeId,locationId,actorKey,actionId,variant,order,speakerIdentity,speakerName,portraitKey,portraitPlacement,narrationName,text,sceneHint,notes
```

`id`、`group`、`text` 是必填内容；其他列可按需要留空。虽然多数列可空，但列本身不能删，表头必须完整。

## 文案策划重点看这些列

如果只是编写、润色、调整剧情表现，最常用的是下面几列：

| 列名 | 为什么重要 | 文案侧怎么用 |
| --- | --- | --- |
| `id` | 剧情条目的唯一名字，代码按它找到这句文本 | 不要随意改。要新增分支时新建一个稳定 ID，不要覆盖别的剧情。 |
| `speakerIdentity` | 决定对话框里“身份”的显示 | 写“贴身宫女”“裁断者”“场景旁白”“御膳房管事”等。它影响玩家对说话者身份的理解。 |
| `speakerName` | 决定对话框里“名字”的显示 | 写“娇娇”“容安”“皇帝”“杜娘”等。玩家本人相关文本通常用“你 / 娘娘”，避免直接写死玩家姓名。 |
| `portraitKey` | 标记这句应该配谁的立绘 | 常用 `jiaojiao`、`emperor`、`eunuch`、`consort`、`du-niang`。目前部分立绘仍由代码兜底，但这里要先填对，方便后续统一。 |
| `portraitPlacement` | 标记立绘呈现位置 | 常用 `stage`。玩家立绘或特殊对话可用 `dialogue-left`。不需要立绘时留空。 |
| `narrationName` | 旁白或场景名 | 没有明确说话人时填场景，如“养心殿”“御膳房”；用于让旁白不看起来像角色发言。 |
| `text` | 剧情正文 | 这是最核心的文案列。正文变量用 `{{variableName}}`，换行写 `\n`，分页写 `<<PAGE_BREAK>>`。 |
| `sceneHint` | 场景提示或 本地剧情 辅助 | 适合写给系统或玩家的简短提示，说明这段对话发生后的状态、氛围或收束含义。 |
| `notes` | 给维护者看的备注 | 不进正式剧情。可写“裁断传唤”“御膳房 本地剧情”“影落掖庭特殊开场”等维护说明。 |

其他列更多是给代码筛选剧情用的匹配条件：

- `group`：系统分组，新增时按已有同类剧情填写。
- `routeId`：限定路线，不限定就留空。
- `locationId`：限定地点，不限定就留空。
- `actorKey`：限定角色或角色类别。
- `actionId`：限定行动。
- `variant`：限定同一行动下的不同版本。
- `order`：同组排序。

文案策划修改已有文本时，通常只需要改 `speakerIdentity`、`speakerName`、`portraitKey`、`portraitPlacement`、`narrationName`、`text`、`sceneHint`、`notes`。除非明确要改剧情匹配逻辑，否则不要改 `id`、`group`、`routeId`、`locationId`、`actorKey`、`actionId`、`variant`、`order`。

对话框下一步按钮文字不放在剧情 CSV 中，也不再作为剧情 turn / AI response / CSV 字段维护。线性剧情推进由对话框点击和流程状态决定；必须让玩家明确选择时，使用普通 `options`。

## 列含义

| 列名 | 是否必填 | 运行期用途 | 编辑说明 |
| --- | --- | --- | --- |
| `id` | 必填 | 代码引用剧情的稳定唯一 ID | 全局唯一，不随文案润色改名。建议使用 `系统.场景.动作.变体`，例如 `yangxin.verdict.summon`。 |
| `group` | 必填 | 供 `pickNarrativeEntry(group, criteria)` 按组查找 | 表示系统内分组，例如 `opening`、`location-action`、`yangxin-verdict`。 |
| `routeId` | 可空 | 路线匹配条件 | 只在剧情与特定路线绑定时填写，例如 `yingluoyeting`；空值表示不限定路线。 |
| `locationId` | 可空 | 地点匹配条件或演出辅助 | 可填地图地点 / 场景名，如 `御膳房`、`养心殿`；空值表示不限定地点。 |
| `actorKey` | 可空 | 角色或说话人匹配条件 | 用稳定 key 表示人物类别或角色，如 `jiaojiao`、`emperor`、`consort`、`du-niang`。 |
| `actionId` | 可空 | 行动匹配条件 | 用于区分同一场景下的不同行动，如 `study`、`listen`、`summon`、`farewell`。 |
| `variant` | 可空 | 分支变体匹配条件 | 用于同一行动的不同版本，如 `success`、`fail`、`public`、`yangxin`、`self`。 |
| `order` | 可空 | 同组排序 | 建议填数字字符串。用于同组多条线性剧情或兜底选择排序。 |
| `speakerIdentity` | 可空 | 对话框身份栏的身份部分 | 例如 `贴身宫女`、`裁断者`、`场景旁白`。显示时通常与 `speakerName` 组合。 |
| `speakerName` | 可空 | 对话框身份栏的名字部分 | 例如 `娇娇`、`容安`、`皇帝`。旁白可填场景名或留给 `narrationName`。 |
| `portraitKey` | 可空 | 立绘选择元数据 | 目前主要用于说明和后续扩展；现有部分 UI 仍在代码中按角色 ID 选择立绘。建议填稳定资源 key，如 `jiaojiao`、`emperor`、`consort`。 |
| `portraitPlacement` | 可空 | 立绘位置校验 | 允许值：空、`stage`、`dialogue-left`。填其他值会被 loader 判为错误。 |
| `narrationName` | 可空 | 旁白 / 场景名辅助 | 无明确说话人时用于场景提示，如 `养心殿`、`御膳房`。 |
| `text` | 必填 | 剧情正文模板 | 只能写正文，不写 JS 表达式、条件、数值公式。变量使用 `{{variableName}}`。 |
| `sceneHint` | 可空 | 场景提示 / 本地剧情 辅助 | 用于对话 runtime 的提示或描述性辅助，不一定直接展示。 |
| `notes` | 可空 | 编辑备注 | 给策划和开发看的说明；运行期不应依赖这里的内容。 |

## 文本写法

- 正文中的变量统一写成 `{{variableName}}`，例如 `{{playerName}}`、`{{rankLabel}}`、`{{locationName}}`。
- 缺失变量不会被运行期吞掉，会原样保留为 `{{variableName}}`，并由测试捕获。
- CSV 单元格内需要换行时写 `\n`，不要使用真实跨行单元格。
- 显式分页继续使用 `<<PAGE_BREAK>>`，可直接写在 `text` 中。
- 正文里有英文逗号、中文逗号、引号时，按标准 CSV 规则用双引号包住整格；格内双引号写成两个双引号。
- CSV 不写条件逻辑。复杂分支由代码选择不同 `id` 或 `variant`。

示例：

```csv
"yangxin.verdict.summon","yangxin-verdict","","寝殿","eunuch","summon","","1","传旨内侍","内侍","eunuch","stage","寝殿","养心殿传旨，请娘娘即刻前往听裁。","","裁断传唤"
```

## 代码如何读取

- `src/game/narrative/narrativeCatalog.ts` 通过 Vite `?raw` 静态导入所有 CSV。
- `getNarrativeEntry(id)`：按稳定 ID 读取原始完整条目。
- `renderNarrativeEntry(id, vars)`：读取完整 entry，并替换 `speakerIdentity`、`speakerName`、`portraitKey`、`narrationName`、`text`、`sceneHint` 等字段里的变量。需要同时消费说话人、立绘、旁白名和正文时，必须优先使用它，避免只配置正文、其他演出字段仍散落在代码里。
- `renderNarrativeText(id, vars)`：只读取 `text` 并替换变量。仅限纯文本 runtime 或测试使用；新写对话舞台流程不要优先用它。
- `pickNarrativeEntry(group, criteria)`：按 `group` 和可选条件挑选条目。
- `src/game/narrative/narrativeDialogueAdapter.ts` 是运行期消费层。正常剧情流程不应在业务代码里逐项拆 `entry.speakerName`、`entry.text`、`entry.portraitKey`；应按展示类型使用 `narrativeEntryToPresentation`、`narrativeEntryToOpeningDialogueFields`、`narrativeEntryToGlobalDialogueFields` 或 `narrativeEntryToConsortTurn`。只有 adapter、loader、测试可以直接解释 CSV entry 字段。

### 运行期消费规范

- 开场剧情：`renderNarrativeEntry(...)` 后交给 `narrativeEntryToOpeningDialogueFields(...)`，再叠加流程字段如 `mode`、`phase`、`options`。
- 寝殿 / 地图 / 普通全局舞台：使用 `narrativeEntryToPresentation(...)` 或 `narrativeEntryToGlobalDialogueFields(...)`。
- 妃嫔、太后、地点偶遇 本地剧情：使用 `narrativeEntryToDialogueFields(...)` / `narrativeEntryToConsortTurn(...)`。
- 送客、外景偶遇收束等复用剧情元数据的场景：使用 `narrativeEntryToPresentation(...)` 后再交给对应组件状态。
- AI 生成剧情暂不接入当前玩法；按钮、行动选项、数值结算、条件分支不属于 CSV entry，这些仍由 runtime 自己维护。

## 校验规则

CSV loader 会校验：

- 表头必须包含统一列名。
- `id`、`group`、`text` 不能为空。
- `id` 必须全局唯一。
- `portraitPlacement` 只能是空、`stage`、`dialogue-left`。
- 代码中通过 `renderNarrativeEntry` / `renderNarrativeText` 直接引用的 ID 必须存在。

新增 CSV 内容后，至少运行：

```bash
npx vitest run src/game/narrative/csvNarrativeLoader.test.ts --reporter=verbose
```

如果改动影响开场、地图、会面、侍寝或裁断流程，还应补跑对应 `app-flow` 测试。
