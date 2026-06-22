Original prompt: 添加存档系统，回溯可以读取上一次存档，开始游戏会清空存档并新建存档（有二级确认）；关于存档功能的维护，需要把这部分写到全局文档里，以便更好的同步，之前已经做出的修改也需要将之前的文档修改到一致

## 2026-06-22 v0.5.3 地图热点比例修复

- 本轮目标：修复 `map-main__hotspot` 地图地点标志在场景全屏后偏宽的问题。
- 诊断结论：热点尺寸由 `MAP_HOTSPOTS` 的百分比 inline style 驱动；场景全屏后，超宽 viewport 会让 `width: 4.4%` 跟随整屏宽度膨胀，而高度跟随较矮的 viewport，导致竖排按钮比例变胖。
- 已处理：竖排热点宽度改为 `min(4.4vw, 7.822dvh)`，按 16:9 设计舞台宽度封顶；16:9 下保持原尺寸，更宽屏下不继续横向膨胀。
- 已验证：1536×768 视口下地图 frame 为全屏，前 8 个竖排热点宽度约 `60px`，没有 console error；地图截图已检查。
- 已同步：`CHANGELOG.md` v0.5.3 第 7 条；`docs/game-system-breakdown.md` 场景级视觉容器规范。

## 2026-06-22 v0.5.3 场景级容器全屏修复

- 本轮目标：修复启动、路线、属性、开场、地图、寝殿等场景没有填满浏览器容器，而是在外层套 16:9 圆角框的问题。
- 诊断结论：多套 scene frame 仍保留早期 `width: min(100vw - ...px, 1440px)`、`aspect-ratio: 16 / 9`、`border-radius: 28px/30px`、`border` 和 `box-shadow`；这些样式把完整场景裁成居中卡片。
- 已处理：在 `index.css` 末尾新增场景级 viewport 覆盖规则，统一让启动、路线、属性、开场、地图、寝殿的外层 frame 使用 `100vw x 100dvh`，外层圆角、边框、投影清零；内部面板圆角不受影响。
- 已验证：启动页、路线选择、属性分配、开场四类 frame 的 DOM 实测为 `0,0,1280,720`，`border-radius=0px`、`border-width=0px`；启动页和路线选择截图已确认填满视口。
- 已同步：`CHANGELOG.md` v0.5.3 第 6 条；`docs/game-system-breakdown.md` 场景级视觉容器规范。

## 2026-06-22 v0.5.3 泛用地点行动结果对白层级修复

- 本轮目标：修复新加的泛用地点场景内互动对白尺寸不对、正文看不到的问题。
- 诊断结论：`GenericMapLocationView` 将 `LocationActionResultStage` 直接渲染在 `chamber-main__location-choice` 小操作卡片内部；全局对白舞台的 absolute 定位因此以小卡片为参照，导致对白框被压缩和错位。
- 已处理：泛用地点的行动结果对白从地点操作卡片内移出，作为卡片兄弟节点挂在地点场景层级，复用全局对白框尺寸。
- 已新增回归：御书房 `抄读` 后 `御书房行动结果舞台` 不得成为 `御书房行动` 卡片的子元素。
- 已同步：`CHANGELOG.md` v0.5.3 第 5 条；`docs/game-system-breakdown.md` 对话交互锁规范；`codex-workdocs/2026-06-22-v053-location-dialogue-layout-fix.md`。

## 2026-06-22 v0.5.3 地点入场对白重复触发修复

- 本轮目标：修复玩家进入地点后，在地点内执行常规互动时反复触发入场对白，导致正常行动结果对白被覆盖的问题。
- 诊断结论：`ChamberMainView` 的泛用地点入场 effect 只判断 `activeMapLocation`，没有记录本次地点入场对白是否已播；地点内行动修改数值或推进时辰后 effect 重新运行，再次塞入“行至某地前”的入场对白。
- 已处理：新增本次地点入场对白 key，只有从地图新进入地点时播放一次；同一地点内的行动结算、面板切换和时辰变化不再重播入场对白。
- 已新增回归：御书房“抄读”后必须显示 `御书房行动结果`，且不再出现 `寝殿对白 / 行至御书房前`。
- 已同步：`CHANGELOG.md` v0.5.3 第 4 条；`docs/game-system-breakdown.md` 对话交互锁规范。

## 2026-06-22 v0.5.3 地点入口与常规行动收口

- 本轮目标：解决地图地点入口不统一、空地点进入后缺少寻常互动、公共地点 NPC / 偶遇入口粗糙且分散的问题。
- 已处理：大地图热点卡统一只显示地点描述和 `进入此处 / 留在地图`，不再在地图弹窗里提供朝堂事务、旧案纪事、宫门人物等快捷入口。
- 已处理：新增 `GenericMapLocationView` 与 `mapLocationActions.ts`，为御花园、正阳门、重华宫、御书房、冷宫、养心殿提供统一的地点内常规行动；行动正文读取 `location_encounters.csv`，真实行动才推进时辰并接入过夜流程。
- 已处理：宫门从 `MapMainView` 的旧假场景迁入 `GongmenView` 地点子场景，杜娘 / 阿翎、交易和宫门妃嫔偶遇都在进入宫门后出现。
- 已处理：新增 `LocationConsortVisitorsPanel` 复用公共地点和宫门的妃嫔偶遇入口。
- 已同步：`CHANGELOG.md` v0.5.3 第 3 条；`docs/game-system-breakdown.md` 地图与场景系统；`codex-workdocs/2026-06-22-v053-location-entry-hub.md`。
- 合并处理：解决 `src/views/MapMainView.tsx` 的 stash/merge 冲突，保留地点入口统一方向，删除旧宫门假场景和旧解释性 UI 文本。

## 2026-06-22 v0.5.3 冷宫 NPC 与位分图标字段检查

- 本轮目标：检查冷宫 NPC 是否已拆表，并确认 `rank_prestige_table.csv` 的 `iconPath` 是否真实被使用。
- 结论：冷宫妃嫔已在 `fixed_consort_roster.csv` 中维护，`杜若蘅 / 崔莺莺` 为 `status=limbo` 且住处为冷宫；这些会通过 `numericFixedConsortSeeds` 进入初始妃嫔 roster。
- 结论：影落掖庭冷宫线索里的 `老宫人` 不是妃嫔 roster 成员，目前是 `route_mainline_dialogues.csv` 中的剧情说话人，并由 `yingluoyetingStoryRuntime` 组装事件选项和证物结果。
- 已处理：`rank_prestige_table.csv` 的 `iconPath` 没有 `public/assets/icons/ranks` 资产目录，也没有 UI 消费；已移除该字段、`位分声望条目.图标路径` 和未使用的 `RANK_ICON_BASE_PATH`。
- 已同步：`CHANGELOG.md` v0.5.3 第 2 条；`src/game/numerics/csv/README.md`；`codex-workdocs/2026-06-22-v053-cold-palace-npc-rank-icon-audit.md`。

## 2026-06-18 v0.5.3 晋升清晨通报检查

- 本轮目标：检查玩家自然晋升机制是否正常，并补齐“晋升时清晨由太监最高优先级通报”的演出链路。
- 结论：声望驱动位分、月结算推进实际位分和迁宫逻辑仍正常；缺口在清晨反馈，原先只把新位分写入普通月初通报，且由娇娇播报。
- 已处理：跨月实际晋升时新增 `promotion` settlement report，内容为“晋封旨意”，包含旧位分、新位分和迁宫信息。
- 已处理：寝殿和地图通报渲染支持传旨内侍立绘；晋升通报优先于普通月报、侍寝通报、养心殿裁断和地图对白展示。
- 已处理：确认晋升通报后不提前收束清晨结算转场，通报队列会继续播放普通月初通报。
- 已同步：`CHANGELOG.md` v0.5.3 第 1 条；`docs/rank-governance-architecture.md` 晋升通报规则；`codex-workdocs/2026-06-18-v053-rank-promotion-notice.md`。
- 验证：新增 app-flow 回归覆盖“跨月晋升先显示太监晋升通报，再显示普通月初通报”；相关跨月、位分、纪事测试已通过。

## 2026-06-18 v0.5.2 版本归档

- 本轮目标：归档 `v0.5.2`，并为后续修改开启 `v0.5.3` 当前开发版本。
- 已处理：`CHANGELOG.md` 新增 `v0.5.3 - 后续系统迭代（进行中）` 空段，后续新增内容将写入 v0.5.3。
- 已处理：`v0.5.2` 标记为“已归档”，并补充版本总结：本版本主要完成数值配置化 / 公式页拆分、作品制作闭环、进出场景时间规则收口、宫门工具 NPC 交互修订和文档维护边界收口。

## 2026-06-18 v0.5.2 正阳门等待与宫门工具 NPC 修订

- 本轮目标：修复“等待下朝”不推进时辰、杜娘入场后操作项和对白同时显示，以及工具 NPC 面板存在解释性 UI 文本的问题。
- 已处理：正阳门“等待下朝”改为地点内真实行动，点击后推进一格时辰，并清理本次入场时辰上下文。
- 已处理：杜娘等宫门工具 NPC 先播放入场对白，买卖 / 闲谈操作栏只在对白读完或操作反馈出现后显示。
- 已处理：移除宫门工具 NPC 操作栏里的解释性说明文本，保留必要的动作按钮和显式“返回宫门”。
- 已同步：`CHANGELOG.md` v0.5.2 第 18 条。
- 已处理：阿翎“叙旧”不再使用开发占位说明文本，改为 `npc_tools_dialogues.csv` 中的正式本地对白。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "宫门中的杜娘可购买与回收道具|正阳门等待下朝会推进时辰|杜娘闲谈先显示本地回应" --reporter=verbose` 通过，`3 passed`；`npx vitest run src/__tests__/app-flow.test.tsx --reporter=dot` 通过，`139 passed`，仍有既有 React `act(...)` 警告；`npx tsc --noEmit` 通过；`npm run build:web` 通过，仍有既有 Vite 大 chunk 警告。

## 2026-06-18 v0.5.2 宫门杜娘交互修复

- 本轮目标：修复杜娘入场对白读完后直接退出，导致无法继续买卖 / 闲谈的问题。
- 已处理：宫门工具 NPC 的线性对白推进到末页后不再清空 `activeGongmenNpc`；杜娘人物面板会保留，买卖 / 闲谈入口继续可用。
- 已新增：工具 NPC 面板内的显式“返回宫门”按钮，退出人物面板不再依赖继续点击剧情框。
- 已同步：`CHANGELOG.md` v0.5.2 第 17 条。
- 验证：新增回归断言覆盖“读完杜娘入场对白后仍可购买”；`npx vitest run src/__tests__/app-flow.test.tsx -t "宫门中的杜娘可购买与回收道具" --reporter=verbose` 通过；`npx vitest run src/__tests__/app-flow.test.tsx -t "杜娘闲谈先显示本地回应" --reporter=verbose` 通过；`npx tsc --noEmit` 通过。

## 2026-06-18 v0.5.2 文档归档与维护边界

- 本轮目标：减少同一规则在多份文档中重复维护，归档当前不再使用的旧文档。
- 已新增 `docs/README.md`，明确当前维护文档、各文档用途和写入规则。
- 已新增 `docs/archive/README.md`，明确归档文档只作历史追溯，不再作为当前规则源维护。
- 已归档：旧 V1 规则稿、自然语言说明稿、旧 B 版宫斗规则、旧 AI / Foundation / 自定义剧情妃接口说明、persona / 世界记忆 proposal。
- 已更新：`docs/new-chat-start.md`、`docs/codex-dialogue-handoff.md` 和路线文档引用，避免继续把归档文档当作接手必读或当前维护源。
- 追加归档：`codex-dialogue-handoff.md` 与 `system-hard-rules-integrated.md` 已移入 `docs/archive/retired-overviews/`，后续不再维护；新对话入口改为直接读取文档索引、最新 changelog 和任务相关专项文档。
- 已同步：`CHANGELOG.md` v0.5.2 第 15 条。

## 2026-06-18 v0.5.2 绣花 / 字画 / 调香作品制作

- 本轮目标：给绣花、字画、调香补齐作品制作闭环，玩家通过对应寝殿行动进入对应类别面板，添加作品并推进作品；当前不保留“只练习技艺”分支。
- 已新增 `craft_works.csv`，维护作品类别、题材、主 / 辅能力、难度、基础售价和基础送礼好感。
- 已新增 `craftWorkFormulaPage.ts` 与 `craftWorkFormulas.ts`，单次进度、成色评分、售价和送礼好感走完整公式页，不把公式拆进 CSV。
- 已新增 `craftWorkRuntime`，生成进行中作品、计算推进结果、完成时生成 `crafted:` 开头的 `gift` 背包物品。
- 已接入 `gameFlowStore` 与 `SaveGameV1`：作品进度保存到 `progress.craftWorks.activeWorks`，schema 提升到 `4`，旧结构缺字段直接清档。
- 已接入寝殿 UI：`泼墨作画 / 镂月裁云 / 调制香薰` 点击后进入对应类别制作面板；没有独立“作品管理”总入口。面板只展示可添加作品和进行中作品，完成品直接进入背包，可作为普通礼物送礼或通过背包变卖。
- 同步修正：清掉旧裁断选择 ID `argue / plead / accept`，NPC-only 静默裁断默认用 `state-facts`，避免代码默认规则和裁断 CSV 不一致。
- 已同步：`CHANGELOG.md`、`src/game/numerics/csv/README.md`、`docs/game-state-model.md`、`docs/game-system-breakdown.md`、`docs/system-hard-rules-integrated.md`、`docs/codex-dialogue-handoff.md`、`codex-workdocs/2026-06-18-v052-craft-works.md`。
- 验证：`npx tsc --noEmit` 通过；`npx vitest run src/game/lib/palaceStrifeRuntime.test.ts src/game/store/gameFlowStore.save.test.ts` 通过。初轮广口径测试中 `src/__tests__/app-flow.test.tsx` 已通过，失败仅来自旧裁断测试 ID，已修正并单独复测通过。

## 2026-06-18 v0.5.2 寝殿行动与作品入口修订

- 已处理：作品制作面板移除“只练习技艺”和“已完成库存”；完成品只进入背包，制作面板不再承担库存展示。
- 已处理：`调制香薰 / 镂月裁云 / 泼墨作画` 必须选择作品推进才结算行动；体力不足时不会推进作品进度。
- 已处理：寝殿行动数值改为调香 `体力 -3 / 容貌 +1`、诵读 `体力 -2 / 诗词 +1 / 政治 +1`、刺绣 `体力 -3 / 刺绣 +1`、奏乐 `体力 -2 / 气质 +1 / 乐理 +1`、作画 `体力 -3 / 丹青 +1`、平安脉 `健康 +5` 且每旬一次、殿内小憩 `体力 +3 / 压力 -1`。
- 已处理：作品进度公式移除 `averageActionCount`，单次进度只按玩家主能力、辅助能力、作品难度和稳定浮动计算；制作面板的预计剩余次数也改用同一公式估算。
- 已同步：`CHANGELOG.md`、`docs/game-system-breakdown.md`、`docs/system-hard-rules-integrated.md`、`docs/game-hard-rules.md`、`docs/game-state-model.md`、`docs/codex-dialogue-handoff.md`、`codex-workdocs/2026-06-18-v052-craft-works.md`。
- 验证：`npx tsc --noEmit` 通过。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "请平安脉|字画作品|寝殿日常行动|回宫反馈|数值变化|寝殿剧情对白" --reporter=verbose` 通过，`7 passed`；仍有既有 React `act(...)` 警告。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx --reporter=dot` 通过，`137 passed`；仍有既有 React `act(...)` 警告。
- 验证：`npx vitest run src/game/numerics/numericCatalog.test.ts src/game/lib/craftWorkRuntime.test.ts src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts --reporter=dot` 通过，`48 passed`。
- 验证：`npm run build:web` 通过；仍有既有 Vite 大 chunk 警告。
- 验证：`web_game_playwright_client` 打开 `http://127.0.0.1:5173/`，截图 `output/web-game-v052-chamber-rebalance/shot-0.png` 可见启动页，未见空白渲染。
- 追加验证：`npx tsc --noEmit` 通过；`npx vitest run src/game/numerics/numericCatalog.test.ts src/game/lib/craftWorkRuntime.test.ts --reporter=verbose` 通过，`9 passed`。
- 追加验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "字画作品|寝殿日常行动|回宫反馈" --reporter=verbose` 通过，`3 passed`；仍有既有 React `act(...)` 警告。
- 追加验证：`npm run build:web` 通过；仍有既有 Vite 大 chunk 警告。`web_game_playwright_client` 打开 `http://127.0.0.1:5173/`，截图 `output/web-game-v052-craft-progress-formula/shot-0.png` 可见启动页。

## 2026-06-17 v0.5.2 宫斗 / 侍寝 / 随机妃嫔数值拆表扩展

- 本轮目标：继续把宫斗、侍寝和随机补足妃嫔生成里的可调数值从 runtime 中抽到 CSV。
- 已新增：`palace_strife_severity_rules.csv`、`palace_strife_rumor_items.csv`、`yangxin_verdict_choice_rules.csv`。
- 已新增：`nightly_emperor_alone_rates.csv`、`nightly_favor_weights.csv`、`nightly_interest_effects.csv`、`nightly_runtime_rules.csv`。
- 已新增：`generated_consort_templates.csv`、`generated_consort_rules.csv`，随机补足妃嫔的模板、目标人数、属性浮动和病中阈值不再维护在 `concubineRoster.ts` 的大段常量里。
- 修订：公式不再拆进 CSV；主动宫斗检定、嫌疑人动机、初始定案率、银两干预和侍寝互动加成维护在独立 `src/game/numerics/formula-pages/*FormulaPage.ts`，由 `formulaRuntime.ts` 解析。
- 修订：删除旧听审流程，移除 `resolveYangxinHearing`、`YangxinHearingPanelView`、`yangxinHearing*` 案件字段和对应测试；当前裁断只走待裁断案件的养心殿传唤对话流程。
- 已接入：`palaceStrifeRuntime`、`nightlyServiceRuntime`、`concubineRoster` 改读 `numericCatalog`；公式、随机流程和状态落地仍留在 runtime。
- 已同步：`CHANGELOG.md`、`src/game/numerics/csv/README.md`、`docs/game-system-breakdown.md`、`docs/system-hard-rules-integrated.md`、`docs/codex-dialogue-handoff.md`。
- 验证：`npx tsc --noEmit` 通过；`npx vitest run src/game/numerics/formulas/formulaRuntime.test.ts src/game/lib/palaceStrifeRuntime.test.ts src/game/lib/nightlyServiceRuntime.test.ts` 通过，25 passed；上一轮 `gameFlowStore.save`、宫斗事务 / 养心殿裁断 app-flow 与 `npm run build:web` 已通过，仍有既有 Vite 大 chunk 警告；此前 in-app browser 刷新 `http://127.0.0.1:5173/` 后启动菜单可见，console error 为 0。

## 2026-06-17 v0.5.2 数值系统配置化

- 本轮目标：把核心数值、初始化数据和存档结构配置从分散代码常量中抽出，数值表用 CSV，真实存档不做 CSV。
- 已新增 `src/game/numerics/csv/`、`csvNumericLoader.ts`、`numericCatalog.ts` 和 `numericCatalog.test.ts`。
- 已迁移：玩家属性字段、全局范围 / 倍率 / 体力 / 熬夜惩罚 / 家族接济、新局时间、路线初始范围、路线固定属性、寝殿行动、月用度策略、宠爱分层、位分声望表、背包 / 商店 / 毒药 / 曲谱物品、固定妃嫔种子数值。
- 已新增 `src/game/save/saveGameConfig.ts`，集中维护 `SaveGameV1` schema、storage key、必需 section / progress / relation 字段和默认进度块；`saveGameV1.ts` 继续负责构建、读取、清除和校验。
- 已接入旧导出兼容层：`constants.ts`、`monthlyExpenseStrategy.ts`、`palaceUi.ts`、`routeProfiles.ts`、`inventoryPresets.ts`、`familyGovernanceRuntime.ts` 和属性创建页改从 catalog 取值。
- 顺手修复：杜娘闲谈不再被后续本地请求覆盖回初始台词，符合当前版本“CSV 本地剧情唯一源、不接 AI 正文”的规则。
- 验证：`npx tsc --noEmit`、`npx vitest run src/game/numerics`、`npx vitest run src/game/save src/game/store src/__tests__/app-flow.test.tsx`、`npm run build:web` 均通过；仍有既有 React act 测试警告和 Vite 大 chunk 警告。

## 2026-06-17 v0.5.2 进出场景体力规则

- 本轮目标：修改规则，使进出场景不再消耗体力。
- 已处理：大地图进入地点和地点快捷面板不再扣体力，只保留既有时辰推进与深夜回宫睡觉判断。
- 2026-06-18 修订：进出场景不应被算作行动，已进一步移除大地图进入普通地点、地点快捷面板和影落掖庭地图事件入口的时辰推进；只有地点内听曲、问诊、拜访、礼佛等真实行动才推进时间。
- 已处理：后宫殿位进入妃嫔会面不再扣体力，但体力为 `0` 时仍阻止开始拜访，避免绕过“体力归零需要睡觉”的全局规则。
- 保留边界：地点内真实行动仍按各自 `beginTimedLocationAction` 或寝殿行动配置消耗 / 恢复体力。
- 验证：`npx tsc --noEmit` 通过；相关 `app-flow` 测试通过；`npm run build:web` 通过，仍有既有 Vite 大 chunk 警告。
- 2026-06-18 追加验证：`npx tsc --noEmit` 通过；`npx vitest run src/__tests__/app-flow.test.tsx --reporter=dot` 通过，`138 passed`，仍有既有 React `act(...)` 警告；`npm run build:web` 通过，仍有既有 Vite 大 chunk 警告；`web_game_playwright_client` 打开本地页并截图 `output/web-game-v052-map-entry-no-time/shot-0.png`，启动页可见。

## 2026-06-02

- 读取现有 `SaveGameV1`、`gameFlowStore` persist 配置、启动页与主流程测试。
- 结论：项目已有 SaveGameV1 envelope 和自动持久化，缺少启动页“开始 / 回溯”的显式存档语义。
- 本轮目标：开始新游戏必须二级确认并清空旧存档；回溯读取 localStorage 中的上一次 SaveGameV1；同步全局存档维护文档。
- 已新增 SaveGameV1 storage helper，并在 `gameFlowStore` 中加入 `startNewGame` / `resumeLastSave`。
- 已调整启动页：开始按钮先弹二级确认，确认后清档新开；回溯按钮读取上一次存档，缺存档时显示提示。
- 已补 app-flow 与 saveGameV1 测试。下一步跑测试并同步全局文档。
- 已新增 `docs/save-system-maintenance.md`，并同步 `new-chat-start`、`game-state-model`、`game-system-breakdown`、`codex-dialogue-handoff`、`CHANGELOG` 和 `codex-workdocs`。
- 针对性测试和 TypeScript 已通过；下一步跑完整相关测试、构建与浏览器验证。
- 完整相关测试通过：`saveGameV1.test.ts`、`gameFlowStore.save.test.ts`、`app-flow.test.tsx` 共 104 passed；仍有既有 React `act(...)` 警告。
- `npm run build:web` 通过；仍有既有 Vite 大 chunk 警告。
- `web_game_playwright_client` 点击启动页“开始”后截图确认二级确认弹窗可见。
- in-app browser 刷新 `http://127.0.0.1:5173/` 后能看到“开始/回溯”入口，console error 为 0。

## 2026-06-02 剧情 / 对话 UI 交互锁

- 问题：剧情、旁白或对话文本显示时，背景寝殿按钮和地图按钮仍可被点击，可能造成行动结算、面板切换或转场覆盖当前文本。
- 已处理：`GlobalDialogueStage` 新增 `global-dialogue-stage__interaction-lock` 透明遮挡层，负责吞掉对话框外的鼠标事件。
- 已处理：`ChamberMainView` 增加寝殿交互锁，剧情对白、旬月通报、侍寝通报、过夜遮罩、连翘赠礼和用度选项期间，背景寝殿按钮不会执行。
- 已处理：`MapMainView` 增加地图交互锁，地图剧情 / 引导、掖庭剧情和宫门 NPC 对话期间，地图侧栏、热点和地点弹窗入口不会越过当前剧情推进。
- 测试补充：新增寝殿对白未收起时点击“诵读经典 / 家族事务”不改变时间、体力或面板；新增地图对白未收起时点击“回宫 / 御花园”不转场、不弹地点卡。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx` 通过，83 passed；仍有既有 React `act(...)` 警告。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npm run build:web` 通过，仍有 Vite 大 chunk 警告。
- 验证：Playwright 实测对白显示时点击背景“泼墨作画”不会改变清晨 / 体力 10；收起对白后同按钮正常推进到上午 / 体力 9。

## 2026-06-02 系统宫宴盘点

- 读取宫宴配置、妙音堂报名、曲谱物品、时间推进、结算通报、SaveGameV1 和既有测试。
- 结论：曲谱与报名已有最小链路，系统宫宴本身仍是规则占位，未接入 `advanceTime` 和结算 runtime。
- 已在 `codex-workdocs/2026-06-02-system-palace-banquet-plan.md` 记录当前实现程度、关键缺口、推荐状态模型、主循环接入方案和待确认设计点。
- 已补充：系统宫宴报名开启应生成专门提醒事件；曲谱第一阶段只服务系统宫宴，后续再扩展熟练度、适性、风险和妃嫔竞争。
- 已实施：新增宫宴调度与 runtime，系统宫宴报名提醒、妙音堂曲谱提交、3 月上旬傍晚结算、声望变化、存档字段和重复触发保护已接入。
- 已修复：妙音堂听曲先结算压力变化再推进时间，并在妙音堂行动结果出现时触发 toast，不再延迟到旬月通报。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npx vitest run src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts src/__tests__/app-flow.test.tsx` 通过，109 passed；仍有既有 React `act(...)` 警告。

## 2026-06-03 地图时间通报

- 问题：贴身宫女的旬月 / 系统事件通报只在寝殿主界面展示，玩家停留在地图上时不会出现。
- 已处理：`MapMainView` 接入未读 `settlementReports` 队列，地图空闲时展示娇娇时间通报或系统事件通报。
- 已处理：地图通报显示期间复用全局对话锁，侧栏和热点点击会被屏蔽；收起后写入 `lastSeenSettlementReportId`。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "地图上也会显示绑定时间|地图剧情对白未收起|跨旬行动会先展示"` 通过。

## 2026-06-03 外出末格归寝

- 问题：上次只让地图也能显示时间通报，但普通外出行动推进到深夜后仍可能停留在地图 / 外景，不符合“玩家需要回宫睡觉、次日从寝宫醒来”的主循环。
- 已处理：`MapMainView` 普通热点进入与快捷入口在推进时间后检查是否到达深夜或跨旬；普通情况会清理地图局部状态、回到寝宫，并在需要时继续推进到下一旬清晨。
- 已处理：`ChamberMainView` 过夜黑幕开始时先调用 `enterMainChamber()`，避免外景 `activeMapLocation` 残留到清晨。
- 保留例外：华清池深夜双人沐浴等明确以深夜为入口的特殊玩法不被普通归寝规则截断。
- 注意：此前关于独立行动值的方案已废弃；当前主循环只用体力承接常规行动预算。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "普通外出行动推进到深夜|地图上也会显示绑定时间|深夜时华清池"` 通过。

## 2026-06-03 深夜行动与体力睡觉修正

- 纠正：推进到 `深夜` 不应立刻归寝；深夜是最后一个可行动时段。
- 已处理：撤掉状态栏“行动”展示；寝殿主行动和地图普通行动只消耗体力，不再使用独立行动值驱动睡觉。
- 已处理：删除 `GameNumericsState`、初始状态、后端旧 runtime schema 和测试夹具中的独立行动值字段。
- 已处理：深夜行动后不直接 `advanceTime` 到清晨，而是先展示行动结果或回宫提醒，再由娇娇提醒睡觉，最后复用寝殿黑屏过夜转场。
- 已处理：体力归零时同样走“行动结果 -> 娇娇提醒 -> 黑屏 -> 清晨通报”链路。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "普通外出行动推进到深夜|深夜普通外出行动后|体力归零后|深夜时华清池"` 通过。

## 2026-06-03 对话锁、物品 toast 与外景回宫修正

- 问题：侍寝、妃嫔会面等“对白 + 场景按钮”组合被全局对话遮罩挡住，导致真实浏览器里无法点击按钮。

- 已处理：侍寝进入养心殿后先展示可收起的引导对白，收起后才显示互动按钮；妃嫔会面对话可以点击正文收起，不再长期盖住固定操作。
- 已处理：物品获得 / 失去纳入 `NumericChangeToastLayer` 快照，新增物品按 0 -> 当前数量计算，消耗到 0 也能显示负向 toast；背包增减方法会同步触发对应 toast 信号。
- 已处理：外景场景侧栏语义重新拆清；`外出` 返回地图主视角，独立 `回宫` 入口直接回寝殿，避免玩家只能回宫而不能回大地图。
- 已处理：寝殿任意面板打开时点击“外出”，会先关闭面板并展示出行提示，再由玩家确认进入地图，避免对话被面板条件吞掉。
- 已处理：妙音堂深夜听曲先展示行动结果与压力 toast，再确认回宫并复用睡觉黑屏 / 清晨通报链路。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx` 通过，97 passed；仍有既有 React `act(...)` 测试警告。
- 验证：`npm run build:web`、`npm run build:api` 通过；`build:web` 仍有既有 Vite 大 chunk 警告。
- 验证：in-app browser 打开 `http://127.0.0.1:5173/` 可正常加载启动页，console error 为 0。

## 2026-06-15 妃嫔互动回合限制

- 结论：NPC 拜访玩家已有 `triggeredVisitIds` 与 `resolved` 保证单条拜访只触发一次；缺口在玩家主动拜访妃嫔和公共地点妃嫔关系判定，可在同旬反复点交互。
- 已处理：`ConsortInteractionProgress` 新增 `actionCountThisXun`，`recordConsortInteractionAction` 与 `applyConsortRelationshipJudgement` 共同限制每旬每名妃嫔最多 `3` 次普通互动。
- 已处理：`ConsortAudiencePanel` 展示本旬剩余互动次数，次数用尽后“送礼 / 试探 / 拉拢”按钮进入不可交互态；单个话题最多继续 `2` 句后自动收束。
- 已修订：普通会面最后一次互动后不再停留在灰按钮状态，而是展示宫人续茶送客、下旬再叙的收束对白，玩家点击正文后退出会面；同旬再次拜访在殿位处显示宫人婉拒，不消耗体力和时间。
- 已处理：御膳房、太医院、妙音堂、宝华殿、华清池的妃嫔关系判定接入同一计数，次数耗尽后不再写普通关系变化。
- 已处理：开发期存档校验新增 `consortInteractionMap` 互动计数字段检查，旧互动记录缺少 `actionCountThisXun` 时直接清档，不做迁移。
- 已同步：`CHANGELOG.md`、`docs/game-state-model.md`、`docs/game-system-breakdown.md`、`docs/system-hard-rules-integrated.md`、`docs/codex-dialogue-handoff.md`，并补充“新增硬机制必须自带剧情解释和演出效果”的规则。
- 验证：`npx tsc --noEmit` 通过；`npx vitest run src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts -t "consort interaction|consort interaction map|captures the current durable"` 通过，4 passed；`npx vitest run src/__tests__/app-flow.test.tsx -t "妃嫔会面|妃嫔送礼"` 通过，3 passed；`npx vitest run src/__tests__/app-flow.test.tsx -t "妃嫔本旬互动次数用尽"` 通过，1 passed；`npm run build:web` 通过，仍有既有 Vite 大 chunk 警告。

## 2026-06-16 剧情 CSV 完整 entry 消费修订

- 问题：首轮 CSV 化仍有大量代码只读取 `text`，说话人、立绘 key、旁白名、场景提示继续在代码里 new / 硬编码，导致 CSV 对文案策划来说不是真正的剧情源。
- 已处理：新增 `renderNarrativeEntry(id, vars)` 完整渲染入口，并让寝殿主舞台、地图引导、妃嫔 / 太后 fallback、地点偶遇 fallback、送客收束、宫门 NPC、皇帝互动、侍寝、养心殿裁断、影落掖庭主线优先读取完整 CSV entry。
- 已处理：删除无用 `renderNarrativeField`；业务代码中清除直接 `renderNarrativeText` 调用，文本读取仅保留在底层 helper 与测试中。
- 已修正：新增 `narrativeDialogueAdapter`，运行期通过 adapter 把 CSV entry 转为开场响应、全局舞台字段、妃嫔会面回合和普通展示字段；开场、寝殿、地图、宫门、影落掖庭主线、地点 fallback、送客收束、养心殿裁断不再各自逐项拆 `entry.speakerName` / `entry.text`。
- 已处理：补充寝殿首次回宫、体力不足、预留入口、睡觉提醒等 CSV 条目，避免寝殿主舞台继续散落剧情正文。
- 已同步：`CHANGELOG.md`、`src/game/narrative/csv/README.md`、`codex-workdocs/2026-06-16-v051-narrative-csv-config.md`、`docs/game-system-breakdown.md`、`docs/system-hard-rules-integrated.md`、`docs/codex-dialogue-handoff.md`。
- 验证：`npx tsc --noEmit` 通过；`npx vitest run src/game/narrative/csvNarrativeLoader.test.ts src/game/lib/actionNarrativeRuntime.test.ts src/game/lib/localGameplayMode.test.ts server/tests/integration/aiRoutes.test.ts --reporter=verbose` 通过，19 passed；测试中仍有既有 AI key fallback 告警。
- 复验：`npx vitest run src/game/narrative/csvNarrativeLoader.test.ts src/game/narrative/narrativeDialogueAdapter.test.ts src/game/lib/actionNarrativeRuntime.test.ts src/game/lib/localGameplayMode.test.ts --reporter=verbose` 通过，16 passed。
- 复验：`npx vitest run src/__tests__/app-flow.test.tsx -t "御膳房可购买美食并在第四次闲逛强制触发布自游|宝华殿礼佛三次后结识当一|开场" --reporter=verbose` 通过；仍有既有 React `act(...)` 测试警告。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "御膳房可购买美食并在第四次闲逛强制触发布自游|宝华殿礼佛三次后结识当一" --reporter=verbose` 通过；此前广口径流程测试发现 CSV 称谓回归，已把布自游恢复为“御厨”、当一恢复为“佛殿执事”。
- 验证：`npm run build:web` 通过；仍有既有 Vite 大 chunk 警告。浏览器冒烟加载 `http://127.0.0.1:5173/`，启动页含“开始 / 回溯”，console error 为 0。

## 2026-06-03 地点行动统一结算

- 问题：小场景作为 `ChamberMainView` 的 `activeMapLocation` 子状态存在，但地点内行动各自直接推进时间、各自写 `systemMessage`，导致“只能回宫不能回地图”“妙音堂普通听曲对白消失”“太医院深夜行动不触发睡觉”属于同一类流程分裂。
- 已处理：新增 `useLocationActionFlow`，地点耗时行动统一记录行动前时辰；非深夜正常推进 1 个时段，深夜或体力归零时先保留行动结果 / NPC 对话，收起后请求过夜提醒并回寝殿。
- 已处理：新增 `LocationActionResultStage`，妙音堂、太医院、御膳房、宝华殿、华清池的普通行动结果都复用共享对白舞台，因此 toast 与行动结果实际出现时机对齐。
- 已处理：`enterMapMain()` 现在会清理 `activeMapLocation`；外景侧栏 `外出` 返回地图主视角，独立 `回宫` 按钮回寝殿。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx` 通过，99 passed；仍有既有 React `act(...)` 警告。
- 验证：`npx vitest run src/game/store/gameFlowStore.save.test.ts src/game/save/saveGameV1.test.ts` 通过，25 passed。
- 验证：`npm test` 通过，20 个测试文件 / 223 个用例 passed；仍有既有 React `act(...)` 警告和 AI key fallback 日志。
- 验证：`npm run build:web`、`npm run build:api` 通过；`build:web` 仍有既有 Vite 大 chunk 警告。
- 验证：`web_game_playwright_client` 打开 `http://127.0.0.1:5173/` 并生成启动页截图，未生成 console error 文件。

## 2026-06-03 曲谱练习闭环

- 目标：曲谱不再只是一次性报名道具；玩家拿到曲谱后需要找连翘学习，学习进度影响系统宫宴表现。
- 已处理：新增 `musicScoreRuntime`，统一计算曲谱难度、学习增量、完成度、表现上限和宫宴表现分。
- 已处理：`MusicHallProgressState` 增加 `musicScoreMastery`，按曲谱保存长期练习状态；新局初始化为空对象，旧存档缺失时按 0 完成度处理。
- 已处理：妙音堂新增“学谱”入口；登记宫宴不再消耗库存曲谱，报名后仍可继续练习。
- 已处理：练谱公式改为乐理主导，不再使用气质；练谱提高表现上限，宫宴当天按上限随机生成本场表现分。
- 已修正：不新增玩家属性字段；乐理继续落在既有 `talent` 字段，界面与规则显示为“乐理”，历史过渡 `music` 只在读档时归并回 `talent`。
- 已处理：学谱本身会增加运行时乐理值 `+2`，并随行动结果触发 toast。
- 已处理：宫宴报名开启改为提前一个月，首届报名可在 1 年 2 月上旬清晨触发，避免开局提醒早于玩家可操作时间。
- 验证：`npm test` 通过，20 files / 223 tests；仍有既有 React `act(...)` 警告和 AI key fallback 日志。
- 验证：`npm run build` 通过；仍有既有 Vite 大 chunk 警告。
- 复验：字段收口后 `npx vitest run src/game/store/gameFlowStore.save.test.ts src/__tests__/app-flow.test.tsx src/game/lib/nightlyServiceRuntime.test.ts` 通过，129 passed；`npm run build` 通过；`npm test` 通过，20 files / 223 tests。
- 复验：报名提前一个月后 `npx vitest run src/game/store/gameFlowStore.save.test.ts src/__tests__/app-flow.test.tsx -t "palace banquet|妙音堂会显示基础按钮"` 通过，含 1 月不触发提醒、2 月触发提醒与 2 月可报名；`npm run build` 通过。

## 2026-06-03 建章宫对话锁收口

- 问题：建章宫太后场景仍常驻渲染 `GlobalDialogueStage`，即使尚未进入真实对话，透明交互锁也会覆盖“送礼问安 / 起身告辞”等固定按钮。
- 已处理：`DowagerAudiencePanel` 拆成空闲态与对话态；空闲态只显示太后常驻立绘、场景说明和固定按钮，不挂全局对话锁。
- 已处理：点击送礼问安或起身告辞后才进入对话态；对话态继续使用共享 `GlobalDialogueStage`，并在对白 / 选项未收束前禁用固定按钮。
- 已补测试：建章宫初始不出现“建章宫太后对话框”，点击“送礼问安”后才出现对话框，且固定按钮进入不可交互态。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "建章宫"` 通过。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npm run build` 通过；仍有既有 Vite 大 chunk 警告。
- 验证：`web_game_playwright_client` 冒烟截图可正常加载启动页。

## 2026-06-03 妃嫔旬级行动与 NPC 拜访

- 目标：妃嫔不再固定待在自己殿内；每旬生成 NPC 行动表，支持公共外出、拜访玩家、拜访其他妃嫔、社交互动和低频宫斗筹谋。
- 已处理：新增 `npcActivityRuntime`，同一路线与旬 key 下生成稳定行动；死亡和冷宫妃嫔不生成行动。
- 已处理：公共外出地点从 `MAP_HOTSPOTS` 派生，排除“后宫”聚合入口和玩家寝殿占位，不再只覆盖五个功能小场景；空地图点也可以显示本旬 NPC 动向。
- 已处理：新增 `npcRelationRuntime` 和 `npcRelationMatrix`，送礼、试探、拉拢、传话、施压会在旬末改变 NPC-NPC 好感、紧张和压力。
- 已处理：A 拜访 B 时，B 原本公共外出会被取消并留殿接待；玩家进 B 的殿内可看到两人同场摘要。
- 已处理：NPC 拜访玩家改为寝殿空闲时自动打断并给玩家选择；公共地点和空地图点的 NPC 显示为可点击交互，点击后以地点入场叙述和行动摘要进入妃嫔日常对话。
- 已修正：外出 NPC 的目的地成为可见真值；地图地点弹窗不展示妃嫔动向，也不新增“前去见某妃”直达选项；进入地点后才显示可交互妃嫔，交谈后仍保留在目的地，只把入口置为已交谈不可重复触发。
- 已修正：NPC 拜访其他妃嫔时，被拜访者殿位和拜访按钮标记为“会客中”，避免玩家只从同场摘要里才知道此人正在接待来客。
- 已处理：NPC 动向调试仅在浏览器控制台输出；进入寝殿或地图时打印 `[npc-activity]` 与 `console.table`，不做游戏内调试面板。
- 已修正：NPC 行动表成为寝宫可见性的真值；公共外出、拜访玩家、拜访其他妃嫔的行动方不会再留在自己寝宫，拜访目标会留殿接待。
- 已修正：debug 表显示 `A 拜访 B` 时，后宫场景强制以 `visit-consort.targetConsortId` 为会客真值；即使 B 还有旧外出条目或该拜访已触发，B 仍在自己寝宫显示“会客中”，公共地点不会再同时显示 B。
- 已修正：后宫宫殿匹配兼容 `旧居X` 住址，旧居披香殿等历史 / 特殊住址会落到对应宫殿主殿。
- 已修正：NPC 拜访玩家每旬最多 1 人且概率降低；NPC 拜访其他妃嫔每个目标每旬最多接待 1 人，避免多对一。
- 已修正：NPC 动向 debug 同一旬只输出一次，不再每次行动或换地点重复刷表。
- 已修正：从地图进入“后宫”时保留 `activeMapLocation='后宫'`，因此后宫里的侧栏“外出”返回地图，“回宫”才直接回寝殿，不再经过一遍玩家住所。
- 已修正：玩家结束被拜访者殿内会客后，会将对应 `visit-consort` 标记为已触发；来访妃嫔回自己寝宫，被拜访者取消“会客中”标记。公共外出 NPC 的 `resolved` 仍只代表已交谈并继续留在目的地。
- 已修正：后宫拜访妃嫔结束后接入统一睡觉流程；深夜结束拜访会回宫、黑屏过夜、进入清晨通报。熬夜惩罚不再在黑屏前静默扣除，而是在清晨通报中由娇娇说明并同步扣除（压力 +2、健康 -10 显示值、气质 -10 显示值）。
- 已修正：大地图左侧“嫔妃 / 查看 / 纪事 / 情缘”不再借道寝宫打开，而是作为地图覆盖面板显示；外景面板中点击“外出”仍返回地图主视角，不会把玩家传回寝殿。
- 已修正：NPC-NPC 交流造成的妃嫔压力变化仅静默进入状态和 `npcRelationMatrix`，不再在玩家侧清晨 / 结算 toast 中提示；妃嫔声望变化仍按玩家可见反馈进入 toast。
- 已处理：`.gitignore` 加入 `__test__/`、`**/__test__/` 和 `output/`，本地个人测试目录与截图输出不参与同步。
- 已处理：NPC 宫斗改为依赖全局 10% 敌意筹谋，每旬最多生成 1 条 NPC 宫斗案。
- 已处理：宫斗事务 / 朝堂事务文案分离，朝堂事务明确只是预留草案，不改数值、不进入结算。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npx vitest run src/game/lib/npcActivityRuntime.test.ts src/game/lib/npcRelationRuntime.test.ts src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts` 通过，34 passed；`npx vitest run src/__tests__/app-flow.test.tsx` 通过，109 passed；仍有既有 React `act(...)` 警告。
- 复验：熬夜惩罚改为清晨通报触发后，`npx tsc -p tsconfig.json --noEmit` 通过；`npx vitest run src/__tests__/app-flow.test.tsx -t "后宫深夜拜访妃嫔结束后会在清晨通报熬夜惩罚|体力归零后会先展示行动结果"` 通过，2 passed；`npx vitest run src/__tests__/app-flow.test.tsx` 通过，109 passed。
- 复验：`npm test` 通过，22 files / 232 tests；仍有既有 React `act(...)` 警告与 AI key fallback 日志。
- 复验：`npm run build` 通过；仍有既有 Vite 大 chunk 警告。
- 复验：`web_game_playwright_client` 打开 `http://127.0.0.1:5173/`，启动页截图正常，未生成 console error 文件。

## 2026-06-04 合并冲突收口

- 已修复 `src/views/ChamberMainView.tsx` 合并冲突：保留“吩咐娇娇”寝殿面板，同时保留 NPC 地点偶遇入口、NPC 地点会面、NPC 拜访玩家与普通地点子场景的渲染链路。
- 已修复 `src/__tests__/app-flow.test.tsx` 合并冲突：直接初始化寝殿状态的测试不再重新走新游戏流程，并按竖排按钮的无障碍名称断言。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npx vitest run src/game/lib/npcActivityRuntime.test.ts src/game/lib/npcRelationRuntime.test.ts` 通过，11 passed。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx` 通过，121 passed；仍有既有 React `act(...)` 警告。

## 2026-06-04 后宫侧栏与外出语义修正

- 问题：后宫作为外景挂在 `activeChamberPanel='harem'` 与 `activeMapLocation='后宫'` 上，但左侧工具面板关闭时直接回 `main`，导致后宫 UI 被卸载并出现空白外景；在工具面板中点“外出”也容易沿用寝殿语义。
- 已处理：从后宫或娇娇面板打开“嫔妃 / 查看 / 纪事 / 情缘”等工具面板时记录返回面板；关闭工具面板后回到原后宫 / 娇娇面板，不再回寝殿主界面。
- 已处理：外景工具面板中的“外出”直接进入地图主视角，但保留旧 `activeMapLocation` 到 `AnimatePresence` 退出动画完成；`onExitComplete` 后再清理旧外景位置和面板状态，避免退出动画期间短暂重绘成玩家寝宫。
- 已处理：地图后宫热点移除多余“后宫总览”快捷选项，统一使用默认“进入此处”进入后宫外景。
- 已补测试：覆盖后宫热点不显示“后宫总览”、后宫左侧工具面板关闭后回到后宫、后宫 / 妙音堂 / 御膳房等外景点“外出”先保留旧外景状态，退出完成后再清理到地图。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx` 通过，122 passed；仍有既有 React `act(...)` 测试警告。
- 验证：`npm run build:web` 通过；仍有既有 Vite 大 chunk 警告。
- 验证：`git diff --check` 仅提示 Windows 换行归一化，没有空白错误。
- 验证：`web_game_playwright_client` 打开 `http://127.0.0.1:5173/` 生成启动页截图 `output/web-game/shot-0.png`，未生成 `errors-*.json`；已查看截图，启动页正常。
- 验证：`web_game_playwright_client` 打开 `http://127.0.0.1:5173/` 并生成启动页截图，未生成 console error 文件。

## 2026-06-04 Changelog 版本化整理

- 已处理：`CHANGELOG.md` 最新段改为版本化 `v0.4.0 - NPC 行动与外景视图收口`，覆盖原 2026-06-03 与 2026-06-04 内容，不再只覆盖 06-04。
- 已处理：新增 `codex-workdocs/2026-06-03-to-2026-06-04-summary.md`，总结 v0.4.0 对应的 NPC 行动、外景返回、后宫会客、过夜链路、事务与存档边界。
- 已处理：`docs/new-chat-start.md` 增加 changelog 维护规则：后续按版本更新；新增内容只写最新版本；修订已写内容时追加“版本号 - 修改内容简述 - 见第 N 条”，不覆盖原文。

## 2026-06-04 影落掖庭住处与后宫初见

- 已处理：`影落掖庭` 初始正式寝殿从 `掖庭院` 改为 `储秀宫西偏殿`，`GameNumericsState.residenceName` 扩展为地图地点或后宫殿位。
- 已处理：`掖庭院` 加入地图普通地点、开放时间和场景背景，不再作为玩家寝殿热点的替代显示。
- 已撤销：开发期不做旧存档结构迁移，移除 `yingluoyeting + 掖庭院` 归一化 fallback；旧结构存档会直接清除。
- 已修正为：影落掖庭开场定下用度后先完成普通地图教学，再前往后宫触发陈婉宁初见，收束后回到储秀宫西偏殿。
- 已同步：`CHANGELOG.md`、`docs/routes/yingluoyeting-mainline.md`、`docs/routes/mainline-story-overview.md`、`docs/codex-dialogue-handoff.md`、`docs/game-system-breakdown.md`、`docs/new-chat-start.md`。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过；`npx vitest run src/config/palaceUi.map.test.ts src/__tests__/yingluoyeting-map-flow.test.tsx src/__tests__/app-flow.test.tsx -t "影落掖庭|Yeting|后宫初见|住处|掖庭"` 通过，18 passed，仍有既有 React `act(...)` 警告。
- 复验：`npx vitest run src/game/lib/yingluoyetingStoryRuntime.test.ts src/game/store/gameFlowStore.save.test.ts` 通过，36 passed；浏览器 clean localStorage 冒烟可见启动页且 console error 为空。

## 2026-06-04 开发期存档策略收口

- 已处理：`SaveGameV1` 的 `progress.palaceBanquet`、`progress.npcActivity`、`relations.npcRelationMatrix` 改为当前 schema 必需字段。
- 已处理：`readSaveGameV1FromStorage()` 发现 envelope 解析失败或缺少当前必需字段时，会直接删除 `palace-galgame-flow`，不再尝试迁移。
- 已处理：`gameFlowStore.persist.merge` 不再兼容旧 raw Zustand store；没有当前 `SaveGameV1` envelope 时清档并使用初始 store。
- 已处理：移除 `music -> talent`、旧影落掖庭住处归一化、缺失 NPC 进度补默认值等读档 fallback。
- 已同步：`docs/save-system-maintenance.md`、`docs/game-state-model.md`、`docs/game-system-breakdown.md`、`docs/codex-dialogue-handoff.md`、`CHANGELOG.md`。
- 已修复：persist hydration 也复用 `isSaveGameV1()` 严格校验，避免畸形 `schemaVersion: 1` envelope 进入 App 后崩溃。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过；`npx vitest run src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts` 通过，28 passed。
- 验证：`npx vitest run src/config/palaceUi.map.test.ts src/__tests__/yingluoyeting-map-flow.test.tsx src/__tests__/app-flow.test.tsx -t "影落掖庭|Yeting|后宫初见|住处|掖庭|开始新游戏|回溯"` 通过，21 passed，仍有既有 React `act(...)` 警告。
- 验证：浏览器注入不兼容存档后刷新，页面回到启动页，console error 为空，旧 envelope 被清除；`npm run build:web` 通过，仍有既有 Vite 大 chunk 警告。

## 2026-06-04 UI 拖选屏蔽、后宫自宅入口与开局地图引导

- 已处理：全局 CSS 和 App 层 `selectstart` / `dragstart` 事件共同屏蔽普通 UI 文本、图片、SVG、canvas、video 被拖动、选中、复制的操作；输入框和可编辑区域保留文本选择能力。
- 已处理：`HaremPalaceView` 中玩家自己的殿位新增 `回到{residenceName}` 按钮，从后宫宫殿布局可直接回寝殿并清空 `activeMapLocation`。
- 已修正：`影落掖庭` 开场定下用度后不再直接把 `mapGuideFinished` 置为完成；先展示娇娇地图引导，完成后再触发后宫陈婉宁初见。
- 已同步：`CHANGELOG.md`、`docs/routes/yingluoyeting-mainline.md`、`docs/codex-dialogue-handoff.md`。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "影落掖庭开场定下用度|后宫自己的殿位"` 通过，2 passed；仍有既有 React `act(...)` 测试警告。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过；`npm run build:web` 通过，仍有既有 Vite 大 chunk 警告。
- 验证：`web_game_playwright_client` 打开 `http://127.0.0.1:5174/` 生成启动页截图正常；`5173` 当前抓到的不是本项目页面，因此单独启动了 `5174` 用于本轮验证。

## 2026-06-04 地图椒房殿误显修正

- 已处理：大地图移除独立 `椒房殿` 热点，不再用它作为玩家寝殿占位。
- 已处理：原 `椒房殿` 热点位置改回 `掖庭院`；地图上的掖庭院继续作为旧案、宫人差役与杂务地点。
- 已调整：`buildMapHotspots()` 不再按 `state.residenceName` 动态替换地图热点；回寝殿统一依赖侧栏 `回宫` 或后宫宫殿布局中的玩家殿位入口。
- 已同步：`CHANGELOG.md`、`docs/codex-dialogue-handoff.md`。
- 验证：`npx vitest run src/config/palaceUi.map.test.ts src/__tests__/yingluoyeting-map-flow.test.tsx src/__tests__/app-flow.test.tsx -t "Yeting|掖庭|椒房殿|寝殿热点|回宫统一|后宫宫殿住处"` 通过，18 passed；仍有既有 React `act(...)` 测试警告。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过；`npm run build:web` 通过，仍有既有 Vite 大 chunk 警告。

## 2026-06-04 地点弹窗 NPC 信息隐藏

- 已处理：`MapMainView` 的大地图地点弹窗不再渲染 `selectedHotspotNpcActivities`，地点描述只保留地点自身文案。
- 已保留：进入地点后的场景页仍显示“可交互妃嫔”入口，NPC 公共外出目的地真值不变。
- 已同步：`CHANGELOG.md`、`docs/codex-dialogue-handoff.md`、`docs/game-hard-rules.md`、`docs/system-hard-rules-integrated.md`、`docs/game-system-breakdown.md`。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "大地图地点弹窗不展示妃嫔信息|已交谈的外出妃嫔仍保留|公共地点 NPC 主动点击"` 通过，2 passed。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过；`npm run build:web` 通过，仍有既有 Vite 大 chunk 警告。

## 2026-06-05 玩家下毒 QTE 表现

- 目标：先做玩家主动下毒时的 QTE 表现，不新增存档字段，不改 NPC 宫斗和调查数据结构。
- 已处理：`宫斗事务 -> 下毒 -> 完成` 不再直接登记案件，而是先显示杯盏时机条；点击“停止并下毒”后才判定投放是否成功。
- 已处理：QTE 成功区域宽度受药理影响，指针速度受心计和压力影响；投放成功后复用原有 `startPalaceStrifeCase` 登记 `pending_resolution` 案件，投放失败不登记案件。
- 已调整：初始属性下的 QTE 难度上调，基础成功区间更窄、指针移动更快；高药理 / 高心计仍会降低难度。
- 已处理：NPC 宫斗可把玩家作为目标，也可把玩家作为嫁祸对象；玩家被害或被嫁祸且案件进入调查时会标记养心殿裁断。
- 已补测试：下毒点击完成会先出现“下毒时机”QTE，未停止前不会生成 `palaceStrifeCases`。
- 已补测试：NPC 宫斗 runtime 可生成“目标为玩家”和“嫁祸给玩家”的案件；主流程跨旬可由敌意筹谋生成目标为玩家的 NPC 宫斗案。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "宫斗事务选择下毒|宫斗事务下毒完成前|宫斗事务完成后"` 通过，3 passed。
- 验证：`npx tsc -p tsconfig.json --noEmit`、`npm run build:web` 通过；构建仍有既有 Vite 大 chunk 警告。
- 验证：浏览器从新局走到寝殿宫斗事务，下毒完成后可见“下毒时机”QTE，控制台 error 为空，截图输出到 `output/qte-visible.png`。

## 2026-06-05 v0.5.0 妃嫔扩容与掖庭毒药入口

- 本轮目标：后宫存活妃嫔扩到 `12` 人；掖庭院增加可购买毒药的 NPC；玩家主动下毒必须先持有并在成功投放时消耗毒药。
- 已处理：`buildInitialConcubineRoster()` 改为按路线固定妃嫔数量动态补足到 `12` 名存活妃嫔，并新增程雪砚、阿史那明珠、闻人照月、周怜星等生成模板。
- 已处理：掖庭院新增 `YetingYardView` 与“掖庭掌事 · 月姑姑”，可购买陨颜丹、麝香、鹤顶红；杜娘普通货单不再出售毒药。
- 已处理：宫斗事务下毒面板展示三种毒药持有数量；未持有对应毒药时不能进入 QTE；QTE 成功登记案件时消耗 `1` 份，失败不消耗，并增加同次成功防重复登记保护。
- 已同步：`CHANGELOG.md`、`docs/palace-strife-architecture.md`、`docs/game-hard-rules.md`、`docs/system-hard-rules-integrated.md`、`docs/game-state-model.md`、`docs/codex-dialogue-handoff.md` 和 `codex-workdocs/2026-06-05-v050-roster-yeting-poison.md`。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npx vitest run src/game/data/concubineRoster.test.ts src/__tests__/app-flow.test.tsx -t "宫门中的杜娘可购买|生成 12 名存活妃嫔|宫斗事务下毒|掖庭院月姑姑"` 通过，9 passed。
- 验证：`npm run build:web` 通过；仍有既有 Vite 大 chunk 警告。
- 验证：`web_game_playwright_client` 打开 `http://127.0.0.1:5173/` 生成启动页截图 `output/web-game-latest/shot-0.png`，未生成 console error 文件；另用 Playwright 全页截图 `output/web-game-latest/full-page.png` 确认页面正常加载，`full-page-errors.json` 为空。
- 验证：`git diff --check` 仅提示 Windows 换行归一化，没有空白错误。

## 2026-06-05 主动宫斗福德 toast 及时释放

- 问题：下毒 QTE 成功时会先消耗毒药并触发物品 toast，随后 `startPalaceStrifeCase()` 登记案件扣福德但没有发出新的数值反馈信号，导致福德扣除 toast 滞留到下一次事件才显示。
- 已修复：`startPalaceStrifeCase()` 在写入 `palaceStrifeCases` 和扣除福德后同步递增 `numericFeedbackSignal`，按当前视图释放 `chamber-action` 或 `map-event` 反馈。
- 已补测试：玩家下毒投放成功、案件登记和毒药消耗后，等待数值提示中出现“福德”。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npx vitest run src/game/data/concubineRoster.test.ts src/__tests__/app-flow.test.tsx -t "宫门中的杜娘可购买|生成 12 名存活妃嫔|宫斗事务下毒|掖庭院月姑姑|宫斗事务下毒投放成功"` 通过，9 passed。
- 验证：`npm run build:web` 通过；仍有既有 Vite 大 chunk 警告。
- 验证：`git diff --check` 仅提示 Windows 换行归一化，没有空白错误。

## 2026-06-05 福德加点与运行时单位收口

- 问题：福德此前在玩家面板和 toast 中按 `*10` 展示，导致主动下毒文案写 `福德-10`，toast 却显示 `福德 -100`。
- 已修复：区分属性分配点数和运行时福德值。属性分配页仍按 `1` 点显示 `10` 福德；点击确认进入剧情时，通过 `finalizeAttributeAssignment()` 将福德点数折算成运行时福德真值。
- 已修复：`FORTUNE_POINT_TO_VALUE_RATIO` 保持运行时倍率 `1`，`convertFortunePoints()` 允许负值并直接返回实际福德；`NumericChangeToastLayer` 展示运行时福德差值，不再二次 `*10`。
- 已修复：侍寝怀孕概率继续读取 `convertFortunePoints()`，因此正式游戏中按运行时福德值判定。
- 已补测试：属性页福德加点验证 `1` 点显示 / 折算为 `10` 福德；侍寝怀孕测试验证运行时福德 `3` 对应 `3%`；下毒成功 toast 明确断言 `福德 -10`。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx src/game/lib/nightlyServiceRuntime.test.ts src/game/store/gameFlowStore.save.test.ts -t "福德加点|direct fortune|宫斗事务下毒投放成功|祈福会增加福德|pays the fortune cost|属性调整"` 通过，6 passed。
- 验证：`npm run build:web` 通过；仍有既有 Vite 大 chunk 警告。
- 验证：`git diff --check` 仅提示 Windows 换行归一化，没有空白错误。
- 验证：`127.0.0.1:5173` 已有本地服务占用，本轮另起 `http://127.0.0.1:5174/` 验证；清空 localStorage 后 DOM 文本为 `凤华录 / 开始 / 前尘 / 回溯 / 设置`，console error 为空。截图暴露出既有启动页图片资源污染问题，未在本轮福德逻辑中处理。
- 复验：`http://127.0.0.1:5174/` 清空 localStorage 后 DOM 文本仍为 `凤华录 / 开始 / 前尘 / 回溯 / 设置`，console error 为空，截图输出 `output/web-game-5174/fortune-units-start.png`。

## 2026-06-05 全属性加点与运行时真值审计

- 问题：福德单位修正后，同类风险仍可能存在于健康、心计、容貌、气质和副属性，即属性分配阶段的点数被正式流程当真值使用，或运行时真值被 UI / toast 再次乘倍率展示。
- 已修复：`finalizeAttributeAssignment()` 现在统一折算所有属性。主属性按每点 `100`、福德按每点 `10`、副属性按每点 `10` 写入运行时真值，并设置 `attributeStatsFinalized`。
- 已修复：寝殿技能条、玩家面板、数值 toast、侍寝、宫斗、下毒 QTE、太医院剧情、寝殿行动、熬夜惩罚和月度用度结算按运行时真值读取；需要 `0..10` 能力档的局部公式只在公式内部反推，不改 `state.stats`。
- 已修复：正式属性增减中的小数点数残留已清空，例如寝殿行动副属性加 `2`、熬夜健康 / 气质扣 `10`、影落掖庭太医院抄药方药理加 `1`。
- 已补测试：新增“确认进入剧情会将所有加点属性折算为运行时真值”；熬夜惩罚和侍寝怀孕测试改为运行时真值输入；影落掖庭太医院剧情测试改为运行时属性。
- 已同步：`CHANGELOG.md`、`docs/game-state-model.md`、`docs/game-system-breakdown.md`、`docs/codex-dialogue-handoff.md`、`codex-workdocs/2026-06-05-v050-attribute-runtime-units.md`。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。
- 验证：`npx vitest run src/game/lib/yingluoyetingStoryRuntime.test.ts src/__tests__/app-flow.test.tsx src/game/store/gameFlowStore.save.test.ts src/game/lib/nightlyServiceRuntime.test.ts src/game/lib/palaceStrifeRuntime.test.ts -t "属性|福德加点|direct fortune|player service|宫斗事务下毒投放成功|祈福会增加福德|pays the fortune cost|resolves poison|resolves rumor|reveals pregnancy|熬夜惩罚|copy prescription"` 通过，18 passed。

## 2026-06-05 已确认属性存档恢复入口修正

- 问题：玩家在属性创建面板点击“确认进入剧情”后，存档内 `state.stats` 已经是运行时真值；但回溯恢复逻辑只看 `openingGuideFinished`，会把“已确认属性但未完成开场”的存档送回属性创建面板，导致面板再次按创建阶段倍率展示属性。
- 已修复：`resolveResumeViewFromSave()` 先判断 `attributeStatsFinalized`；未确认属性才回 `attribute-assignment`，已确认但未完成开场则回 `opening-dialogue`。
- 已加防御：`AttributeAssignmentView` 若异常拿到 `attributeStatsFinalized=true`，直接展示运行时真值，剩余点数显示“已确认”，属性加减禁用。
- 已补测试：覆盖已确认属性存档回溯不再进入创建面板，以及创建面板异常接收已确认真值时不显示 `30000` 这类二次倍率值。
- 已同步：`CHANGELOG.md`、`docs/game-state-model.md`、`docs/game-system-breakdown.md`、`docs/codex-dialogue-handoff.md`。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "回溯已确认属性|属性创建面板若拿到已确认属性|确认进入剧情会将所有加点属性|福德加点"` 通过，4 passed。
- 验证：`npx tsc -p tsconfig.json --noEmit` 通过。

## 2026-06-05 开发期银两 debug 指令

- 已新增浏览器控制台入口：开发期可执行 `palaceDebug.addSilver(数量)` 给玩家增加银两。
- 实现走 `debugAddSilver()` store 动作，同步 `state.silver` / `hiddenStats.silver`，并触发当前界面对应的数值反馈。
- 该入口只用于开发调试，不接 UI、不作为正式经济来源。
- 验证：`npx vitest run src/game/lib/debugConsole.test.ts src/game/store/gameFlowStore.save.test.ts -t "debug"` 通过，3 passed；`npx tsc -p tsconfig.json --noEmit`、`npm run build:web` 通过。
- 验证：`web_game_playwright_client` 启动页截图正常，页面上下文执行 `palaceDebug.addSilver(7)` 返回成功，银两从 `1000` 增至 `1007`，console error 为空。

## 2026-06-05 宫斗事务候选对象截断修复

- 问题：后宫妃嫔扩容到 `12` 人后，宫斗事务 UI 仍对目标、嫁祸对象和合谋候选执行 `.slice(0, 6)`，导致新扩充妃嫔虽然已进入 roster，但玩家无法选择她们宫斗。
- 已修复：`AffairsPanelView` 改为完整读取当前存活且非冷宫妃嫔；嫁祸对象和合谋候选同步取消旧的 6 人截断。
- 已补测试：覆盖 12 人 roster 中排在后面的妃嫔也会显示为宫斗目标和嫁祸对象。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "宫斗事务对象|宫斗事务选择下毒|宫斗事务下毒"` 通过，5 passed；`npx tsc -p tsconfig.json --noEmit`、`npm run build:web` 通过。
- 验证：`git diff --check` 仅提示 Windows 换行归一化；`web_game_playwright_client` 启动页截图未生成 console error 文件，截图仍有既有启动页图片资源污染，非本轮问题。

## 2026-06-05 v0.5.1 调查与定罪闭环

- 本轮目标：归档 `v0.5.0`，开启 `v0.5.1`；把宫斗调查从单一案件获罪率改为最多三名嫌疑人的独立定案率，并在“宫斗事务”中提供调查面板。
- 已处理：新增 `PalaceStrifeSuspectState`，案件保存 `suspects`、`convictedSuspectId`、`archivedXunKey` 和 `resolutionSummary`；`convictionRate` 只同步最高定案率作为展示值。
- 已处理：暴露案件按实际发起者、被嫁祸者、玩家牵连状态和妃嫔动机生成嫌疑人；被嫁祸者初始定案率至少 `70`。
- 已处理：调查推进改为每旬推进所有嫌疑人；本项最初将 `100` 作为定罪触发，后续已在“养心殿裁断与求情阶段”修订为进入待裁断；三旬无人到 `100` 则疑案归档。
- 已处理：“宫斗事务”有调查中或已归档案件时才显示“调查”步骤，调查中案件展示嫌疑人和定案率，归档案件展示定罪或疑案结论。
- 已处理：玩家可花 `20` 银两对任一嫌疑人执行定案率 `-5 / +5`；本项最初将推高到 `100` 作为定罪触发，后续已修订为进入待裁断。
- 已处理：开发期存档校验收紧，宫斗案件缺少 `suspects` 的旧存档直接清除，不做旧结构 fallback。
- 已同步：`CHANGELOG.md`、`docs/palace-strife-architecture.md`、`docs/palace-strife-b-rules.md`、`docs/game-hard-rules.md`、`docs/system-hard-rules-integrated.md`、`docs/game-state-model.md`、`docs/game-system-breakdown.md`、`docs/save-system-maintenance.md`、`docs/codex-dialogue-handoff.md`、`codex-workdocs/2026-06-05-v051-investigation-panel.md`。
- 验证：`npx vitest run src/game/lib/palaceStrifeRuntime.test.ts src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts` 通过。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "宫斗事务调查页|养心殿裁断|宫斗事务下毒|宫斗事务对象"` 通过。

## 2026-06-05 v0.5.1 养心殿裁断与求情阶段

- 本轮目标：宫斗案件达到定罪门槛后不再由娇娇 / 旬报直接定罪扣值，而是先进入 `pending_verdict`，下一旬清晨对玩家相关案件触发养心殿传唤与裁断对话。
- 已处理：调查推进和银两干预把嫌疑人推到 `100` 时只写入 `pendingVerdictSuspectId`、`status='pending_verdict'` 和待裁断摘要，不立即写 `convictedSuspectId`，不立即扣玩家或 NPC 声望 / 宠爱 / 压力。
- 已处理：新增 `YangxinVerdictEventState` 与 `pendingYangxinVerdict`，养心殿裁断走全局对话舞台；内侍传旨后，相关人发言，玩家可选“据理力争 / 委婉求情 / 沉默认罚”，裁断完成后才应用处罚。
- 已处理：NPC-only 待裁断案不打断玩家，由内廷静默裁断并在结算中应用 NPC 惩罚；玩家相关案件优先于普通清晨通报展示。
- 已处理：宫斗事务调查页新增“待裁断案件”；地图养心殿移除旧“养心殿裁断”工具面板入口。
- 已处理：`SaveGameV1` schema 提升到 `2`，保存 `cases.pendingYangxinVerdict`；旧 schema 或缺字段存档按开发期规则清除。
- 验证：`npx tsc --noEmit` 通过。
- 验证：`npx vitest run src/game/lib/palaceStrifeRuntime.test.ts src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts` 通过。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "养心殿裁断通过对话事件|宫斗事务调查页"` 通过。
- 验证：`npx tsc -p tsconfig.json --noEmit`、`npm run build:web` 通过；仍有既有 Vite 大 chunk 警告。
- 验证：`git diff --check` 仅提示 Windows 换行归一化，没有空白错误；`web_game_playwright_client` 打开 `http://127.0.0.1:5173/` 并输出启动页截图 `output/web-game-v051-investigation-final/shot-0.png`。

## 2026-06-08 v0.5.1 养心殿裁断场景修订

- 本轮目标：修正养心殿裁断仍像“假场景 / 黑屏过场”的表现，使裁断真正发生在养心殿内，并清理玩家本人被裁断时对白显示本名的问题。
- 已处理：`beginPendingYangxinVerdict`、清晨自动裁断和 `finalizeYangxinVerdict` 都保持 `activeMapLocation='养心殿'`；裁断开始、进行和结束都停留在真实养心殿地点状态。
- 已处理：养心殿背景改为内景；`ChamberMainView` 直接用现有 `GlobalDialogueStage` 在当前场景上展示内侍、皇帝、娇娇、玩家或妃嫔立绘，不再使用独立裁断组件。
- 已处理：玩家作为定罪候选人 / 被嫁祸者时，裁断对白统一用“你 / 娘娘”，不在对话正文里显示玩家本名。
- 已修订：普通进入养心殿恢复地点外景和入场剧情；裁断事件单独使用用户提供的 `yangxin_verdict_daytime.png`，不再复用侍寝图。玩家本人是定罪候选人时，选择按钮改为“为己申辩 / 低头请罪 / 沉默领罪”。
- 已修订：裁断选择进一步按身份分流。玩家本人是定罪候选人时显示“据证自辩 / 陈明疑点 / 伏身求宽 / 攀指旁人 / 沉默领罪”；玩家不是嫌疑人时显示“请皇上严断 / 只陈案情 / 指出疑点 / 代为求情 / 沉默旁听”，并分别调整处罚倍率与关系影响。
- 已修订：内侍传旨阶段保留在玩家寝宫；玩家点击前往后才进入养心殿裁断场景。
- 验证：`npx tsc --noEmit` 通过。
- 验证：`npx vitest run src/config/locationSceneBackgrounds.test.ts src/__tests__/app-flow.test.tsx -t "LOCATION_SCENE_BACKGROUNDS|养心殿裁断通过对话事件"` 通过。
- 验证：`npx vitest run src/game/lib/palaceStrifeRuntime.test.ts src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts` 通过。
- 验证：`npm run build:web` 通过；仍有既有 Vite 大 chunk 警告。
- 验证：`web_game_playwright_client` 打开 `http://127.0.0.1:5173/`，启动页截图输出到 `output/web-game-v051-yangxin-real-scene/shot-0.png`。
- 验证：in-app browser 重载 `http://127.0.0.1:5173/`，页面标题为“宫斗 AI 文字游戏”，启动入口可见，控制台无 error。
- 追加验证：`npx tsc --noEmit`、`npx vitest run src/config/locationSceneBackgrounds.test.ts src/__tests__/app-flow.test.tsx -t "LOCATION_SCENE_BACKGROUNDS|养心殿裁断通过对话事件|普通进入养心殿"`、`npx vitest run src/game/lib/palaceStrifeRuntime.test.ts src/game/store/gameFlowStore.save.test.ts`、`npm run build:web` 均通过；in-app browser 重载本地页无 error。
- 追加验证：`npx tsc --noEmit`、`npx vitest run src/game/lib/palaceStrifeRuntime.test.ts src/__tests__/app-flow.test.tsx -t "self-defense choices|witness and mercy choices|养心殿裁断通过对话事件"` 通过。
- 追加验证：`npx vitest run src/game/store/gameFlowStore.save.test.ts`、`npx vitest run src/config/locationSceneBackgrounds.test.ts`、`npm run build:web` 通过；in-app browser 重载本地页无 error。
- 追加验证：`npx tsc --noEmit`、`npx vitest run src/__tests__/app-flow.test.tsx -t "养心殿裁断通过对话事件|普通进入养心殿"`、`npx vitest run src/game/lib/palaceStrifeRuntime.test.ts src/game/store/gameFlowStore.save.test.ts`、`npm run build:web` 通过。

## 2026-06-15 v0.5.1 皇帝日间行为与互动机制

- 本轮目标：新增皇帝旬内日间动向、养心殿求见、正阳门等待下朝、御花园 / 建章宫公共偶遇与完整皇帝互动页。
- 已处理：新增 `emperorActivityRuntime`，按路线、旬、入场时辰和地点 deterministic 计算皇帝位置、养心殿求见成功率、正阳门偶遇和主行动结果。
- 已处理：地图进入公共地点时记录 `activeMapLocationEntryTime` 临时上下文；当前 v0.5.2 规则下，地点进入本身不消耗时间和体力，求见成功 / 失败、公共偶遇互动结束也不额外推进第二格。
- 已处理：`SaveGameV1` schema 提升到 `3`，新增 `progress.emperorInteraction` 保存皇帝互动触发记录；开发期旧结构继续直接清档，不做 fallback。
- 已处理：养心殿上午到傍晚可求见，夜晚 / 深夜由内侍劝归；正阳门清晨可等待下朝；御花园 / 建章宫中午到傍晚若皇帝在场可进入完整互动页。
- 已处理：皇帝交互页支持一次主行动和一次附加话题。主行动包括研墨、按摩、关心、抚琴、闲聊、撒娇、入怀、对弈；附加话题在送礼、美言、诉苦中三选一。
- 已处理：送礼消耗真实背包食物 / 绣品 / 字画，并新增字画类 `gift` 物品；美言 / 诉苦分别使目标妃嫔声望 `+5 / -5`。
- 已同步：`CHANGELOG.md`、`docs/game-state-model.md`、`docs/game-system-breakdown.md`、`docs/system-hard-rules-integrated.md`、`docs/codex-dialogue-handoff.md`。
- 验证：`npx tsc --noEmit` 通过。
- 验证：`npx vitest run src/game/lib/emperorActivityRuntime.test.ts src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts --testNamePattern "emperor|SaveGameV1|inventory gift"` 通过。
- 追加验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "普通进入养心殿|养心殿裁断|外出|建章宫|地图"` 通过，仍有既有 React `act(...)` 测试警告。
- 追加验证：`npm run build:web` 通过，仍有既有 Vite 大 chunk 警告；in-app browser 重载 `http://127.0.0.1:5173/`，启动页可见且 console error 为 0。

## 2026-06-16 v0.5.1 会面收束顺序修复

- 本轮目标：修复最后一次妃嫔互动结果被送客覆盖的问题，并补齐公共地点偶遇妃嫔 / 皇帝的外景收束演出。
- 已处理：`ConsortAudiencePanel` 将本旬次数触顶收束拆为“先播放行动结果，再播放送客”；收束优先级高于 AI `下一句` 续句，避免最后一次行动被继续对白吞掉。
- 已处理：妃嫔入场对白或行动结果未收起时，固定操作按钮禁用；玩家必须先读完当前对白再选择互动。
- 已处理：公共地点妃嫔偶遇使用独立外景收束文案，表现为随侍提醒行程、今日偶遇到此为止、玩家让开宫道。
- 已处理：皇帝公共偶遇新增 `farewell` 阶段，主行动结果后再播放外景“恭送圣驾”，不直接黑屏离场。
- 已同步：`CHANGELOG.md`、`docs/game-system-breakdown.md`、`docs/system-hard-rules-integrated.md`、`docs/emperor-behavior-architecture.md`、`docs/codex-dialogue-handoff.md`、`codex-workdocs/2026-06-16-v051-audience-sendoff-sequencing.md`。
- 验证：`npx tsc --noEmit` 通过。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "妃嫔本旬互动次数用尽|公共地点排班妃嫔|户外偶遇皇帝" --reporter=verbose` 通过，3 passed。
- 验证：`npx vitest run src/__tests__/app-flow.test.tsx --reporter=dot` 通过，136 passed；仍有既有 React `act(...)` 测试警告。
- 验证：`npm run build:web` 通过，仍有既有 Vite 大 chunk 警告。
- 验证：`web_game_playwright_client` 打开 `http://127.0.0.1:5174/`，截图 `output/web-game-v051-sendoff-sequencing/shot-0.png` 可见启动页，未见空白渲染。

## 2026-06-16 v0.5.1 剧情文本 CSV 配置化

- 本轮目标：将代码中的剧情正文优先抽到 CSV，按系统域分文件维护，不抽纯 UI 标签、短错误提示和数值 / 状态逻辑。
- 已处理：新增 `csvNarrativeLoader` 与 `narrativeCatalog`，通过 Vite `?raw` 读取 CSV，校验必填列、重复 ID、空正文和非法立绘位置。
- 已处理：新增八类剧情 CSV，并迁移开场、用度说明、地图引导、寝殿 / 地点行动、地点 fallback、妃嫔 / 太后 fallback、宫门 NPC、皇帝互动、侍寝演出和养心殿裁断固定对白。
- 已补测试：覆盖 CSV 解析、变量替换、全局 ID 唯一、代码引用 ID 存在性和缺失变量可见性。
- 已同步：`CHANGELOG.md`、`docs/game-system-breakdown.md`、`docs/system-hard-rules-integrated.md`、`docs/codex-dialogue-handoff.md`、`codex-workdocs/2026-06-16-v051-narrative-csv-config.md`。
- 验证：`npx tsc --noEmit` 通过；`npx vitest run src/game/narrative/csvNarrativeLoader.test.ts --reporter=verbose` 通过。
- 追加验证：`npx vitest run src/game/narrative/csvNarrativeLoader.test.ts src/__tests__/app-flow.test.tsx --reporter=dot` 通过，`141 passed`；仍有既有 React `act(...)` 测试警告。
- 追加验证：`npm run build:web` 通过；仍有既有 Vite 大 chunk 警告。
- 追加验证：`web_game_playwright_client` 打开 `http://127.0.0.1:5173/`，截图 `output/web-game-v051-narrative-csv/shot-0.png` 可见启动页，未见空白渲染。
- 追加文档：新增 `src/game/narrative/csv/README.md`，解释剧情 CSV 文件分工、统一表头字段含义、变量 / 分页 / CSV 转义规则、代码读取方式和校验规则；已单独强调文案策划最常编辑的说话人、立绘、正文和场景提示字段；`docs/codex-dialogue-handoff.md` 已加入阅读入口。
- 表头修订：移除剧情 CSV 中的 `nextActionLabel` 列；剧情 CSV 只维护正文和演出元数据，不再混入下一步按钮文案。
- 开场修订：`openingDialogueRuntime` 不再只读取 CSV 的 `text`，改为从 CSV entry 组装 `speakerIdentity`、`speakerName`、`portraitKey`、`portraitPlacement`、`narrationName` 与 `text`；开场响应和服务端 opening-dialogue 契约同步移除 `nextActionLabel`。
- 验证：`npx tsc --noEmit` 通过；`npx vitest run src/game/narrative/csvNarrativeLoader.test.ts --reporter=verbose` 通过。
- 追加验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "开场用度解释|寝殿调整用度说明|养心殿裁断通过对话事件|户外偶遇皇帝|结束本旬触发主角侍寝" --reporter=verbose` 通过，5 passed；仍有既有 React `act(...)` 测试警告。
- 追加验证：`npx vitest run src/game/narrative/csvNarrativeLoader.test.ts src/game/lib/localGameplayMode.test.ts --reporter=verbose` 通过，9 passed；`npx vitest run server/tests/integration/aiRoutes.test.ts --reporter=verbose` 通过，6 passed。
- 追加验证：`npx vitest run src/__tests__/app-flow.test.tsx -t "开场|用度|影落掖庭" --reporter=verbose` 通过；仍有既有 React `act(...)` 测试警告。

## 2026-06-18 v0.5.2 作品制作闭环

- 本轮目标：给绣花、字画、调香补齐“添加作品 -> 多次推进 -> 完成品入包 -> 送礼或变卖”闭环。
- 已处理：新增 `craft_works.csv`，维护作品类别、题材、主 / 辅能力、难度、基础售价和基础送礼好感。
- 已处理：新增 `craftWorkFormulaPage.ts` 和 `craftWorkFormulas.ts`，进度、成色、售价和送礼好感使用独立公式页，不把公式碎片写进 CSV。
- 已处理：新增 `progress.craftWorks.activeWorks`，`SaveGameV1` schema 提升到 `4`；旧存档缺少该进度块时按开发期规则清除。
- 已处理：寝殿没有独立“作品管理”入口；只能点击 `镂月裁云 / 泼墨作画 / 调制香薰` 进入对应类别面板。面板内可添加该类作品、推进进行中作品；当前不提供“只练习技艺”分支。
- 已处理：完成品生成 `crafted:{type}:{workId}:{quality}` 的 `gift` 背包物品，可送礼，也可按公式折算售价变卖；调香第一版只作为礼物 / 商品，不接毒药、药效或特殊状态。
- 已处理：清理旧裁断选择 ID `argue / plead / accept` 的残留默认值，NPC-only 静默裁断改用 `state-facts` 中性规则。
- 验证：`npx tsc --noEmit` 通过。
- 验证：`npx vitest run src/game/numerics/numericCatalog.test.ts src/game/lib/craftWorkRuntime.test.ts src/game/lib/palaceStrifeRuntime.test.ts src/game/save/saveGameV1.test.ts src/game/store/gameFlowStore.save.test.ts src/__tests__/app-flow.test.tsx --reporter=dot` 通过，`199 passed`；仍有既有 React `act(...)` 测试警告。
- 验证：`npm run build:web` 通过；仍有既有 Vite 大 chunk 警告。
- 验证：`web_game_playwright_client` 打开 `http://127.0.0.1:5173/`，截图 `output/web-game-v052-craft-works/shot-0.png` 可见启动页，未见空白渲染。
