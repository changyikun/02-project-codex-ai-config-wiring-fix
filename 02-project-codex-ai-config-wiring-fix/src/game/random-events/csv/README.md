# 随机事件 CSV 说明

`random_events.csv` 是随机事件系统的唯一数据表。当前系统已经接入宫门杜娘闲谈、御膳房闲逛、妙音堂闲逛和妙音堂人物闲聊；其他入口后续迁移时也应从这里按 `poolId` 抽取事件。事件定义、剧情行、选项、效果和解锁关系都维护在本表，store 只保存触发计数、已解锁事件和待解锁事件，不保存正文。固定初遇、固定教学、固定送礼等确定事件不放入本表，应维护在普通剧情 CSV。

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

入口可以额外传入局部变量。例如御膳房闲逛会传 `{{earringMark}}`、`{{earringOwnerConsortId}}`、`{{earringItemId}}`，用于“刻了某个妃嫔名字一字”的银叶耳坠实例；妙音堂闲逛会传 `{{handkerchiefMark}}`、`{{handkerchiefOwnerConsortId}}`、`{{handkerchiefItemId}}`，用于“绣着某个妃嫔名字一字”的兰花绢帕实例；御膳房也会按通用物品 tag 传入 `{{lowQualityFoodName}}` / `{{lowQualityFoodItemId}}`、`{{treeFruitName}}` / `{{treeFruitItemId}}`，用于把 `【低品质食物】`、`【树上果实】` 这类占位渲染成具体物品。

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

`effectJson` 里的 `inventory.gain[].itemId` / `inventory.lose[].itemId` 可以使用 `{{variableName}}`。运行时会先渲染变量，再应用效果；变量来源应由入口通过通用物品 tag 系统或入口自身的稳定 seeded 规则决定，不能在随机事件 CSV 里写自定义随机语法。

如果随机事件需要生成“同名但独立”的实例物品，可以在 `inventory.gain[]` 中写：

```json
{
  "itemId": "{{earringItemId}}",
  "templateItemId": "silver-leaf-earring",
  "quantity": 1,
  "description": "一枚银叶形耳坠，背面刻着细小的“{{earringMark}}”字。",
  "metadata": {
    "earringOwnerConsortId": "{{earringOwnerConsortId}}",
    "earringMark": "{{earringMark}}"
  }
}
```

`templateItemId` 必须指向 `inventory_items.csv` 中已有物品，运行时会继承模板的名称、分类、价格和礼物效果，再覆盖实例 `itemId`、`description` 与 `metadata`。`metadata` 只保存字符串、数字、布尔值或 `null`，用于后续业务判断；不要在 metadata 里写剧情正文、公式或多目标状态。当前失物归还彩蛋由 `lostItemReturnRuntime` 识别 `earringOwnerConsortId` 或 `handkerchiefOwnerConsortId`，对应特殊对白仍维护在普通剧情 CSV `relationship_audiences.csv` 中。

`player` 可调整：`prestige`、`favor`、`stress`、`silver`、`trueHeart`、`stats`。

`target` 只指当前目标。目标是妃嫔时可调整：`relationToPlayer`、`prestige`、`favor`、`stress`、`health`；目标是常驻 NPC 时只支持 `relationToPlayer`，运行时会映射到该 NPC 的 `affinity`。

`inventory` 只支持 `gain` / `lose`，数量必须是正整数。`lose` 只按最终 `itemId` 扣除，不读取 `templateItemId`。

## 当前已用事件池

- `npc.du-niang.common`：杜娘通用闲谈。
- `npc.du-niang.low-affinity`：杜娘低好感闲谈与后续。
- `npc.du-niang.high-affinity`：杜娘高好感闲谈。
- `location.kitchen.stroll`：御膳房闲逛事件。
- `location.miaoyin.common`：妙音堂通用闲逛事件。
- `location.miaoyin.music`：妙音堂乐曲池事件。
- `location.miaoyin.dance`：妙音堂舞蹈池事件。
- `npc.miaoyin-musician.common`：凌萧通用闲聊。
- `npc.miaoyin-musician.low-affinity`：凌萧低好感闲聊。
- `npc.miaoyin-musician.high-affinity`：凌萧高好感闲聊。
- `npc.miaoyin-musician.pipa-pick`：凌萧琵琶拨片后续闲聊。
- `npc.miaoyin-dancer.common`：凌袖通用闲聊。
- `npc.miaoyin-dancer.low-affinity`：凌袖低好感闲聊。
- `npc.miaoyin-dancer.high-affinity`：凌袖高好感闲聊。

杜娘闲谈会从通用池和当前好感池合并抽取。闲谈 / 送礼消耗常驻 NPC 每旬交互次数，买卖不消耗次数。

杜娘当前维护 25 个闲谈事件：通用池 12 个、低好感池 4 个、高好感池 9 个。写作口径是“宫门内外倒卖小贩”：优先写她在宫门口听来的日常、宫外街坊、小本买卖、熟人琐事和对宫内生活的好奇；不要把所有对白都写成抽象后宫题材旁白。普通游戏流程的 `text` 应优先写成可直接放入对白框的台词，不写电视剧剧本式环境 / 动作描写，也不需要用“杜娘笑道”“她把箱子……”承接；只有会影响玩家理解的货物、交易或关系信息，才可极短补充。

杜娘闲谈不能只是空对白：每个事件的 `start` 剧情行或选项必须至少有一次 `target.relationToPlayer` 正收益；有选项的事件，每个选项也必须提供正向好感收益，避免玩家花费互动次数后没有任何收益。

杜娘闲谈虽然会合并多个事件池，但抽取仍必须走随机事件 runtime 的多池 seeded helper。地点组件只负责提供 `poolIds`、当前进度和种子，不得使用 `Math.random` 或私有权重抽取器。

御膳房闲逛当前维护 19 个事件，来源于玩家给出的御膳房闲逛文本。写作口径是“玩家在膳房角落看到的人、物和小意外”，可以有小太监、宫女、厨子、偏库、旧物、遗落物和食材；不要把闲逛写成纯说明或空洞场景气氛。玩家提供的事件正文不能被压缩成一句梗概；需要分段时应拆成多行 `line`，保留事件的信息量和选项后的结果承接。御膳房闲逛每次必须至少提供一次 `player.stress=-2` 的通用收益；可拾取事件可以额外通过 `inventory.gain` 或 `player.silver` 给物品、食物或少量银两。公开善行、帮人遮掩、识字看账、辨物观察等分支可以固定给予 `player.prestige` 或 `player.stats` 收益；收益必须写在具体剧情行或选项的 `effectJson` 中，不做随机收益判定。私拿食物、捡钱和藏物类分支不加声望。第四次闲逛强制结识布自游由御膳房运行时优先处理，不在随机事件池里维护。银叶耳坠事件属于小彩蛋：收起耳坠时会生成一个独立实例，失主只写入物品 metadata，玩家只能从物品描述中的单字推测；正确送还给失主时走妃嫔送礼入口的特殊归还对白，并在普通礼物好感之外额外增加好感。

御膳房闲逛的事件抽取必须走随机事件 runtime 的 seeded 抽取 helper，入口只提供 `routeId + xunKey + strollCount` 等种子信息；不要在地点组件里自建简单 hash 或手写权重抽取。连续闲逛计数必须能落到多个事件，不能因为相邻种子过近而长期卡在同一个权重区间。

妙音堂闲逛当前维护 15 个事件，来源于玩家给出的妙音堂闲逛文本。妙音堂闲逛从 `location.miaoyin.common`、`location.miaoyin.music`、`location.miaoyin.dance` 三个池合并抽取，每个事件必须在剧情行或选项效果里提供一次 `player.stress=-2` 的默认收益；入口只在完全没有抽到事件时使用兜底压力收益，不能先统一扣压再播放事件，避免双重结算。可拾取事件可以额外通过 `inventory.gain` 给物品，帮人归还、打听消息、观摩练习等分支可以固定给予 `player.prestige` 或 `player.stats` 收益。兰花绢帕与银叶耳坠同属失物归还彩蛋：收起时生成带隐藏失主 metadata 的独立实例，玩家仍可出售或送给任意人，只有送还给失主才触发特殊归还对白和额外好感。乐曲池和舞蹈池的触发次数会被妙音堂入口读取，用于解锁乐师凌萧和舞者凌袖在场景 NPC 区出现；这个解锁只依赖 `progress.randomEvents.triggerCounts`，不要在 CSV 里写额外 flag 或条件系统。妙音堂同样必须使用随机事件 runtime 的多池 seeded helper，不得在地点组件里另写私有权重抽取器。

凌萧初遇是固定事件，维护在 `npc_tools_dialogues.csv`，不进入随机事件表、不参与随机抽取、不写入随机事件触发计数。凌萧普通闲聊才由随机事件系统驱动，从 `npc.miaoyin-musician.common` 与当前好感池合并抽取：好感低于 `30` 使用低好感池，达到 `30` 后使用高好感池，并额外并入 `npc.miaoyin-musician.pipa-pick`。琵琶拨片后续事件只通过 `prerequisiteEventIds=miaoyin.music.pipa-pick` 判断是否开启，不在组件里检查背包、任务道具或额外 flag；玩家完成“香案底下的琵琶拨片”事件后，该后续才会进入可抽池。凌萧闲聊会消耗常驻 NPC 交互次数，因此每个事件都必须至少提供一次 `target.relationToPlayer` 正收益；玩家发言同样使用 `{{playerRank}}`、`{{playerAddress}}` 与 `portraitKey=player`。

凌袖初遇也是固定事件，维护在 `npc_tools_dialogues.csv` 的 `miaoyin.dancer.first-meet` 与 `miaoyin.dancer.score.first-meet`，不进入随机事件表。凌袖普通闲聊从 `npc.miaoyin-dancer.common` 与当前好感池合并抽取：好感低于 `30` 使用低好感池，达到 `30` 后使用高好感池。当前凌袖池共 13 个事件：低好感 3 个、通用 5 个、高好感 5 个。凌袖闲聊同样会消耗常驻 NPC 交互次数，每个选项必须提供 `target.relationToPlayer` 正收益，并且玩家发言行必须使用 `{{playerRank}}` / `{{playerAddress}}` 与 `portraitKey=player`。
