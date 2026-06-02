# 新对话接手入口

当你在 `02-project` 中新开 Codex 对话时，先按下面顺序读取上下文，再继续开发。

## 1. 先读取 skill

先读这个 skill：

- `C:\02-project\.codex\skills\palace-game-frontend\SKILL.md`
- `C:\02-project\docs\codex-dialogue-handoff.md`

如有需要，再读：

- `C:\02-project\.codex\skills\palace-game-frontend\references\current-frontend-state.md`
- `C:\02-project\.codex\skills\palace-game-frontend\references\ai-boundaries.md`

这部分负责说明：
- 当前前端主流程
- 关键文件入口
- UI 常量
- 双 AI 接口边界
- 无 AI 也必须能跑通的规则

如涉及剧情文本、系统提示词、角色对白或场景生成，还必须读取：

- `C:\02-project\docs\character-dialogue-system-patch.md`

## 2. 再读取游戏硬规则

优先读取这些 Word 文档：

- `C:\02-project\game word\系统硬规则总稿.docx`
- `C:\02-project\game word\宫斗事务硬规则.docx`
- `C:\02-project\game word\侍寝与怀孕硬规则.docx`
- `C:\02-project\game word\皇帝行为与心情硬规则.docx`
- `C:\02-project\game word\晋升降位冷宫与协理六宫硬规则.docx`
- `C:\02-project\game word\经济与案件银两干预硬规则.docx`
- `C:\02-project\game word\皇嗣管理与生育后续硬规则.docx`
- `C:\02-project\game word\角色剧情节点与关系AI接口.docx`
- `C:\02-project\game word\自定义剧情妃与AI接口规则.docx`

如需纯文本版本，再读：

- `C:\02-project\docs\system-hard-rules-integrated.md`
- `C:\02-project\docs\save-system-maintenance.md`
- `C:\02-project\docs\palace-strife-architecture.md`
- `C:\02-project\docs\nightly-pregnancy-architecture.md`
- `C:\02-project\docs\emperor-behavior-architecture.md`
- `C:\02-project\docs\rank-governance-architecture.md`
- `C:\02-project\docs\economy-governance-architecture.md`
- `C:\02-project\docs\imperial-heir-architecture.md`
- `C:\02-project\docs\character-story-nodes-and-relationship-ai.md`
- `C:\02-project\docs\character-dialogue-system-patch.md`

## 3. 当前前端开发必须遵守

- 游戏必须在不依赖 AI 的情况下完整跑通。
- AI 只负责：
  - 文本补全
  - 对话意图分类
- 数值、判定、流程推进全部走本地硬规则。
- 现有前端流程不得打断：
  - `StartScene`
  - `RouteSelectionView`
  - `AttributeAssignmentView`
  - `OpeningDialogueView`
  - `MapMainView`
  - `ChamberMainView`
- 存档入口必须遵守 `docs/save-system-maintenance.md`：
  - 启动页“开始”必须二级确认，并通过 `startNewGame()` 清空旧存档后新建。
  - 启动页“回溯”必须通过 `resumeLastSave()` 读取上一次 `SaveGameV1`。
  - 不得用 `setCurrentView('route-selection')` 代替新局创建。
- 剧情 / 对话 UI 必须遵守交互锁：
  - 共享剧情文本优先使用 `GlobalDialogueStage`，由 `global-dialogue-stage__interaction-lock` 屏蔽背景点击。
  - 寝殿和地图背景按钮还必须保留 handler 级兜底，不允许对白未收起时继续结算行动、切面板或切地图地点。

## 4. 当前核心代码入口

- `C:\02-project\src\App.tsx`
- `C:\02-project\src\game\store\gameFlowStore.ts`
- `C:\02-project\src\game\save\saveGameV1.ts`
- `C:\02-project\src\game\data\routeProfiles.ts`
- `C:\02-project\src\config\palaceUi.ts`
- `C:\02-project\src\views\StartScene.tsx`
- `C:\02-project\src\views\RouteSelectionView.tsx`
- `C:\02-project\src\views\AttributeAssignmentView.tsx`
- `C:\02-project\src\views\OpeningDialogueView.tsx`
- `C:\02-project\src\views\MapMainView.tsx`
- `C:\02-project\src\views\ChamberMainView.tsx`
- `C:\02-project\src\index.css`

## 5. 每次前端改动后的最小验证

```powershell
npm run build:web
npx vitest run src/__tests__/app-flow.test.tsx
```

## 6. 建议新对话的第一句

```text
先读取 C:\02-project\docs\new-chat-start.md、C:\02-project\.codex\skills\palace-game-frontend\SKILL.md、以及 game word 中的系统硬规则总稿与相关硬规则文档，然后继续当前 02-project 的前端与双 AI 接口开发。
```

## 7. 本次会话新增交接重点（2026-05-09）

后续 Codex 接手前，额外注意：

1. 统一 handoff 文档只保留：
   - `docs/codex-dialogue-handoff.md`

2. 旧的并行 handoff 文档已删除：
   - `docs/codex-work-handoff-current.md`

3. `docs/codex-dialogue-handoff.md` 已新增多段同日总结，接手前至少先读：
   - `13. 本次会话操作总结（2026-05-09）`
   - `14. 本次会话补充操作总结（2026-05-09，代码清理与交接文档合并）`
   - `15. 本次会话补充操作总结（2026-05-09，当前最新）`

4. 当前最新补充会话主要做了：
   - 玩家住处、地图寝殿热点、回宫语义进一步收口
   - 旬报 / 月报 / 月俸骨架接入并留档
   - 位分推进与迁宫真正接入月结算
   - 妃嫔 AI 对话 timeout / fallback 稳定性修复
   - handoff 文档继续补齐最新交接说明

5. 接手后的第一优先级仍然不是扩框架，而是先复跑当前基线：

```bash
npx vitest run src/__tests__/app-flow.test.tsx
npm run build:web
```

6. 如果这两个基线仍通过，再继续下一轮；如果不通过，先收口当前地图 / 寝殿 / 妃嫔对话 / fallback 语义与构建红灯，不要直接扩大改造范围。
