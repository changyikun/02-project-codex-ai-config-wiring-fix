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
