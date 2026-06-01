# 02project 全局说明书

本文件用于在迁移到其他 IDE、其他机器或其他协作环境时，快速恢复本项目的开发上下文、UI 规范、资源索引与 AI/数值系统约束。

## 1. 核心技术栈与架构

### 前端
- 框架：`React 18` + `Vite 6`
- 语言：`TypeScript`
- 动画：`framer-motion`
- 状态管理：`Zustand`
- 样式方案：单一全局样式文件 `src/index.css`
- UI 组织方式：页面级视图放在 `src/views/`，系统级组件放在 `src/components/`

### 后端
- 框架：`Fastify 5`
- 语言：`TypeScript`
- 校验：`zod`
- 构建：`tsup`
- 缓存/总线：`ioredis`，同时支持内存回退

### 当前前端主流程
- `StartScene`
- `RouteSelectionView`
- `AttributeAssignmentView`
- `OpeningDialogueView`
- `MapMainView`
- `ChamberMainView`

入口文件：
- 前端入口：`src/App.tsx`
- 前端状态主仓：`src/game/store/gameFlowStore.ts`
- 后端应用入口：`server/src/app.ts`
- AI 路由入口：`server/src/routes/aiRoutes.ts`

### 当前架构要点
- 游戏采用“页面驱动 + 全局状态仓”的结构。
- 剧情展示与数值变化分离。
- 素材渲染主要靠绝对定位，不依赖大型布局系统。
- 游戏主设计以横屏为前提，迁移时禁止改造成纵向优先布局。

## 2. UI 渲染规范

### 2.1 横屏原则
- 本项目是横屏宫廷文游，核心画面按 `16:9` 设计。
- 当前开场对话页容器在 `src/index.css` 中使用：
  - `width: min(100vw - 40px, 1440px);`
  - `aspect-ratio: 16 / 9;`
- 新页面延续该思路，优先保持横屏比例，再做小屏适配。

### 2.2 绝对定位原则
- 宏观布局必须使用 `position: absolute` + `z-index` 分层，不要被 IDE、AI 插件或自动重构改回整页 `flex`/`grid`。
- 推荐结构：
  - 外层舞台容器 `position: relative`
  - 背景层 `absolute`
  - 状态栏层 `absolute`
  - 立绘舞台层 `absolute`
  - 对话框/按钮层 `absolute`
- `flex` 和 `grid` 只允许用于局部内容排列，例如按钮组、文字块、属性行，不允许替代舞台级定位。

### 2.3 图层管理协议
- 当前开场对话页采用明确的 `z-index` 层级：
  - `0`：背景
  - `5`：粒子/花瓣氛围层
  - `10`：角色立绘层
  - `20`：对话框层
  - `30`：状态栏与交互按钮层
- 迁移或新建 UI 时，请保留这种舞台式分层思路。

### 2.4 对话框素材规范
- 当前开场对白框使用 `border-image` 渲染，而不是普通背景拉伸。
- 已验证参数位于 `src/index.css`：

```css
.opening-dialogue__panel {
  border-style: solid;
  border-width: 60px;
  border-image-source: url('/assets/dialogue/dialog-box-final.png');
  border-image-slice: 60 fill;
  border-image-repeat: stretch;
}
```

- 迁移到其他 IDE 后，必须保留 `border-image-slice: 60 fill`，否则中间填充区会错位或被切掉。
- 对话框素材处理规则：
  - 去掉框外白底
  - 保留框体内部原有颜色与纹理

### 2.5 立绘白底处理规范
- 首选方案：用 `Sharp` 将原始图转成透明 PNG，再放入 `public/assets/`
- 当前脚本：`scripts/process-dialogue-ui.cjs`
- 当前已处理资源示例：
  - `public/assets/dialogue/jiaojiao-final.png`
  - `public/assets/dialogue/dialog-box-final.png`

- 若源图难以完整抠图，可使用 `mix-blend-mode: multiply` 作为补充方案，用于削弱白底边缘感。
- 当前仓库中已存在可复用的 `mix-blend-mode` 用法，见 `src/index.css`：

```css
.start-scene__title-image::after {
  background: #b8860b;
  mix-blend-mode: multiply;
}
```

- 迁移时建议规则：
  - 角色立绘优先透明 PNG
  - 无法彻底抠图时再叠加 `mix-blend-mode: multiply`
  - 不要单纯依赖 `opacity` 处理白底，那会损坏人物本体颜色

### 2.6 当前寝殿/对话 UI 渲染共识
- 背景图、状态条、立绘、对话框、选项按钮都按舞台层叠方式放置。
- 不要把寝殿主界面改写成信息后台风格面板。
- 目标视觉始终是古风叙事界面，而不是表单式应用界面。

## 3. 资源目录索引

### 设计源文件
- `picture/background/`
  - 场景底图与流程 UI 参考图
  - 包含：`寝殿ui.jpg`、`对话ui.jpg`、`地图ui.jpg`、`妃子ui.jpg`、`首页点击图.png` 等
- `picture/font/`
  - 文字、按钮、系统框体素材
  - 包含：`对话框.jpg`、`时间.jpg`、`时间表.jpg`、`确认.jpg`、`返回.jpg`、`随机.jpg`
- `picture/man/`
  - 男性角色立绘源图
  - 如：`皇帝.png`、`简宁.png`、`布自游.png`、`当一.png`、`卢安平.png`
- `picture/women/`
  - 女性角色立绘源图
  - 如：`娇娇.jpg` 及其他妃子/女性 NPC
- `picture/user/`
  - 玩家路线立绘源图

### 程序实际使用资源
- `public/assets/ui/`
  - 已处理后的 UI 资源
- `public/assets/dialogue/`
  - 对话框、时间条、娇娇等开场对白素材
- `public/assets/routes/`
  - 路线选择页按钮、字体 mask、人物立绘
- `public/assets/characters/`
  - 统一整理过的角色素材

### 文档与规则来源
- `game word/游戏架构目录.docx`
  - 原始游戏设计文档
- `reports/game-architecture.txt`
  - 提取后的纯文本版本，适合 AI / IDE 检索
- `docs/`
  - API、AI、GM 等补充说明

## 4. AI 系统配置

### 4.1 API 配置原则
- 文本 AI 与数值 AI 必须分开配置。
- 不允许把 API Key 硬编码到源码。
- 所有敏感信息从环境变量读取。

当前环境变量定义见：
- `server/src/config/env.ts`
- `.env.example`

推荐使用的环境变量：
- `TEXT_AI_BASE_URL`
- `TEXT_AI_API_KEY`
- `STAT_AI_BASE_URL`
- `STAT_AI_API_KEY`
- `CALC_AGENT_MODEL`
- `NARRATE_AGENT_MODEL`

当前默认文本 AI Base URL：
- `https://api.deepseek.com`

说明：
- 只记录调用位置，不在 README 中写入真实密钥。
- 迁移到其他 IDE 时，只需要复制 `.env` 本地文件并确认变量名一致。

### 4.2 双 AI 职责分工

#### 数据记录 AI
- 代码入口：`server/src/modules/ai/calcService.ts`
- 前端调用：`src/ai/calcAgent.ts`
- 职责：
  - 根据玩家行为计算结构化数值变化
  - 校验结果是否异常
  - 输出可缓存、可回放的 JSON
  - 负责概率、增减量、指标摘要、回滚建议

#### 文本补全 AI
- 代码入口：
  - `server/src/modules/ai/narrativeService.ts`
  - `server/src/modules/ai/openingDialogueService.ts`
- 前端调用：
  - `src/ai/narrateAgent.ts`
  - `src/ai/openingDialogueAgent.ts`
- 职责：
  - 生成剧情补全文案
  - 生成开场引导对白
  - 生成带说话人、情绪、选项的叙事 JSON

### 4.3 JSON 驱动原则
- AI 返回必须是结构化 JSON，不能直接返回自由文本供前端拼接。
- 典型输出内容包括：
  - 说话人身份
  - 说话人姓名
  - 文本正文
  - 选项数组
  - 数值变化提示
  - 时间消耗
  - 下一阶段标记

### 4.4 当前后端接入点
- 应用组装：`server/src/app.ts`
- 路由：
  - `/api/v1/ai/calc`
  - `/api/v1/ai/opening-dialogue`
  - `/api/v1/ai/narrative/:traceId`

## 5. 数值逻辑与规则

### 5.1 时间推进
- 按《游戏架构目录》执行 7 格制时间推进：
  - 清晨
  - 上午
  - 中午
  - 下午
  - 傍晚
  - 夜晚
  - 深夜
- 当前状态结构已在 `src/game/types.ts` 与 `src/game/store/gameFlowStore.ts` 中建立：
  - `year`
  - `month`
  - `xun`
  - `slot`
  - `slotIndex`
  - `slotProgress`

### 5.2 体力系统
- 架构文档核心规则：
  - 体力上限：`15`
  - 每旬初始体力：`10`
  - 下限：`0`
- 典型恢复：
  - 小酣 `+3`
  - 美食 `+2`
  - 点心 `+1`
- 典型消耗：
  - 看书/字画/刺绣/调香/乐理：`-2`
  - 会诊：`-1`
  - 拜访妃子：`-1`
  - 外出寺庙：`-3`

说明：
- 当前开场对白页已经展示“体力”字段。
- 完整寝殿行为结算仍将继续接入该规则。

### 5.3 五色稀有度与颜色映射
- 全局稀有度/强度色值：
  - 灰：`#7C7B78`
  - 青：`#70D1D7`
  - 蓝：`#7371D8`
  - 紫：`#E840B2`
  - 红：`#FF0800`

### 5.4 开局属性换算
- 五大主属性：
  - 健康：`1 点 = 100`
  - 福德：`1 点 = 10`
  - 心计：`1 点 = 100`
  - 容貌：`1 点 = 100`
  - 气质：`1 点 = 100`
- 五项副属性：
  - 才艺 / 丹青 / 女红 / 药理 / 政治
  - `1 级 = 10`
- 限制：
  - 药理 `<= 5`
  - 政治默认 `<= 2`
  - 兰因絮果、尘缘夙错路线政治可提升到 `4`

### 5.5 家世补偿规则
- 最低点数基线：`48`
- 最高补偿：`56`
- 特殊家世：
  - `异国贡女` 等价五品
  - `罪臣之后` 仅影落掖庭线出现

### 5.6 宠爱体系
- 全局区间：
  - `-100 ~ -50` 憎恶
  - `-49 ~ 0` 厌恶
  - `1 ~ 20` 无宠
  - `21 ~ 40` 小宠
  - `41 ~ 60` 得宠
  - `61 ~ 80` 盛宠
  - `81 ~ 100` 独宠
- 全局约束：
  - 同时最多 `1` 人独宠
  - 同时最多 `2` 人盛宠
  - 同时最多 `4` 人得宠

### 5.7 压力规则
- 压力范围：`0 ~ 100`
- 玩家压力 `> 80`：
  - 不直接疯癫
  - 每月额外扣寿命 `0.2`
- NPC 压力过高：
  - 可性情大变
  - 有概率疯癫

## 6. 当前开发进度

### 已完成
- 启动封面页 `StartScene`
- 开局路线选择页 `RouteSelectionView`
- 属性分配页 `AttributeAssignmentView`
- 开场引导页 `OpeningDialogueView`
- 地图主界面 `MapMainView`
- 寝殿主界面 `ChamberMainView`
- 路线数据、家世补偿、基础点数校验已接入
- 开场对白文本 AI 接口已接入
- 数值 AI 与文本 AI 已拆分为双配置通道
- `Foundation` 相关后端配置、规则、测试基础已存在

### 部分完成
- 开场对白已经具备：
  - 娇娇引导
  - 时间状态展示
  - 选项式推进
  - 进入地图与寝殿的主流程接线
- 寝殿已有主界面、基础面板与部分地点入口，宴席、皇嗣、串门/追思等次级功能仍是后续扩展点

### 下一步任务
- 完成仍为预留状态的宴席、皇嗣、串门/追思等次级功能
- 继续加深地图地点事件与寝殿功能循环
- 接入每 10-20 轮至少 3 选项的剧情推进机制
- 补完存档/读档节点
- 将数值变化与剧情文本联动到完整宫斗循环

## 7. 角色立绘映射规范

### 男性角色固定映射
- 容安（皇帝）→ `picture/man/皇帝.png`
- 简宁 → `picture/man/简宁.png`
- 布自游 → `picture/man/布自游.png`
- 当一 → `picture/man/当一.png`
- 卢安平 → `picture/man/卢安平.png`

### 女性角色映射
- 女性角色名默认与 `picture/women/` 中同名文件一一对应

### 玩家路线立绘
- 来源：`picture/user/`
- 当前程序资源：`public/assets/routes/portraits/`

## 8. 开发与迁移提醒

### 启动命令

```bash
npm install
npm run dev
```

常用命令：

```bash
npm run dev:web
npm run dev:api
npm run build
npm run test
npm run test:unit
npm run test:integration
```

### 迁移到其他 IDE 时必须检查
- `.env` 是否补齐
- `public/assets/` 是否完整拷贝
- `picture/` 原始素材是否完整保留
- `src/index.css` 是否被自动格式化后破坏绝对定位
- `border-image` 是否仍按原参数生效
- `opening-dialogue` / `route-selection` / `attribute-assignment` 的层级与定位是否被重写

### 不要做的事
- 不要把舞台式绝对定位 UI 自动改回通栏 `flex`
- 不要把 AI key 写死进源码
- 不要跳过 JSON 契约直接让 AI 返回裸文本
- 不要删除 `reports/game-architecture.txt`，它是检索设计规则的高频入口

## 9. 文件大纲速览

- `src/App.tsx`：前端主视图切换
- `src/index.css`：全局样式与 UI 协议核心文件
- `src/views/StartScene.tsx`：封面页
- `src/views/RouteSelectionView.tsx`：路线选择页
- `src/views/AttributeAssignmentView.tsx`：属性分配页
- `src/views/OpeningDialogueView.tsx`：开场引导对话页
- `src/game/store/gameFlowStore.ts`：游戏流程与数值状态仓
- `src/ai/openingDialogueAgent.ts`：前端开场对白 API 调用
- `server/src/app.ts`：后端应用组装
- `server/src/config/env.ts`：环境变量定义
- `server/src/routes/aiRoutes.ts`：AI 路由
- `server/src/modules/ai/calcService.ts`：数值 AI
- `server/src/modules/ai/narrativeService.ts`：剧情补全 AI
- `server/src/modules/ai/openingDialogueService.ts`：开场对白 AI
- `reports/game-architecture.txt`：架构文本总规则
- `picture/`：原始设计素材
- `public/assets/`：程序实际使用素材
