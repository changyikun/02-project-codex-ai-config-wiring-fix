# 数值 CSV 表头说明

本目录是当前版本的数值与初始化数据源。CSV 只写可调参数、初始值和策划说明，不写公式、随机逻辑或状态流转。

## 通用编辑规则

- `id` / `key` / `routeId` / `itemId` 是代码引用的稳定标识，不要随意改名。
- 数值范围用 `min` / `max` 两列，不写 `[1,2]` 这样的字符串。
- 多值列表用 `|` 分隔，例如 `familyOptions`、`pools`、`tags`。
- `statDeltas` 使用 `属性key:数值|属性key:数值`，例如 `talent:2|temperament:3`。
- 文案策划最常改的是 `label`、`description`、`summary`、`notes`，数值策划最常改的是 `min`、`max`、`defaultValue`、`runtimeMultiplier`、`price`、`quantity`、`Delta` 系列字段。

## 最重要的策划字段

- `player_attribute_fields.csv`
  - `key`：属性内部名。`talent` 当前显示为“乐理”，练谱和宫宴曲谱主要读这个字段。
  - `label`：界面显示名。
  - `min` / `max`：创建面板允许加点范围。
  - `defaultValue`：创建面板默认点数。
  - `runtimeMultiplier`：进入正式游戏后的真值倍率。注意“加点时”和“实际扣值时”不同，例如福德加点 1 点等于 10 真值，但宫斗消耗直接扣真值。
  - `category`：`main` 主属性或 `skill` 技艺属性。
  - `description`：属性说明弹窗正文，面向玩家概括说明“这是什么”和大致影响方向，不写过细的隐藏系统、内部公式或具体判定名。属性创建页和局内个人属性面板的 `?` 按钮都直接读取此列。

- `player_status_fields.csv`
  - `key`：局内个人面板的非加点状态内部名，例如 `prestige`、`favor`、`ambition`、`family`、`stress`、`children`。
  - `label`：界面显示名。
  - `description`：局内个人面板 `?` 弹窗正文，编辑规则同玩家属性说明；不要在组件里另写声望、宠爱、家世等说明。

- `consort_attribute_fields.csv`
  - `key`：嫔妃属性内部名，必须与嫔妃总览 metric key 一致，例如 `prestige`、`favor`、`ambition`、`relationToPlayer`、`affection`。
  - `label`：嫔妃总览显示名。
  - `description`：嫔妃属性说明弹窗正文，面向玩家概括说明“这是什么”和大致影响方向，不写过细的隐藏系统、内部公式或具体判定名。嫔妃总览每个属性后的 `?` 按钮直接读取此列；不要在组件里另写一份说明。

- `route_initial_profiles.csv`
  - `pointsMin` / `pointsMax`：该路线初始可分配点数硬上下限，不是随机范围。
  - `pointModifier`：路线修正。当前初始可分配点数公式为 `initial_attribute_base_points + route.pointModifier + sum(family trait pointModifier)`，最后再按 `pointsMin / pointsMax` 截断。
  - `silverMin` / `silverMax`、`prestigeMin` / `prestigeMax`、`favorMin` / `favorMax`、`trueHeartMin` / `trueHeartMax`：入局随机范围。
  - `initialRankOptions`：初始位分候选，多个用 `|` 分隔。
  - `statsLocked`：是否锁定属性面板。
  - `familyOptions`：家世随机候选，多个用 `|` 分隔。

- `family_initial_traits.csv`
  - `traitKey`：家世词条内部 ID。
  - `matchText`：用于匹配家世显示文本，多个别名用 `|` 分隔，例如 `镇国公|国公`。
  - `pointModifier`：该词条对初始可分配点数的修正。品级按 `一品 +1` 到 `九品 +9`。
  - `monthlyOfficePrestige`：父亲官职 / 家族地位每月声望。
  - `monthlyBackgroundPrestige`：家世自然评价每月声望，可为负数。
  - 同一个家世可以命中多个词条，例如 `正二品武官庶女 = 二品 + 武官 + 庶女`。

- `chamber_actions.csv`
  - `timeCost`：行动消耗的时间格。
  - `staminaCost`：体力消耗；负数表示恢复体力。
  - `statDeltas`：属性变化。
  - `stressDelta` / `favorDelta`：压力或宠爱的直接变化。

- `global_numeric_rules.csv`
  - `dowager_interaction_limit_per_xun`：太后每旬有效互动次数上限。
  - `dowager_greeting_affinity_delta`：建章宫 `请安` 增加的太后好感。
  - `dowager_minor_affinity_delta`：`请教规矩` / `闲谈` 等普通太后互动增加的好感。
  - `dowager_missing_monthly_greeting_prestige_delta`：上月未向太后问安时，次月月初扣除的玩家声望真值。

- `inventory_items.csv`
  - `pools`：物品出现池。常用值：`initial`、`kitchen`、`duniang-always`、`yeting-poison`、`music-score`。当前 `initial` 池应保持为空，玩家开局不带初始背包物品。
  - `tags`：通用物品标签，用于剧情或随机事件按类别抽取具体物品，例如 `low-quality-food`、`tree-fruit`。它不是某个场景的私有字段，也不等同于商店出现池；同一个 tag 可以被御膳房、杜娘、后续地点事件等不同入口复用。
  - `category`：背包分类，当前可用 `gift`、`food`、`medicine`、`rare`、`music-score`。
  - `rarity` / `color`：品质颜色，当前可用 `green`、`blue`、`purple`、`red`。
  - `isQuestItem`：任务 / 剧情关键物品标记。杜娘和通用回收逻辑不得收购该类物品；毒药、曲谱和主线证物等非普通交易物应显式标记。
  - `favorDelta` / `healthDelta` / `appearanceDelta` / `temperamentDelta`：道具效果数值。

- `kitchen_shop_offers.csv`
  - `offerId`：御膳房供货行稳定 ID。
  - `itemId`：对应 `inventory_items.csv` 的物品 ID。
  - `seasons`：出现季节，用 `|` 分隔；可写 `all`、`spring`、`summer`、`autumn`、`winter`。
  - `stockPerXun`：每旬限购数量。购买记录写入交易账本，同一旬买满后按钮禁用。
  - `weight`：非保底商品的随机刷新权重。
  - `guaranteed`：是否每次刷新都固定出现。常备食物应设为 `true`，季节食物和偶发食材通常设为 `false`。

- `craft_works.csv`
  - `workId`：作品内部 ID，完成品背包 ID 会以 `crafted:{type}:{workId}:{quality}` 生成。
  - `type`：作品类别，只能是 `embroidery` 绣花、`painting` 字画、`incense` 调香；玩家只能通过对应寝殿行动进入该类别面板。
  - `requiredStatKey`：主能力字段。绣花读 `embroidery`，字画读 `painting`，调香当前读 `medicine`。
  - `supportStatKey`：辅助能力字段，用于小幅影响进度和成色。
  - `unlockStatKey` / `unlockStatMin`：`才思泉涌` 抽取作品时读取的门槛。当前按运行时 `0..100` 技艺值判断；未达到门槛的作品不会进入随机池。
  - `difficulty`：作品难度，影响单次进度、完成成色和售价。
  - `basePrice`：基础售价，最终售价还会受难度和成色公式影响。
  - `baseFavorDelta`：作为赠礼时的基础好感收益，最终好感受成色公式影响。
  - `description`：作品说明，可由文案策划直接改。

- `palace_strife_severity_rules.csv`
  - `severity`：宫斗严重度，当前为 `light`、`medium`、`heavy`。
  - `actionModifier` / `concealmentModifier` / `convictionModifier`：行动、隐匿、暴露后定案率修正。
  - `investigationGrowth`：调查中嫌疑人每旬基础定案率增长。
  - `prestigePenalty` / `favorPenalty` / `stressPenalty`：养心殿裁断完成后的处罚真值。
  - `suspectBonus`：实际发起者初始嫌疑随严重度增加的加成。
  - `verdictAttendeeLimit`：裁断场景最多带入的相关人物数量。

- 宫斗完整公式
  - 公式不写 CSV。主动宫斗检定、嫌疑人动机、初始定案率和银两干预等完整公式维护在 `src/game/numerics/formula-pages/palaceStrifeFormulaPage.ts`。
  - 公式页只保存公式字符串和注释，运行时由 `formulaRuntime.ts` 的受限解析器求值。
  - CSV 只保留严重度表、流言严重度、裁断选项倍率等更适合表格维护的数据。

- `nightly_*`
  - `nightly_emperor_alone_rates.csv`：皇帝心情对应的独寝概率。
  - `nightly_favor_weights.csv`：宠爱值对应的侍寝池权重。
  - `nightly_interest_effects.csv`：侍寝兴致区间对应的心情、宠爱、真心、声望变化。
  - 侍寝互动选项如何读取属性、如何分段加成不写 CSV，维护在 `src/game/numerics/formula-pages/nightlyServiceFormulaPage.ts`。
  - `nightly_runtime_rules.csv`：侍寝保底值、第三方美言 / 抹黑概率、第三方美言声望、玩家被传召侍寝基础声望、互动轮数和兴致上下限。

- `generated_consort_templates.csv` / `generated_consort_rules.csv`
  - `generated_consort_templates.csv`：随机补足妃嫔的模板池，包含年龄范围、候选位分 / 住处、基础属性、人设摘要。
  - `generated_consort_rules.csv`：开局补足目标人数、随机浮动范围、病中健康阈值等生成参数。

宫门杜娘货单只读取 `duniang-always` 池，设计口径是中低品质宫外物件，不放毒药、曲谱、红 / 紫高稀有物品或剧情物品。杜娘回收读取背包中所有 `canRecycle !== false` 且 `isQuestItem !== true` 的物品；好感达到友情价阈值后，买入价和回收价由 runtime 按常驻 NPC 关系统一修正。

物品 tag 是全局索引能力，运行时通过 `src/game/lib/inventoryTagRuntime.ts` 查询和稳定抽取。剧情表中出现类似 `【低品质食物】`、`【树上果实】` 的可变占位时，应由入口先根据 tag 抽中具体物品，再把物品名和 `itemId` 作为变量传给随机事件；不要在某个地点组件里临时写一套私有随机列表。

御膳房货单不直接读取整个 `kitchen` 池，而是由 `kitchen_shop_offers.csv` 控制当旬可买项、季节、权重和限购；`inventory_items.csv` 只维护物品本体的价格、效果、分类、说明和通用标签。新增食物时应先补物品表，再按需要把它加入御膳房供货表或打上可供剧情抽取的 tag。

## 文件职责

- `global_numeric_rules.csv`：全局范围、倍率、体力、熬夜惩罚、家族接济和新局基础参数；`initial_attribute_base_points` 是初始属性可分配点基础值。
- `player_attribute_fields.csv`：玩家属性字段、创建面板范围、真值倍率和属性说明，用于属性创建页与局内个人属性面板的主属性 / 技艺属性 `?` 弹窗。
- `player_status_fields.csv`：玩家局内非加点状态说明，用于局内个人属性面板的声望、宠爱、野心、家世、压力、子嗣 `?` 弹窗。
- `consort_attribute_fields.csv`：嫔妃属性说明，用于嫔妃总览 `?` 弹窗。
- `family_initial_traits.csv`：家世词条的初始点修正和每月家世声望修正。
- `monthly_expense_strategies.csv`：月用度策略。
- `favor_tiers.csv`：宠爱分层。
- `rank_prestige_table.csv`：位分声望门槛与颜色标识。
- `kitchen_shop_offers.csv`：御膳房每旬食物 / 食材供货，包含季节、限购、权重和是否常备。
- `fixed_consort_roster.csv`：固定妃嫔种子数据中的数值字段。
- `craft_works.csv`：绣花、字画、调香可制作作品的题材、主 / 辅能力、灵感抽取门槛、难度、基础售价和基础送礼好感；完整进度 / 成色 / 售价 / 送礼公式在 `src/game/numerics/formula-pages/craftWorkFormulaPage.ts`。
- `palace_strife_*` / `yangxin_verdict_choice_rules.csv`：宫斗严重度、流言严重度、裁断选项倍率和处罚参数；完整公式在 `src/game/numerics/formula-pages/palaceStrifeFormulaPage.ts`。
- `nightly_*`：夜晚侍寝池、兴致结果档位和第三方影响参数；互动选项完整公式在 `src/game/numerics/formula-pages/nightlyServiceFormulaPage.ts`。
- `generated_consort_*`：随机补足妃嫔模板与生成数量 / 浮动参数。

真实玩家存档不在 CSV 中维护。存档 schema、storage key、必需字段和默认进度块在 `src/game/save/saveGameConfig.ts` 中维护。
