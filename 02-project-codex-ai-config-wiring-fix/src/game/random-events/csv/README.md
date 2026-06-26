# 随机事件 CSV 说明

`random_events.csv` 是随机事件系统的唯一数据表。当前系统已经接入宫门杜娘闲谈；其他入口后续迁移时也应从这里按 `poolId` 抽取事件。事件定义、剧情行、选项、效果和解锁关系都维护在本表，store 只保存触发计数、已解锁事件和待解锁事件，不保存正文。

## 行类型

- `event`：事件元信息。只维护 `eventId`、`poolId`、`weight`、`repeatPolicy`、`prerequisiteEventIds`。
- `line`：剧情行。维护分支、顺序、说话人与正文，也可以在离开这一行时触发效果或解锁后续事件。
- `option`：选项行。只能挂在 `branchId=start`。选中时立刻触发该行效果或解锁后续，再进入 `nextBranchId` 指向的结果分支。

第一版每个事件最多只有一组选项；结果分支不能再出现选项。没有选项的事件只能有 `start` 分支。

## 表头

- `eventId`：事件稳定 ID。同一个事件的 `event / line / option` 行都写同一个 ID。
- `rowType`：行类型，只能是 `event`、`line`、`option`。
- `poolId`：事件池 ID，自由字符串。调用方按完全匹配抽取，例如 `target.public`。
- `weight`：抽取权重。空值按 `1` 处理，必须大于 `0`。
- `repeatPolicy`：重复规则，只能是 `once` 或 `repeatable`。
- `prerequisiteEventIds`：前置事件 ID，用 `|` 分隔。空值表示默认可抽；`a|b` 表示两个事件都必须触发过。
- `branchId`：剧情分支 ID。起始分支固定为 `start`。
- `order`：同一分支内剧情行顺序，从小到大播放。
- `speakerIdentity`：说话人身份或旁白身份，例如 `场景旁白`、`目标`、`{{playerRank}}`。
- `speakerName`：显示名模板。可以写 `{{targetName}}` 这类变量。
- `portraitKey`：立绘 key。没有立绘则留空。
- `portraitPlacement`：立绘位置，只能留空、`stage` 或 `dialogue-left`。
- `narrationName`：旁白名。通常用于地点或场景名。
- `text`：剧情正文模板。需要换行时写 `\n`，不要在单元格里写真实换行。
- `sceneHint`：场景提示，可用于后续 UI 选择背景或舞台提示。
- `optionId`：选项稳定 ID。同一事件内不能重复。
- `optionLabel`：玩家看到的选项文字。
- `nextBranchId`：选项后的结果分支。留空表示选中后直接结束事件。
- `effectJson`：局部 JSON 效果，只支持 `player`、`target`、`inventory`。
- `unlockEventIds`：这一行或这个选项会解锁的事件 ID，用 `|` 分隔。当前不会立刻加入可抽池，而是写入 `pendingUnlocks`，到下一旬清晨后才释放到 `unlockedEventIds`。
- `notes`：策划备注，不进入运行时表演。

## 文案策划最常改的列

- 剧情正文：`text`
- 说话人：`speakerIdentity`、`speakerName`
- 立绘：`portraitKey`、`portraitPlacement`
- 选项：`optionId`、`optionLabel`、`nextBranchId`
- 解锁关系：`prerequisiteEventIds`、`unlockEventIds`
- 效果：`effectJson`

位分、住处、称呼不要在正文里写死。正文、说话人字段和 `portraitKey` 都可以使用 `{{playerRank}}`、`{{playerAddress}}`、`{{targetRank}}`、`{{targetAddress}}` 等变量，由 runtime 根据当前玩家和目标状态填入。玩家发言行的 `speakerIdentity` 不得写死为“玩家”，应写 `{{playerRank}}`；玩家发言行必须写 `portraitKey=player`，并填写 `portraitPlacement`，当前宫门人物页会据此切换到当前路线玩家立绘。

## 支持变量

第一版支持这些变量：

`{{playerName}}`、`{{playerSurname}}`、`{{playerRank}}`、`{{playerResidence}}`、`{{playerAddress}}`、`{{targetName}}`、`{{targetSurname}}`、`{{targetRank}}`、`{{targetResidence}}`、`{{targetAddress}}`、`{{locationName}}`、`{{timeLabel}}`

缺失变量不会被静默删除，会保留为 `{{variableName}}`，方便测试发现。

## effectJson 范围

只允许写局部 JSON，不支持公式、条件、多目标、flag、可见性或直接触发宫斗案件。

```json
{"player":{"prestige":1,"stats":{"intrigue":1}}}
```

```json
{"target":{"relationToPlayer":2,"stress":1}}
```

```json
{"inventory":{"gain":[{"itemId":"plain-sachet","quantity":1}],"lose":[{"itemId":"silver-hairpin","quantity":1}]}}
```

`player` 可调整：`prestige`、`favor`、`stress`、`silver`、`trueHeart`、`stats`。

`target` 只指当前目标。目标是妃嫔时可调整：`relationToPlayer`、`prestige`、`favor`、`stress`、`health`；目标是常驻 NPC 时只支持 `relationToPlayer`，运行时会映射到该 NPC 的 `affinity`。

`inventory` 只支持 `gain` / `lose`，数量必须是正整数。

## 当前已用事件池

- `npc.du-niang.common`：杜娘通用闲谈。
- `npc.du-niang.low-affinity`：杜娘低好感闲谈与后续。
- `npc.du-niang.high-affinity`：杜娘高好感闲谈。

杜娘闲谈会从通用池和当前好感池合并抽取。闲谈 / 送礼消耗常驻 NPC 每旬交互次数，买卖不消耗次数。

杜娘当前维护 25 个闲谈事件：通用池 12 个、低好感池 4 个、高好感池 9 个。写作口径是“宫门内外倒卖小贩”：优先写她在宫门口听来的日常、宫外街坊、小本买卖、熟人琐事和对宫内生活的好奇；不要把所有对白都写成抽象后宫题材旁白。普通游戏流程的 `text` 应优先写成可直接放入对白框的台词，不写电视剧剧本式环境 / 动作描写，也不需要用“杜娘笑道”“她把箱子……”承接；只有会影响玩家理解的货物、交易或关系信息，才可极短补充。

杜娘闲谈不能只是空对白：每个事件的 `start` 剧情行或选项必须至少有一次 `target.relationToPlayer` 正收益；有选项的事件，每个选项也必须提供正向好感收益，避免玩家花费互动次数后没有任何收益。
