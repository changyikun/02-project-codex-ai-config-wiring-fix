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
