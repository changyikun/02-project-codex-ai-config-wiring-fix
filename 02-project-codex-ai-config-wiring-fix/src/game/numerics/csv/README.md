# 数值 CSV 表头说明

本目录是当前版本的数值与初始化数据源。CSV 只写可调参数、初始值和策划说明，不写公式、随机逻辑或状态流转。

## 通用编辑规则

- `id` / `key` / `routeId` / `itemId` 是代码引用的稳定标识，不要随意改名。
- 数值范围用 `min` / `max` 两列，不写 `[1,2]` 这样的字符串。
- 多值列表用 `|` 分隔，例如 `familyOptions`、`pools`。
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
  - `description`：给策划看的用途说明。

- `route_initial_profiles.csv`
  - `pointsMin` / `pointsMax`：该路线初始可分配点数范围。
  - `silverMin` / `silverMax`、`prestigeMin` / `prestigeMax`、`favorMin` / `favorMax`、`trueHeartMin` / `trueHeartMax`：入局随机范围。
  - `initialRankOptions`：初始位分候选，多个用 `|` 分隔。
  - `statsLocked`：是否锁定属性面板。
  - `familyOptions`：家世随机候选，多个用 `|` 分隔。

- `chamber_actions.csv`
  - `timeCost`：行动消耗的时间格。
  - `staminaCost`：体力消耗；负数表示恢复体力。
  - `statDeltas`：属性变化。
  - `stressDelta` / `favorDelta`：压力或宠爱的直接变化。

- `inventory_items.csv`
  - `pools`：物品出现池。常用值：`initial`、`kitchen`、`duniang-always`、`duniang-rare`、`yeting-poison`、`music-score`。
  - `category`：背包分类，当前可用 `gift`、`food`、`medicine`、`rare`、`music-score`。
  - `rarity` / `color`：品质颜色，当前可用 `green`、`blue`、`purple`、`red`。
  - `favorDelta` / `healthDelta` / `appearanceDelta` / `temperamentDelta`：道具效果数值。

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
  - `nightly_runtime_rules.csv`：侍寝保底值、第三方美言 / 抹黑概率、互动轮数和兴致上下限。

- `generated_consort_templates.csv` / `generated_consort_rules.csv`
  - `generated_consort_templates.csv`：随机补足妃嫔的模板池，包含年龄范围、候选位分 / 住处、基础属性、人设摘要。
  - `generated_consort_rules.csv`：开局补足目标人数、随机浮动范围、病中健康阈值等生成参数。

## 文件职责

- `global_numeric_rules.csv`：全局范围、倍率、体力、熬夜惩罚、家族接济和新局基础参数。
- `monthly_expense_strategies.csv`：月用度策略。
- `favor_tiers.csv`：宠爱分层。
- `rank_prestige_table.csv`：位分声望门槛与图标。
- `fixed_consort_roster.csv`：固定妃嫔种子数据中的数值字段。
- `palace_strife_*` / `yangxin_verdict_choice_rules.csv`：宫斗严重度、流言严重度、裁断选项倍率和处罚参数；完整公式在 `src/game/numerics/formula-pages/palaceStrifeFormulaPage.ts`。
- `nightly_*`：夜晚侍寝池、兴致结果档位和第三方影响参数；互动选项完整公式在 `src/game/numerics/formula-pages/nightlyServiceFormulaPage.ts`。
- `generated_consort_*`：随机补足妃嫔模板与生成数量 / 浮动参数。

真实玩家存档不在 CSV 中维护。存档 schema、storage key、必需字段和默认进度块在 `src/game/save/saveGameConfig.ts` 中维护。
