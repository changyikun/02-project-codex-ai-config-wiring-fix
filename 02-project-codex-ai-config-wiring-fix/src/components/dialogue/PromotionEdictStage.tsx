import { useMemo, useState, type AnimationEvent } from 'react';
import type { SettlementReport } from '../../game/types';
import { renderNarrativeEntry } from '../../game/narrative/narrativeCatalog';
import { GlobalDialogueStage } from './GlobalDialogueStage';

const OPEN_SCROLL_SRC = '/assets/routes/buttons/materials-202606231052/material-202606231052-001.png';
const LEFT_SCROLL_SRC = '/assets/routes/buttons/materials-202606231052/material-202606231052-003.png';
const RIGHT_SCROLL_SRC = '/assets/routes/buttons/materials-202606231052/material-202606231052-004.png';
const SHENG_GLYPH_SRC = '/assets/routes/buttons/materials-202606231052/material-202606231107-018.png';
const ZHI_GLYPH_SRC = '/assets/routes/buttons/materials-202606231052/material-202606231107-019.png';
const EUNUCH_PORTRAIT_SRC = '/assets/characters/men/taijian.png';

const normalizeEdictLine = (line: string): string =>
  line
    .replace(/^内侍奉旨来报：/u, '')
    .replace(/^皇上有旨，/u, '')
    .trim();

type EdictColumnKind = 'date' | 'body' | 'rank' | 'seal';

interface EdictColumn {
  text: string;
  kind: EdictColumnKind;
}

const MAX_BODY_COLUMN_CHARS = 13;

const splitBodyText = (text: string): string[] => {
  const compactText = text.trim();
  if (compactText.length <= MAX_BODY_COLUMN_CHARS) {
    return compactText ? [compactText] : [];
  }

  const segments = compactText
    .split(/(?<=[，。；、])/u)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const columns: string[] = [];
  let current = '';

  for (const segment of segments.length > 0 ? segments : [compactText]) {
    if (current && current.length + segment.length > MAX_BODY_COLUMN_CHARS) {
      columns.push(current);
      current = segment;
      continue;
    }
    current = `${current}${segment}`;
  }
  if (current) {
    columns.push(current);
  }

  return columns.flatMap((column) => {
    if (column.length <= MAX_BODY_COLUMN_CHARS + 2) {
      return [column];
    }
    const chunks: string[] = [];
    for (let index = 0; index < column.length; index += MAX_BODY_COLUMN_CHARS) {
      chunks.push(column.slice(index, index + MAX_BODY_COLUMN_CHARS));
    }
    return chunks;
  });
};

const bodyColumns = (text: string): EdictColumn[] => splitBodyText(text).map((chunk) => ({ text: chunk, kind: 'body' }));

const buildPromotionLineColumns = (line: string): EdictColumn[] => {
  const normalized = normalizeEdictLine(line);
  const rankMatch = /由(.+?)晋为(.+?)(?:。|，|$)/u.exec(normalized);
  if (!rankMatch) {
    return bodyColumns(normalized);
  }

  const beforeRank = normalized
    .slice(0, rankMatch.index)
    .replace(/[，,。.\s]+$/u, '')
    .trim();
  const previousRank = rankMatch[1]?.trim() ?? '';
  const nextRank = rankMatch[2]?.trim() ?? '';
  const columns: EdictColumn[] = [];
  if (beforeRank) {
    columns.push(...bodyColumns(beforeRank));
  }
  if (previousRank || nextRank) {
    columns.push({ text: previousRank ? `由${previousRank}晋为` : '晋为', kind: 'body' });
  }
  if (nextRank) {
    columns.push({ text: nextRank, kind: 'rank' });
  }
  return columns;
};

const CHINESE_NUMERALS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const CHINESE_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const XUN_LABELS = ['上旬', '中旬', '下旬'];

const formatChineseNumber = (value: number): string => {
  if (value === 1) {
    return '元';
  }
  if (value >= 0 && value <= 10) {
    return CHINESE_NUMERALS[value] ?? `${value}`;
  }
  if (value < 20) {
    return `十${CHINESE_NUMERALS[value - 10] ?? ''}`;
  }
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${CHINESE_NUMERALS[tens] ?? tens}十${ones > 0 ? CHINESE_NUMERALS[ones] : ''}`;
};

const formatEdictDate = (report: SettlementReport): string => {
  const year = `${formatChineseNumber(report.year)}年`;
  const month = `${CHINESE_MONTHS[report.month - 1] ?? report.month}月`;
  const xun = XUN_LABELS[report.xun - 1] ?? `第${report.xun}旬`;
  return `宫历${year}${month}${xun}`;
};

const buildEdictColumns = (report: SettlementReport): EdictColumn[] => [
  { text: formatEdictDate(report), kind: 'date' },
  ...bodyColumns('奉天承运，皇帝诏曰。'),
  ...report.lines.flatMap(buildPromotionLineColumns),
  { text: '钦此。', kind: 'seal' },
];

interface PromotionEdictStageProps {
  report: SettlementReport;
  onComplete: () => void;
}

export function PromotionEdictStage({ report, onComplete }: PromotionEdictStageProps) {
  const [phase, setPhase] = useState<'summon' | 'edict'>('summon');
  const [isReadyToClose, setIsReadyToClose] = useState(false);
  const edictColumns = useMemo(() => buildEdictColumns(report), [report]);
  const summonEntry = useMemo(() => renderNarrativeEntry('rank.promotion.summon'), []);
  const rootClassName = ['promotion-edict-stage', isReadyToClose ? 'promotion-edict-stage--ready' : ''].filter(Boolean).join(' ');

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.animationName && event.animationName !== 'promotion-edict-unfold') {
      return;
    }
    setIsReadyToClose(true);
  };

  const handleClose = () => {
    if (!isReadyToClose) {
      return;
    }
    onComplete();
  };

  if (phase === 'summon') {
    return (
      <GlobalDialogueStage
        sceneLabel="晋升太监送旨场景"
        portraitLabel="传旨太监立绘"
        portrait={<img src={EUNUCH_PORTRAIT_SRC} alt="传旨太监" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--eunuch" />}
        ariaLabel="晋升太监通报"
        className="global-dialogue-stage--chamber global-dialogue-stage--nightly-service"
        dialogueClassName="palace-dialogue-box--chamber"
        characterIdentity={summonEntry.speakerIdentity}
        characterName={summonEntry.speakerName}
        content={summonEntry.text}
        splitQuotedDialogue={false}
        onNextAction={() => setPhase('edict')}
        numericFeedbackBucket="settlement"
      />
    );
  }

  return (
    <section className={rootClassName} aria-label="晋升太监通报" role="dialog" aria-modal="true" onClick={handleClose}>
      <div className="promotion-edict-stage__shade" />
      <div
        className="promotion-edict-stage__reveal"
        aria-label="晋封圣旨"
        onAnimationEnd={handleAnimationEnd}
      >
        <div className="promotion-edict-stage__paper" style={{ backgroundImage: `url(${OPEN_SCROLL_SRC})` }}>
          <div className="promotion-edict-stage__title-mark" aria-label="圣旨题签">
            <img className="promotion-edict-stage__title-glyph promotion-edict-stage__title-glyph--sheng" src={SHENG_GLYPH_SRC} alt="" aria-hidden="true" />
            <img className="promotion-edict-stage__title-glyph promotion-edict-stage__title-glyph--zhi" src={ZHI_GLYPH_SRC} alt="" aria-hidden="true" />
          </div>
          <div className="promotion-edict-stage__content">
            {edictColumns.map((column, index) => (
              <p className={`promotion-edict-stage__column promotion-edict-stage__column--${column.kind}`} key={`${index}-${column.text}`}>
                {column.text}
              </p>
            ))}
          </div>
        </div>
        <img className="promotion-edict-stage__scroll-handle promotion-edict-stage__scroll-handle--left" src={LEFT_SCROLL_SRC} alt="" aria-hidden="true" />
        <img className="promotion-edict-stage__scroll-handle promotion-edict-stage__scroll-handle--right" src={RIGHT_SCROLL_SRC} alt="" aria-hidden="true" />
      </div>
    </section>
  );
}
