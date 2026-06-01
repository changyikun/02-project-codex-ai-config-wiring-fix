import path from "node:path";
import fs from "node:fs/promises";
import {
  Presentation,
  PresentationFile,
  column,
  row,
  grid,
  panel,
  text,
  rule,
  fill,
  fixed,
  hug,
  wrap,
  fr,
} from "@oai/artifact-tool";

const ROOT = "D:/02-project-codex-ai-config-wiring-fix/02-project-codex-ai-config-wiring-fix";
const OUT_DIR = path.join(ROOT, "docs", "exports");
const PPTX_OUT = path.join(OUT_DIR, "game-system-breakdown.pptx");
const PREVIEW_DIR = path.join(OUT_DIR, "pptx-preview");

const C = {
  ink: "#17324D",
  blue: "#1D4E89",
  teal: "#267D8C",
  mint: "#DDF2EF",
  sand: "#F5EFE3",
  paper: "#FBFAF7",
  line: "#8AA6B2",
  red: "#B94A48",
  muted: "#5B6670",
  white: "#FFFFFF",
};

const W = 1920;
const H = 1080;

const presentation = Presentation.create({ slideSize: { width: W, height: H } });

function t(value, opts = {}) {
  return text(value, {
    width: opts.width ?? fill,
    height: opts.height ?? hug,
    style: {
      fontFace: "Microsoft YaHei",
      fontSize: opts.size ?? 30,
      bold: opts.bold ?? false,
      color: opts.color ?? C.ink,
      ...opts.style,
    },
    ...opts.node,
  });
}

function titleStack(title, subtitle) {
  return column(
    { width: fill, height: hug, gap: 16 },
    [
      t(title, { size: 52, bold: true, color: C.ink }),
      rule({ width: fixed(180), stroke: C.teal, weight: 5 }),
      subtitle ? t(subtitle, { size: 24, color: C.muted, width: wrap(1320) }) : t("", { size: 1 }),
    ],
  );
}

function chip(label, color = C.blue) {
  return panel(
    { padding: { x: 20, y: 10 }, borderRadius: 18, fill: "#FFFFFF", stroke: color, strokeWidth: 2 },
    t(label, { size: 22, bold: true, color }),
  );
}

function note(label, body, accent = C.teal) {
  return panel(
    { padding: { x: 28, y: 22 }, fill: "#FFFFFF", stroke: accent, strokeWidth: 2, borderRadius: 10 },
    column({ width: fill, height: hug, gap: 10 }, [
      t(label, { size: 24, bold: true, color: accent }),
      t(body, { size: 22, color: C.ink, width: fill }),
    ]),
  );
}

function addSlide(composeNode, bg = C.paper) {
  const slide = presentation.slides.add();
  slide.compose(composeNode, { frame: { left: 0, top: 0, width: W, height: H }, baseUnit: 8 });
  return slide;
}

function arrowLabel(label) {
  return t(label, { size: 30, bold: true, color: C.teal, width: hug });
}

addSlide(
  column(
    { width: fill, height: fill, padding: { x: 110, y: 92 }, gap: 34 },
    [
      t("后宫养成游戏", { size: 86, bold: true, color: C.ink, width: wrap(1400) }),
      t("系统拆解汇报", { size: 72, bold: true, color: C.teal, width: wrap(1200) }),
      rule({ width: fixed(300), stroke: C.red, weight: 6 }),
      t("以“旬行动 + 月结算”为骨架，串联路线、属性、后宫关系、宫斗案件、侍寝怀孕、位分权力与 AI 包装。", {
        size: 30,
        color: C.muted,
        width: wrap(1280),
      }),
      row({ width: fill, height: hug, gap: 16 }, [chip("系统策划版"), chip("DOCX 完整报告"), chip("PPTX 汇报版", C.red)]),
    ],
  ),
);

addSlide(
  column({ width: fill, height: fill, padding: 76, gap: 38 }, [
    titleStack("项目定位", "宫斗 / 剧情 / 数值养成的横屏古风视觉小说舞台。"),
    grid(
      { width: fill, height: fill, columns: [fr(1), fr(1), fr(1)], rows: [fr(1), fr(1)], columnGap: 24, rowGap: 24 },
      [
        note("操作单位", "每旬 7 个时间格，每月 3 旬，每年 12 月。"),
        note("核心体验", "选线入宫、分配属性、行动经营、触发关系与月结算。", C.blue),
        note("技术形态", "React + Vite 前端，Zustand 状态，Fastify 后端。", C.red),
        note("AI 定位", "AI 负责文本与倾向；硬数值由系统规则钳制。"),
        note("当前落地", "启动、路线、属性、开场、地图、寝殿与部分面板。", C.blue),
        note("主风险", "规则文档很完整，玩法入口需先做纵向闭环。", C.red),
      ],
    ),
  ]),
);

addSlide(
  column({ width: fill, height: fill, padding: 76, gap: 32 }, [
    titleStack("总体系统架构", "前端舞台、状态仓库、规则配置、后端 AI 与 Foundation 服务分层。"),
    row({ width: fill, height: fixed(430), gap: 20 }, [
      note("前端舞台层", "App / Views / Components\n负责页面流程、地图、寝殿、状态展示。", C.blue),
      arrowLabel("→"),
      note("游戏状态层", "gameFlowStore\n存档真值、时间、资源、妃嫔、关系、物品。", C.teal),
      arrowLabel("→"),
      note("规则运行层", "src/config + src/game/lib\n硬规则、兜底文本、合法性与收益结算。", C.red),
    ]),
    row({ width: fill, height: fixed(250), gap: 20 }, [
      note("Fastify API", "统一承接 AI 与 Foundation 路由。", C.blue),
      note("AI 服务", "开场、妃嫔对话、关系判定、地点氛围。", C.teal),
      note("Foundation", "家世、福德、月结、晋升、储君与结局校验。", C.red),
    ]),
  ]),
);

addSlide(
  column({ width: fill, height: fill, padding: 76, gap: 44 }, [
    titleStack("玩家主流程", "当前实现已能从启动一路进入地图与寝殿主循环。"),
    row({ width: fill, height: fixed(230), gap: 14 }, [
      chip("启动封面", C.blue),
      arrowLabel("→"),
      chip("路线选择", C.blue),
      arrowLabel("→"),
      chip("属性分配", C.blue),
      arrowLabel("→"),
      chip("娇娇引导", C.blue),
      arrowLabel("→"),
      chip("宫廷地图", C.blue),
      arrowLabel("→"),
      chip("寝殿主界面", C.blue),
    ]),
    grid({ width: fill, height: fill, columns: [fr(1), fr(1), fr(1)], columnGap: 24 }, [
      note("地图", "地点热点、宫门 NPC、交易、地点场景入口。", C.teal),
      note("寝殿", "学习、休息、外出、结束本旬、系统面板。", C.red),
      note("面板", "属性、妃嫔、情缘、纪事、物品、宫务、杂项。", C.blue),
    ]),
  ]),
);

addSlide(
  column({ width: fill, height: fill, padding: 76, gap: 36 }, [
    titleStack("核心循环", "玩家的有效选择由体力、时间格和月结算压力共同限制。"),
    row({ width: fill, height: fixed(190), gap: 12 }, [
      chip("旬初清晨", C.teal),
      arrowLabel("→"),
      chip("查看状态", C.teal),
      arrowLabel("→"),
      chip("选择行动", C.teal),
      arrowLabel("→"),
      chip("扣资源", C.teal),
      arrowLabel("→"),
      chip("硬规则结算", C.teal),
      arrowLabel("→"),
      chip("文本包装", C.teal),
    ]),
    row({ width: fill, height: fixed(170), gap: 12 }, [
      chip("7 格耗尽/结束本旬", C.red),
      arrowLabel("→"),
      chip("下一旬清晨", C.red),
      arrowLabel("→"),
      chip("跨 3 旬", C.red),
      arrowLabel("→"),
      chip("月结算", C.red),
    ]),
    grid({ width: fill, height: fill, columns: [fr(1), fr(1), fr(1), fr(1)], columnGap: 18 }, [
      note("经济", "月俸 - 宫务开销"),
      note("身份", "声望推进位分"),
      note("风险", "压力、健康、冷宫"),
      note("事件", "宴会、选秀、避暑"),
    ]),
  ]),
);

addSlide(
  column({ width: fill, height: fill, padding: 76, gap: 30 }, [
    titleStack("系统地图", "六大系统群共同构成后宫沙盘。"),
    grid({ width: fill, height: fill, columns: [fr(1), fr(1), fr(1)], rows: [fr(1), fr(1)], columnGap: 24, rowGap: 24 }, [
      note("时间经营", "年月旬、七时间格、旬初体力重算、月结算。", C.blue),
      note("玩家成长", "主属性、副属性、银两、声望、宠爱、压力、真心值。", C.teal),
      note("后宫生态", "妃嫔名单、宠爱档位、关系倾情、位分居所、冷宫。", C.red),
      note("事件系统", "宫宴、家宴、选秀、避暑、宫斗案件、侍寝怀孕。", C.blue),
      note("外部经营", "家族、朝堂、皇嗣、杜娘交易。", C.teal),
      note("AI 包装", "开场、妃嫔对话、关系倾向、地点氛围、本地兜底。", C.red),
    ]),
  ]),
);

addSlide(
  column({ width: fill, height: fill, padding: 76, gap: 34 }, [
    titleStack("核心状态模型", "当前游戏真值集中在 Zustand store，后续应向统一 SaveGameV1 收口。"),
    row({ width: fill, height: fill, gap: 24 }, [
      note("GameNumericsState", "姓名、年龄、家世、路线、体力、银两、声望、宠爱、压力、真心值、stats、flags。", C.blue),
      note("PalaceTimeState", "year / month / xun / slotIndex / slot / slotProgress。", C.teal),
      note("Concubine + Bond", "妃嫔档案、关系进度、每旬好感/倾情变化上限、最近上下文。", C.red),
    ]),
    t("策划判断：状态模型是后续所有系统接入的第一优先级，避免宫斗、怀孕、皇嗣各自维护真值。", {
      size: 28,
      bold: true,
      color: C.ink,
    }),
  ]),
);

addSlide(
  column({ width: fill, height: fill, padding: 76, gap: 34 }, [
    titleStack("路线与地图", "四条路线共用后宫沙盘，但初始资源、关键节点和结局目标不同。"),
    grid({ width: fill, height: fixed(360), columns: [fr(1), fr(1), fr(1), fr(1)], columnGap: 18 }, [
      note("兰因絮果", "权力线：摄政、独宠、共主、归隐等。", C.red),
      note("浮生如梦", "标准剧情线：非意外结局与情感叙事。", C.teal),
      note("影落掖庭", "翻案线：低资源、证据、沉冤得雪。", C.blue),
      note("尘缘夙错", "异国线：和亲、故国、阿翎、改朝换代。", C.red),
    ]),
    row({ width: fill, height: fill, gap: 24 }, [
      note("公共地点", "御膳房、太医院、宝华殿、妙音堂、华清池、宫门。", C.blue),
      note("事件地点", "养心殿仅在侍寝等事件触发时开放。", C.red),
      note("后宫宫殿", "十二宫、妃嫔居所、位分容量与迁宫规则。", C.teal),
    ]),
  ]),
);

addSlide(
  column({ width: fill, height: fill, padding: 76, gap: 34 }, [
    titleStack("后宫关系与宫斗案件", "普通关系走 AI/兜底倾向；硬事件走强制覆盖。"),
    row({ width: fill, height: fixed(230), gap: 16 }, [
      chip("普通对话", C.blue),
      arrowLabel("→"),
      chip("关系倾向判定", C.blue),
      arrowLabel("→"),
      chip("每旬上限钳制", C.blue),
      arrowLabel("→"),
      chip("写入关系进度", C.blue),
    ]),
    row({ width: fill, height: fixed(230), gap: 16 }, [
      chip("造谣/下毒/陷害", C.red),
      arrowLabel("→"),
      chip("扣福德/增压力", C.red),
      arrowLabel("→"),
      chip("两次检定", C.red),
      arrowLabel("→"),
      chip("案件/惩处/冷宫", C.red),
    ]),
    t("案件干预统一口径：20 银两 -> 5 点嫌疑变化；结案确认后关系不走普通增减，按事件轻中重硬覆盖。", {
      size: 26,
      color: C.muted,
    }),
  ]),
);

addSlide(
  column({ width: fill, height: fill, padding: 76, gap: 34 }, [
    titleStack("侍寝、怀孕与皇嗣", "夜晚不是独立百分比，而是互动池权重抽取。"),
    row({ width: fill, height: fixed(220), gap: 12 }, [
      chip("夜晚", C.teal),
      arrowLabel("→"),
      chip("独寝判定", C.teal),
      arrowLabel("→"),
      chip("互动池", C.teal),
      arrowLabel("→"),
      chip("权重抽取", C.teal),
      arrowLabel("→"),
      chip("侍寝对象", C.teal),
    ]),
    row({ width: fill, height: fixed(220), gap: 12 }, [
      chip("玩家侍寝", C.red),
      arrowLabel("→"),
      chip("兴致互动", C.red),
      arrowLabel("→"),
      chip("怀孕判定", C.red),
      arrowLabel("→"),
      chip("生产风险", C.red),
      arrowLabel("→"),
      chip("皇嗣养成", C.red),
    ]),
    grid({ width: fill, height: fill, columns: [fr(1), fr(1), fr(1)], columnGap: 18 }, [
      note("冷却", "生产/流产后 3 个月不能怀孕。"),
      note("健康", "生产风险按生产时健康分层。", C.blue),
      note("立储", "生母血脉、路线例外、朝臣支持共同决定。", C.red),
    ]),
  ]),
);

addSlide(
  column({ width: fill, height: fill, padding: 76, gap: 36 }, [
    titleStack("AI 与硬规则边界", "AI 是叙事层增强，不是数值裁判。"),
    row({ width: fill, height: fixed(230), gap: 16 }, [
      chip("玩家选择", C.blue),
      arrowLabel("→"),
      chip("合法性检查", C.blue),
      arrowLabel("→"),
      chip("AI 文本/倾向", C.teal),
      arrowLabel("→"),
      chip("硬规则钳制", C.red),
      arrowLabel("→"),
      chip("写入状态", C.red),
    ]),
    grid({ width: fill, height: fill, columns: [fr(1), fr(1), fr(1)], columnGap: 24 }, [
      note("AI 负责", "对白、文案细化、三选项措辞、场景氛围、总结。", C.teal),
      note("系统负责", "能不能做、成功率、数值变化、建案、晋升、怀孕。", C.red),
      note("兜底要求", "关闭 AI 后仍可靠模板文本和固定选项完整跑通。", C.blue),
    ]),
  ]),
);

addSlide(
  column({ width: fill, height: fill, padding: 76, gap: 34 }, [
    titleStack("落地状态与开发顺序", "先做纵向闭环，再扩展规则宽度。"),
    grid({ width: fill, height: fixed(420), columns: [fr(1), fr(1), fr(1)], columnGap: 24 }, [
      note("已落地", "启动、路线、属性、开场、地图、寝殿、部分面板、AI 接口骨架", C.blue),
      note("部分落地", "时间体力、妃嫔、情缘、物品、位分推进、规则服务", C.teal),
      note("待接主循环", "宫斗案件、侍寝怀孕、皇嗣管理、完整冷宫、月度压力", C.red),
    ]),
    row({ width: fill, height: fixed(190), gap: 12 }, [
      chip("统一状态模型", C.red),
      arrowLabel("→"),
      chip("月结压力闭环", C.red),
      arrowLabel("→"),
      chip("宫斗 MVP", C.red),
      arrowLabel("→"),
      chip("侍寝怀孕 MVP", C.red),
      arrowLabel("→"),
      chip("皇嗣权力线", C.red),
    ]),
  ]),
);

async function saveBlob(blob, filePath) {
  if (typeof blob.save === "function") {
    await blob.save(filePath);
    return;
  }
  const buffer = Buffer.from(await blob.arrayBuffer());
  await fs.writeFile(filePath, buffer);
}

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(PREVIEW_DIR, { recursive: true });

const pptxBlob = await PresentationFile.exportPptx(presentation);
await saveBlob(pptxBlob, PPTX_OUT);

for (let i = 0; i < presentation.slides.count; i += 1) {
  const slide = presentation.slides.getItem(i);
  const png = await slide.export({ format: "png" });
  await saveBlob(png, path.join(PREVIEW_DIR, `slide-${String(i + 1).padStart(2, "0")}.png`));
}

console.log(PPTX_OUT);
console.log(PREVIEW_DIR);
