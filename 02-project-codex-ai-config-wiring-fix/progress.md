Original prompt: 添加存档系统，回溯可以读取上一次存档，开始游戏会清空存档并新建存档（有二级确认）；关于存档功能的维护，需要把这部分写到全局文档里，以便更好的同步，之前已经做出的修改也需要将之前的文档修改到一致

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
- 已处理：学谱本身会增加乐理显示值 `+2`，内部为 `talent +0.2`，并随行动结果触发 toast。
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
- 已修正：外出 NPC 的目的地成为可见真值；地图地点弹窗只提示本旬在此的妃嫔动向，不再新增“前去见某妃”直达选项；进入地点后才显示可交互妃嫔，交谈后仍保留在目的地，只把入口置为已交谈不可重复触发。
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
