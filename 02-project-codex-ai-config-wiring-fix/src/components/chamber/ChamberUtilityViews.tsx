import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { AFFAIRS_UI_BACKGROUND, BOND_UI_BACKGROUND, CHRONICLE_UI_BACKGROUND, INVENTORY_UI_BACKGROUND, MISC_INFO_UI_BACKGROUND } from '../../config/locationSceneBackgrounds';
import { getMonthlyExpenseStrategyConfig } from '../../config/monthlyExpenseStrategy';
import { resolveUnlockedBondCharacters } from '../../game/data/bondPresets';
import { getInventoryRecyclePrice } from '../../game/data/inventoryPresets';
import { FAMILY_AID_BONUS, FAMILY_AID_COST, FAMILY_AID_QUARTERLY_PRESTIGE } from '../../game/lib/familyGovernanceRuntime';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { BondProfileState, ConcubineProfile, GameNumericsState, HiddenStatsState, RouteId, SettlementReport, YangxinHearingStance } from '../../game/types';

type ChronicleTabId = 'edict' | 'secret' | 'quarrel' | 'event' | 'rumor';
type MiscInfoCardId = 'emperor' | 'officials' | 'dowager' | 'father' | 'court';
type InventoryTabId = 'tonic' | 'gift' | 'pill' | 'key-item';
type AffairStepId = 'target' | 'method' | 'ally' | 'item' | 'finish';
type AffairSourceLabel = '宫斗事务' | '家族事务' | '朝堂事务';

const yangxinStanceLabels: Record<YangxinHearingStance, string> = {
  argue: '据理力争',
  plead: '委婉求情',
  confess: '沉默认错',
};

const utilityPanelFrameStyle = (backgroundImage: string): CSSProperties => ({
  backgroundImage: `linear-gradient(180deg, rgba(255, 248, 244, 0.9), rgba(248, 235, 229, 0.88)), url("${backgroundImage}")`,
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
});

const chronicleTabs: Array<{ id: ChronicleTabId; label: string }> = [
  { id: 'edict', label: '圣旨' },
  { id: 'secret', label: '密事' },
  { id: 'quarrel', label: '口角' },
  { id: 'event', label: '事件' },
  { id: 'rumor', label: '流言' },
];

const inventoryTabs: Array<{ id: InventoryTabId; label: string }> = [
  { id: 'tonic', label: '补品' },
  { id: 'gift', label: '赠礼' },
  { id: 'pill', label: '丹药' },
  { id: 'key-item', label: '关键物件' },
];

const isKeyInventoryItem = (item: { category: string; price: number; canSell?: boolean; canRecycle?: boolean }): boolean =>
  item.category === 'rare' && item.price === 0 && item.canSell === false && item.canRecycle === false;

const affairSteps: Array<{ id: AffairStepId; label: string }> = [
  { id: 'target', label: '宫斗对象' },
  { id: 'method', label: '方式' },
  { id: 'ally', label: '合谋' },
  { id: 'item', label: '道具' },
  { id: 'finish', label: '完成' },
];

const miscCardOrder: Array<{ id: MiscInfoCardId; label: string }> = [
  { id: 'emperor', label: '皇帝' },
  { id: 'officials', label: '其余官员' },
  { id: 'dowager', label: '太后' },
  { id: 'father', label: '父亲' },
  { id: 'court', label: '朝堂' },
];

const routeFatherNameMap: Record<RouteId, string> = {
  lanyinxuguo: '谢承岳',
  fushengrumeng: '魏延',
  yingluoyeting: '沈衡',
  chenyuansucuo: '乌雅图门',
};

const resolveEmperorMoodLabel = (favor: number): string => {
  if (favor >= 71) return '喜悦';
  if (favor >= 51) return '愉悦';
  if (favor >= 21) return '平常';
  if (favor >= 1) return '低落';
  if (favor >= -49) return '悲伤';
  return '悲痛';
};

const resolveCourtLoyaltyToEmperor = (hiddenStats: HiddenStatsState): number =>
  Math.max(0, Math.min(100, Math.round(55 + hiddenStats.prestige / 120)));

const resolveCourtLoyaltyToPlayer = (hiddenStats: HiddenStatsState): number =>
  Math.max(0, Math.min(100, Math.round(20 + hiddenStats.prestige / 150 + hiddenStats.favor / 2)));

const resolveBondIdentity = (profile: BondProfileState): string => {
  if (profile.npcName === '容安') {
    return '皇帝';
  }
  if (profile.npcName === '阿翎') {
    return '故国旧识';
  }
  return '要角';
};

interface BondCandidate {
  id: string;
  name: string;
  identity: string;
  gender: 'female' | 'male';
  favor: number;
  affection: number;
  summary: string;
}

interface BondPronouns {
  subject: '她' | '他';
  object: '她' | '他';
}

const resolveBondPronouns = (candidate: BondCandidate): BondPronouns =>
  candidate.gender === 'male'
    ? { subject: '他', object: '他' }
    : { subject: '她', object: '她' };

const resolveBondFavorImpression = (candidate: BondCandidate): string => {
  const pronouns = resolveBondPronouns(candidate);
  const favor = candidate.favor;
  if (favor >= 40) {
    return `${pronouns.subject}对你已有明显亲近，很多防备并非全无，却常会在你一句软话或一次示弱里先退半步`;
  }
  if (favor >= 10) {
    return `${pronouns.subject}对你谈不上彻底信任，却已愿意把你看作值得继续观察的人，不再像最初那样凡事都先往坏处想`;
  }
  if (favor >= -19) {
    return `${pronouns.subject}对你仍持谨慎观望的态度，既不会贸然亲近，也不会无端翻脸，更多时候是在等你先露出真正心思`;
  }
  return `${pronouns.subject}心里对你存着一层提防，凡是与你相关的示好、沉默和靠近，都会先被${pronouns.object}拆开来反复揣摩其中有没有后手`;
};

const resolveBondAffectionImpression = (candidate: BondCandidate): string => {
  const pronouns = resolveBondPronouns(candidate);
  const affection = candidate.affection;
  if (affection >= 30) {
    return `偏偏那点情绪并不全是算计，${pronouns.subject}偶尔也会因为你的处境、神色或一句轻声回应而生出偏袒，夜深时甚至会回想你留给${pronouns.object}的细节`;
  }
  if (affection >= 10) {
    return `只是这份留意里也掺着几分柔软，${pronouns.subject}会记得你说话时的停顿与克制，偶尔也愿意替你多想一步，看看你是否值得更深的靠近`;
  }
  return `${pronouns.subject}暂时还不会把这种判断变成偏爱，所以话能留三分，心也会收三分，宁可慢慢试，也不愿先把自己摆进失衡的位置`;
};

interface BondThoughtContext {
  xunKey: string;
  recentContext: string[];
  lastOptionText?: string;
  lastReason?: string;
  favorDeltaThisXun: number;
  affectionDeltaThisXun: number;
  isPrimary: boolean;
}

const sanitizeBondContext = (text?: string): string => {
  if (!text) {
    return '';
  }

  return text.replace(/[。！？!?]+$/u, '').replace(/\s+/gu, '').slice(0, 28);
};

const resolveBondProgressImpression = (candidate: BondCandidate, context: BondThoughtContext): string => {
  const pronouns = resolveBondPronouns(candidate);
  if (context.isPrimary) {
    const recentContext = sanitizeBondContext(context.recentContext[context.recentContext.length - 1]);
    const totalDelta = context.favorDeltaThisXun + context.affectionDeltaThisXun;

    if (context.lastOptionText) {
      const reasoning = sanitizeBondContext(context.lastReason);
      const deltaTail =
        totalDelta > 0
          ? `那次推进之后，${pronouns.subject}比前一旬更难把你当作无关紧要的人。`
          : totalDelta < 0
            ? `那次推进之后，${pronouns.subject}反而把戒心收得更紧，不肯轻易露出口风。`
            : `那次推进没有立刻改掉${pronouns.object}的判断，却让${pronouns.subject}记你记得更深。`;

      return `这一旬里，你曾以“${context.lastOptionText}”试着靠近，${pronouns.subject}嘴上未必应得分明，心里却早把那一步的来意、胆量与退路都重新掂量了一遍。${reasoning ? `${reasoning}。` : ''}${deltaTail}`;
    }

    if (recentContext) {
      return `这一旬推进到此，${pronouns.subject}最放不下的仍是“${recentContext}”带来的余波，因此每次见你，都会先想你下一步究竟是示好、试探，还是另有更深的铺垫。`;
    }

    return `这一旬里，你的一举一动${pronouns.subject}都暗暗记着，越是看不透你的真正打算，${pronouns.subject}越不肯过早交出自己的态度，只想先把局面再看清半分。`;
  }

  const cadencePool = [
    `这一旬里，宫中的风向尚未真正落定，${pronouns.subject}因此更习惯把你的每一步先记下，再留到夜深时独自回想其中轻重。`,
    `这一旬行到此处，${pronouns.subject}已从零碎传闻里重新拼过你的近况，所以越看你平静，越觉得你把真正打算藏得很深。`,
    `这一旬你在众人面前的分寸拿捏得过于稳妥，反倒让${pronouns.object}生出更多心思，总想知道你究竟是真想靠近，还是只是暂时按兵不动。`,
  ];
  const seed = `${context.xunKey}-${candidate.id}`
    .split('')
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return cadencePool[seed % cadencePool.length];
};

const buildBondInnerThought = (candidate: BondCandidate, context: BondThoughtContext): string => {
  const text =
    `${candidate.name}表面上仍守着${candidate.identity}该有的分寸，心里却早把你近来的言行翻来覆去地衡量过许多遍。` +
    `${resolveBondFavorImpression(candidate)}。` +
    `${resolveBondProgressImpression(candidate, context)}` +
    `${resolveBondAffectionImpression(candidate)}。`;

  return text.length > 300 ? `${text.slice(0, 298)}。` : text;
};

interface UtilityPanelShellProps {
  ariaLabel: string;
  backgroundImage: string;
  onClose: () => void;
  children: ReactNode;
}

function UtilityPanelShell({ ariaLabel, backgroundImage, onClose, children }: UtilityPanelShellProps) {
  return (
    <section className="chamber-utility-view" style={utilityPanelFrameStyle(backgroundImage)} aria-label={ariaLabel}>
      <div className="chamber-utility-view__veil" aria-hidden="true" />
      <div className="chamber-utility-view__content-surface" aria-hidden="true" />
      {children}
      <button type="button" className="chamber-utility-view__return" onClick={onClose}>
        返回
      </button>
    </section>
  );
}

interface ChroniclePanelViewProps {
  time: { year: number; month: number; xun: number };
  state: GameNumericsState;
  hiddenStats: HiddenStatsState;
  settlementReports: SettlementReport[];
  onClose: () => void;
}

export function ChroniclePanelView({ time, state, hiddenStats, settlementReports, onClose }: ChroniclePanelViewProps) {
  const palaceStrifeCases = useGameFlowStore((store) => store.palaceStrifeCases);
  const bribePalaceStrifeCase = useGameFlowStore((store) => store.bribePalaceStrifeCase);
  const [activeTab, setActiveTab] = useState<ChronicleTabId>('edict');
  const [interventionText, setInterventionText] = useState('');
  const monthReports = useMemo(
    () => settlementReports.filter((report) => report.kind === 'month').slice().reverse(),
    [settlementReports],
  );
  const xunReports = useMemo(
    () => settlementReports.filter((report) => report.kind === 'xun').slice().reverse(),
    [settlementReports],
  );
  const monthlyExpenseStrategy = getMonthlyExpenseStrategyConfig(state.monthlyExpenseStrategy);
  const nextMonthlyExpenseStrategy = state.nextMonthlyExpenseStrategy
    ? getMonthlyExpenseStrategyConfig(state.nextMonthlyExpenseStrategy)
    : undefined;

  const entries = useMemo<Record<ChronicleTabId, Array<{ title: string; detail: string; detailLines?: string[] }>>>(
    () => ({
      edict:
        monthReports.length > 0
          ? monthReports.map((report) => ({
              title: report.title,
              detail: report.summary,
              detailLines: report.lines,
            }))
          : [
              {
                title: `${time.year}年${time.month}月第${time.xun}旬宫中暂未颁新旨`,
                detail: '眼下仍以旧例行事，若后续有封赏、迁宫或禁足，会在此页首先记录。',
              },
              {
                title: `${state.residenceName}日常用度照旧`,
                detail: `当前银两 ${hiddenStats.silver}，体力 ${state.stamina}。寝殿未见额外裁减。`,
              },
            ],
      secret: [
        {
          title: '娇娇已记下娘娘近旬动向',
          detail: `本月用度为“${monthlyExpenseStrategy.label}”，${
            nextMonthlyExpenseStrategy
              ? `下月将改为“${nextMonthlyExpenseStrategy.label}”。`
              : '下月暂照本月旧例。'
          }后续若触发暗线、密约与私会，会在此留档。`,
        },
        {
          title: '暂无未公开的宫中秘信',
          detail: '该页后续会汇入密事、密诏、暗访与私人书信。',
        },
      ],
      quarrel: [
        {
          title: '宫中暂无公开口角记录',
          detail: '与嫔妃口角、宫女争执、御前失仪等事件触发后，会依时间顺序记在这里。',
        },
      ],
      event:
        xunReports.length > 0
          ? xunReports.map((report) => ({
              title: report.title,
              detail: report.summary,
              detailLines: report.lines,
            }))
          : [
              {
                title: '当前流程运转正常',
                detail: '主场景、后宫、个人属性与外出场景均可继续运行，不会因打开纪事页中断。',
              },
              {
                title: '本旬重点仍是安排行程',
                detail: '学习、休养、外出、查看人物关系等入口已经接通。',
              },
            ],
      rumor: [
        {
          title: hiddenStats.favor >= 40 ? '宫中已有人议论娘娘近来颇得关注' : '宫中对娘娘的议论暂时不多',
          detail: `当前宠爱 ${hiddenStats.favor}，若后续宫斗、偶遇与侍寝事件推进，流言会逐渐累积。`,
        },
      ],
    }),
    [hiddenStats.favor, hiddenStats.silver, monthReports, state.openingTendency, state.residenceName, state.stamina, time.month, time.xun, time.year, xunReports],
  );
  const investigatingCases = useMemo(
    () => palaceStrifeCases.filter((caseState) => caseState.status === 'investigating'),
    [palaceStrifeCases],
  );
  const formatCaseParties = (caseState: (typeof investigatingCases)[number]): string =>
    caseState.actorId === 'npc' && caseState.actorName
      ? `${caseState.actorName} -> ${caseState.targetName}`
      : `娘娘 -> ${caseState.targetName}`;

  const handleBribeCase = (caseId: string) => {
    const result = bribePalaceStrifeCase(caseId, 20);
    setInterventionText(result.message);
  };

  return (
    <UtilityPanelShell ariaLabel="纪事面板" backgroundImage={CHRONICLE_UI_BACKGROUND} onClose={onClose}>
      <div className="chamber-utility-view__toolbar chamber-utility-view__toolbar--chronicle">
        {chronicleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`chamber-utility-view__top-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="chamber-utility-view__body chamber-utility-view__body--chronicle">
        {activeTab === 'event' && investigatingCases.length > 0 ? (
          <article className="chamber-utility-view__entry-card">
            <h3>调查期打点</h3>
            <p>{interventionText || '娇娇可替娘娘暗中打点。每花20两，可压下5点定案率。'}</p>
            <div className="chamber-utility-view__option-grid">
              {investigatingCases.map((caseState) => (
                <button key={caseState.id} type="button" onClick={() => handleBribeCase(caseState.id)}>
                  <strong>{formatCaseParties(caseState)}</strong>
                  <span>{`${caseState.methodLabel}：${caseState.itemLabel}；已查${caseState.investigationXunsElapsed}旬，定案率${caseState.convictionRate}%；花20两打点`}</span>
                </button>
              ))}
            </div>
          </article>
        ) : null}
        {entries[activeTab].map((entry) => (
          <article key={entry.title} className="chamber-utility-view__entry-card">
            <h3>{entry.title}</h3>
            {entry.detailLines && entry.detailLines.length > 0 ? (
              <ul className="chamber-utility-view__entry-lines" aria-label={activeTab === 'edict' ? '月报明细' : '旬报明细'}>
                {entry.detailLines.map((line, index) => (
                  <li key={`${entry.title}-${index}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p>{entry.detail}</p>
            )}
          </article>
        ))}
      </div>
    </UtilityPanelShell>
  );
}

interface YangxinHearingPanelViewProps {
  onClose: () => void;
}

export function YangxinHearingPanelView({ onClose }: YangxinHearingPanelViewProps) {
  const palaceStrifeCases = useGameFlowStore((store) => store.palaceStrifeCases);
  const resolveYangxinPalaceStrifeCase = useGameFlowStore((store) => store.resolveYangxinPalaceStrifeCase);
  const [hearingText, setHearingText] = useState('');
  const hearingCases = useMemo(
    () =>
      palaceStrifeCases.filter(
        (caseState) =>
          caseState.status === 'investigating' &&
          caseState.yangxinHearingRequired &&
          !caseState.yangxinHearingResolved,
      ),
    [palaceStrifeCases],
  );

  const handleHearing = (caseId: string, stance: YangxinHearingStance) => {
    const result = resolveYangxinPalaceStrifeCase(caseId, stance);
    setHearingText(result.message);
  };

  return (
    <UtilityPanelShell ariaLabel="养心殿裁断面板" backgroundImage={MISC_INFO_UI_BACKGROUND} onClose={onClose}>
      <div className="chamber-utility-view__body chamber-utility-view__body--chronicle">
        <article className="chamber-utility-view__entry-card">
          <h3>养心殿裁断</h3>
          <p>{hearingText || '容安只过问牵连到娘娘本人的案件。此处只修正定案率，不重算行动与隐匿。'}</p>
        </article>

        {hearingCases.length > 0 ? (
          hearingCases.map((caseState) => (
            <article key={caseState.id} className="chamber-utility-view__entry-card">
              <h3>{caseState.targetName}</h3>
              <p>{`${caseState.methodLabel}：${caseState.summary} 当前定案率${caseState.convictionRate}%。`}</p>
              <div className="chamber-utility-view__option-grid">
                {(Object.keys(yangxinStanceLabels) as YangxinHearingStance[]).map((stance) => (
                  <button key={stance} type="button" onClick={() => handleHearing(caseState.id, stance)}>
                    <strong>{yangxinStanceLabels[stance]}</strong>
                    <span>点击后进行一次养心殿裁断</span>
                  </button>
                ))}
              </div>
            </article>
          ))
        ) : (
          <article className="chamber-utility-view__entry-card">
            <h3>暂无需裁断案件</h3>
            <p>当前没有牵连娘娘且尚未处理的调查案。若玩家被查、被诬陷或成为被害目标，才会进入这里。</p>
          </article>
        )}
      </div>
    </UtilityPanelShell>
  );
}

interface MiscInfoPanelViewProps {
  state: GameNumericsState;
  hiddenStats: HiddenStatsState;
  bondProfile: BondProfileState;
  onClose: () => void;
}

export function MiscInfoPanelView({ state, hiddenStats, bondProfile, onClose }: MiscInfoPanelViewProps) {
  const [activeCard, setActiveCard] = useState<MiscInfoCardId>('emperor');

  const infoCards = useMemo<Record<MiscInfoCardId, { title: string; lines: string[] }>>(
    () => ({
      emperor: {
        title: `皇帝 ${bondProfile.npcName === '容安' ? bondProfile.npcName : '容安'}`,
        lines: [`年龄：二十四`, `心情：${resolveEmperorMoodLabel(hiddenStats.favor)}`, `对娘娘当前宠爱：${hiddenStats.favor}`],
      },
      officials: {
        title: '其余官员',
        lines: ['首辅：卢安平', '内廷总管：简宁', `近旬对娘娘观感：${hiddenStats.prestige >= 1200 ? '谨慎观望' : '尚未站队'}`],
      },
      dowager: {
        title: '太后',
        lines: ['年龄：四十三', `态度：${hiddenStats.prestige >= 1800 ? '尚算满意' : '暂未表态'}`, '是否额外关注：否'],
      },
      father: {
        title: `父亲 ${routeFatherNameMap[state.routeId]}`,
        lines: [`家世：${state.family}`, `对娘娘期许：${state.openingTendency ?? '安稳度日'}`, '家族当前暂无紧急来信'],
      },
      court: {
        title: '朝堂',
        lines: [
          `朝堂对皇帝忠心度：${resolveCourtLoyaltyToEmperor(hiddenStats)}`,
          `朝堂对玩家支持度：${resolveCourtLoyaltyToPlayer(hiddenStats)}`,
          '后续会在此汇入权臣、党争与父族势力变化。',
        ],
      },
    }),
    [bondProfile.npcName, hiddenStats, state.family, state.openingTendency, state.routeId],
  );

  return (
    <UtilityPanelShell ariaLabel="其他信息面板" backgroundImage={MISC_INFO_UI_BACKGROUND} onClose={onClose}>
      <div className="chamber-utility-view__body chamber-utility-view__body--misc">
        <div className="chamber-utility-view__misc-grid">
          {miscCardOrder.map((card) => (
            <button
              key={card.id}
              type="button"
              className={`chamber-utility-view__misc-card ${activeCard === card.id ? 'is-active' : ''}`}
              onClick={() => setActiveCard(card.id)}
            >
              <strong>{infoCards[card.id].title}</strong>
              <span>{infoCards[card.id].lines[0]}</span>
              <span>{infoCards[card.id].lines[1]}</span>
            </button>
          ))}
        </div>

        <section className="chamber-utility-view__detail-card">
          <h3>{infoCards[activeCard].title}</h3>
          {infoCards[activeCard].lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </section>
      </div>
    </UtilityPanelShell>
  );
}

interface BondPanelViewProps {
  bondProfile: BondProfileState;
  concubines: ConcubineProfile[];
  routeId: RouteId;
  flags: GameNumericsState['flags'];
  bondFavorDeltaThisXun: number;
  bondAffectionDeltaThisXun: number;
  onClose: () => void;
}

export function BondPanelView({
  bondProfile,
  concubines,
  routeId,
  flags,
  bondFavorDeltaThisXun,
  bondAffectionDeltaThisXun,
  onClose,
}: BondPanelViewProps) {
  const [selectedId, setSelectedId] = useState<string>(bondProfile.npcId);

  const visibleConcubineCandidates = useMemo(
    () =>
      concubines
        .filter((concubine) => concubine.status === 'live' && concubine.stats.affection >= 60)
        .slice(0, 5)
        .map((concubine) => ({
          id: concubine.id,
          name: concubine.name,
          identity: concubine.rankLabel,
          gender: 'female' as const,
          favor: concubine.stats.relationToPlayer,
          affection: concubine.stats.affection,
          summary: `${concubine.personality}。${concubine.summary}`,
        })),
    [concubines],
  );

  const unlockedSpecialCandidates = useMemo(
    () =>
      resolveUnlockedBondCharacters(routeId, flags).map((character) => ({
        id: character.id,
        name: character.name,
        identity: character.identity,
        gender: character.name === '布自游' ? ('male' as const) : ('female' as const),
        favor: 0,
        affection: 0,
        summary: character.summary,
      })),
    [flags, routeId],
  );

  const candidates = useMemo<BondCandidate[]>(
    () => [
      {
        id: bondProfile.npcId,
        name: bondProfile.npcName,
        identity: resolveBondIdentity(bondProfile),
        gender: bondProfile.npcName === '容安' ? ('male' as const) : ('female' as const),
        favor: bondProfile.favor,
        affection: bondProfile.affection,
        summary: bondProfile.summary,
      },
      ...visibleConcubineCandidates,
      ...unlockedSpecialCandidates,
    ],
    [bondProfile, unlockedSpecialCandidates, visibleConcubineCandidates],
  );

  useEffect(() => {
    if (!candidates.some((candidate) => candidate.id === selectedId)) {
      setSelectedId(candidates[0]?.id ?? bondProfile.npcId);
    }
  }, [bondProfile.npcId, candidates, selectedId]);

  const selectedTarget = candidates.find((candidate) => candidate.id === selectedId) ?? candidates[0];
  const selectedInnerThought = useMemo(
    () =>
      buildBondInnerThought(selectedTarget, {
        xunKey: bondProfile.xunKey,
        recentContext: bondProfile.recentContext,
        lastOptionText: selectedTarget.id === bondProfile.npcId ? bondProfile.lastOptionText : undefined,
        lastReason: selectedTarget.id === bondProfile.npcId ? bondProfile.lastReason : undefined,
        favorDeltaThisXun: selectedTarget.id === bondProfile.npcId ? bondFavorDeltaThisXun : 0,
        affectionDeltaThisXun: selectedTarget.id === bondProfile.npcId ? bondAffectionDeltaThisXun : 0,
        isPrimary: selectedTarget.id === bondProfile.npcId,
      }),
    [bondAffectionDeltaThisXun, bondFavorDeltaThisXun, bondProfile.lastOptionText, bondProfile.lastReason, bondProfile.recentContext, bondProfile.xunKey, bondProfile.npcId, selectedTarget],
  );

  return (
    <UtilityPanelShell ariaLabel="情缘面板" backgroundImage={BOND_UI_BACKGROUND} onClose={onClose}>
      <div className="chamber-utility-view__toolbar chamber-utility-view__toolbar--bond">
        <span className="chamber-utility-view__header-pill is-active">姓名</span>
        <span className="chamber-utility-view__header-pill">身份</span>
        <span className="chamber-utility-view__header-pill">好感</span>
      </div>

      <div className="chamber-utility-view__body chamber-utility-view__body--bond">
        <div className="chamber-utility-view__bond-list" role="list" aria-label="情缘角色列表">
          {candidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role="listitem"
              className={`chamber-utility-view__bond-row ${selectedId === candidate.id ? 'is-active' : ''}`}
              onClick={() => setSelectedId(candidate.id)}
            >
              <strong>{candidate.name}</strong>
              <span>{candidate.identity}</span>
              <span>{candidate.favor >= 0 ? `+${candidate.favor}` : candidate.favor}</span>
            </button>
          ))}
        </div>

        <section className="chamber-utility-view__detail-card chamber-utility-view__detail-card--bond">
          <p>{selectedInnerThought}</p>
        </section>
      </div>
    </UtilityPanelShell>
  );
}

interface AffairsPanelViewProps {
  entrySource: AffairSourceLabel;
  concubines: ConcubineProfile[];
  onClose: () => void;
}

function FamilyAffairsPanelView({ onClose }: { onClose: () => void }) {
  const state = useGameFlowStore((store) => store.state);
  const spendFamilyAid = useGameFlowStore((store) => store.spendFamilyAid);
  const [resultText, setResultText] = useState('本季度可通过家族接济维护父族局面。');
  const alreadyAided = (state.familyAidBonus ?? 0) > 0;
  const insufficientSilver = state.silver < FAMILY_AID_COST;

  const handleAid = () => {
    const result = spendFamilyAid();
    setResultText(result.success ? '家书已递出，本季度家族接济已经登记。' : result.message);
  };

  return (
    <UtilityPanelShell ariaLabel="家族事务面板" backgroundImage={AFFAIRS_UI_BACKGROUND} onClose={onClose}>
      <div className="chamber-utility-view__body chamber-utility-view__body--affairs">
        <section className="chamber-utility-view__detail-card chamber-utility-view__detail-card--affairs">
          <h3>家族事务</h3>
          <p>{resultText}</p>
          <div className="chamber-utility-view__option-grid">
            <button
              type="button"
              aria-label="送出接济"
              className={alreadyAided ? 'is-active' : ''}
              onClick={handleAid}
              disabled={alreadyAided || insufficientSilver}
            >
              <strong>送出接济</strong>
              <span>{`${FAMILY_AID_COST} 银两`}</span>
              <span>{`家族接济加值 +${FAMILY_AID_BONUS}，季度额外声望 +${FAMILY_AID_QUARTERLY_PRESTIGE}`}</span>
            </button>
          </div>
          <div className="chamber-utility-view__empty-state">
            {alreadyAided
              ? '本季度已接济，等待季度结算。'
              : insufficientSilver
                ? '当前银两不足，无法送出接济。'
                : `当前银两：${state.silver}`}
          </div>
        </section>
      </div>
    </UtilityPanelShell>
  );
}

export function AffairsPanelView({ entrySource, concubines, onClose }: AffairsPanelViewProps) {
  if (entrySource === '家族事务') {
    return <FamilyAffairsPanelView onClose={onClose} />;
  }

  const startPalaceStrifeCase = useGameFlowStore((store) => store.startPalaceStrifeCase);
  const [activeStep, setActiveStep] = useState<AffairStepId>('target');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState('散布流言');
  const [selectedAlly, setSelectedAlly] = useState('无');
  const [selectedFrameTarget, setSelectedFrameTarget] = useState('无');
  const [selectedItem, setSelectedItem] = useState('不使用');
  const [resultText, setResultText] = useState('先依次选择对象、方式、合谋与道具，最后再点击“完成”。');

  useEffect(() => {
    setActiveStep(entrySource === '家族事务' ? 'ally' : entrySource === '朝堂事务' ? 'method' : 'target');
  }, [entrySource]);

  const palaceAffairConcubines = useMemo(
    () => concubines.filter((concubine) => concubine.status === 'live' && !concubine.residence.includes('冷宫')),
    [concubines],
  );

  const targets = useMemo(
    () => (entrySource === '宫斗事务' ? palaceAffairConcubines : concubines).slice(0, 6),
    [concubines, entrySource, palaceAffairConcubines],
  );

  const methods = useMemo(
    () =>
      entrySource === '朝堂事务'
        ? ['递话试探', '借题进言', '旁敲侧击']
        : entrySource === '宫斗事务'
          ? ['散布流言', '下毒']
          : ['散布流言', '暗中调查', '借机施压'],
    [entrySource],
  );

  const allies = useMemo(() => {
    if (entrySource === '家族事务') {
      return ['父族旧部', '外家女眷', '门生故吏'];
    }
    if (entrySource === '朝堂事务') {
      return ['御前近臣', '礼部旧识', '兵部耳目'];
    }
    const eligibleAllies = palaceAffairConcubines
      .filter((concubine) => concubine.id !== selectedTarget && concubine.stats.relationToPlayer >= 60)
      .slice(0, 6)
      .map((concubine) => `${concubine.rankLabel} ${concubine.name}`);
    return ['无', ...eligibleAllies];
  }, [entrySource, palaceAffairConcubines, selectedTarget]);

  const poisonItems = useMemo(() => ['鹤顶红', '麝香', '陨颜丹'], []);
  const rumorItems = useMemo(() => ['欺凌宫人', '奢侈浪费', '与人偷情', '意图谋逆', '不敬先祖'], []);
  const frameTargets = useMemo(() => {
    if (entrySource !== '宫斗事务') {
      return ['无'];
    }
    return [
      '无',
      ...palaceAffairConcubines
        .filter((concubine) => concubine.id !== selectedTarget)
        .slice(0, 6)
        .map((concubine) => `${concubine.rankLabel} ${concubine.name}`),
    ];
  }, [entrySource, palaceAffairConcubines, selectedTarget]);

  const items = useMemo(() => {
    if (entrySource !== '宫斗事务') {
      return ['不使用', '家书', '礼盒', '名帖'];
    }
    if (selectedMethod === '下毒') {
      return poisonItems;
    }
    return rumorItems;
  }, [entrySource, poisonItems, rumorItems, selectedMethod]);

  useEffect(() => {
    if (!targets.some((target) => target.id === selectedTarget)) {
      setSelectedTarget(targets[0]?.id ?? '');
    }
  }, [selectedTarget, targets]);

  useEffect(() => {
    if (!methods.includes(selectedMethod)) {
      setSelectedMethod(methods[0] ?? '');
    }
  }, [methods, selectedMethod]);

  useEffect(() => {
    if (!allies.includes(selectedAlly)) {
      setSelectedAlly(allies[0] ?? '无');
    }
  }, [allies, selectedAlly]);

  useEffect(() => {
    if (!frameTargets.includes(selectedFrameTarget)) {
      setSelectedFrameTarget('无');
    }
  }, [frameTargets, selectedFrameTarget]);

  useEffect(() => {
    if (!items.includes(selectedItem)) {
      setSelectedItem(items[0] ?? '不使用');
    }
  }, [items, selectedItem]);

  const selectedTargetProfile = targets.find((item) => item.id === selectedTarget) ?? targets[0];

  const handleFinish = () => {
    if (entrySource === '宫斗事务' && !selectedTargetProfile) {
      setResultText('当前没有可选的宫斗对象，无法发起事务。');
      setActiveStep('target');
      return;
    }

    if (entrySource === '宫斗事务' && selectedMethod === '下毒' && !poisonItems.includes(selectedItem)) {
      setResultText('若选下毒，必须从陨颜丹、麝香、鹤顶红中择其一，不可空手行事。');
      setActiveStep('item');
      return;
    }

    if (entrySource === '宫斗事务' && selectedTargetProfile) {
      const result = startPalaceStrifeCase({
        targetConsortId: selectedTargetProfile.id,
        actionKind: selectedMethod === '下毒' ? 'poison' : 'rumor',
        methodLabel: selectedMethod,
        itemLabel: selectedItem,
        allyLabel: selectedAlly,
        framedTargetName: selectedFrameTarget === '无' ? undefined : selectedFrameTarget,
      });
      const investigationText =
        result.caseState.status === 'investigating'
          ? ` 当前定案率 ${result.caseState.convictionRate}%，案件已进入追查。`
          : '';
      setResultText(
        `${selectedTargetProfile.rankLabel} ${selectedTargetProfile.name}：${result.resultText}${investigationText}`,
      );
      setActiveStep('finish');
      return;
    }

    setResultText(
      `已拟定${entrySource}方案：对象为${selectedTargetProfile ? `${selectedTargetProfile.rankLabel} ${selectedTargetProfile.name}` : '待定'}，方式为${selectedMethod || '待定'}，合谋方为${selectedAlly || '无'}，道具为${selectedItem || '无'}。当前仅保留计划，不直接改动数值。`,
    );
    setActiveStep('finish');
  };

  return (
    <UtilityPanelShell ariaLabel="宫斗事务面板" backgroundImage={AFFAIRS_UI_BACKGROUND} onClose={onClose}>
      <div className="chamber-utility-view__body chamber-utility-view__body--affairs">
        <aside className="chamber-utility-view__affairs-steps">
          {affairSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              className={`chamber-utility-view__affair-step ${activeStep === step.id ? 'is-active' : ''}`}
              onClick={() => (step.id === 'finish' ? handleFinish() : setActiveStep(step.id))}
            >
              {step.label}
            </button>
          ))}
        </aside>

        <section className="chamber-utility-view__detail-card chamber-utility-view__detail-card--affairs">
          <h3>{entrySource}</h3>
          <p>{resultText}</p>

          {activeStep === 'target' ? (
            <div className="chamber-utility-view__option-grid">
              {targets.length > 0 ? (
                targets.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    className={selectedTarget === target.id ? 'is-active' : ''}
                    onClick={() => setSelectedTarget(target.id)}
                  >
                    <strong>{`${target.rankLabel} ${target.name}`}</strong>
                    <span>{target.residence}</span>
                  </button>
                ))
              ) : (
                <div className="chamber-utility-view__empty-state">当前没有符合条件的对象可供选择。</div>
              )}
            </div>
          ) : null}

          {activeStep === 'method' ? (
            <div className="chamber-utility-view__option-grid">
              {methods.map((method) => (
                <button
                  key={method}
                  type="button"
                  className={selectedMethod === method ? 'is-active' : ''}
                  onClick={() => setSelectedMethod(method)}
                >
                  <strong>{method}</strong>
                  <span>点击后作为当前采用方式</span>
                </button>
              ))}
            </div>
          ) : null}

          {activeStep === 'ally' ? (
            <>
              <div className="chamber-utility-view__option-grid">
                {allies.map((ally) => (
                  <button
                    key={ally}
                    type="button"
                    className={selectedAlly === ally ? 'is-active' : ''}
                    onClick={() => setSelectedAlly(ally)}
                  >
                    <strong>{ally}</strong>
                    <span>点击后记为当前合谋方</span>
                  </button>
                ))}
              </div>
              {entrySource === '宫斗事务' ? (
                <>
                  <div className="chamber-utility-view__empty-state">嫁祸会降低行动和隐匿成功率，暴露后定案率增长更快。</div>
                  <div className="chamber-utility-view__option-grid">
                    {frameTargets.map((frameTarget) => (
                      <button
                        key={frameTarget}
                        type="button"
                        className={selectedFrameTarget === frameTarget ? 'is-active' : ''}
                        onClick={() => setSelectedFrameTarget(frameTarget)}
                      >
                        <strong>{frameTarget}</strong>
                        <span>点击后作为嫁祸对象</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {activeStep === 'item' ? (
            <div className="chamber-utility-view__option-grid">
              {entrySource === '宫斗事务' && selectedMethod === '下毒' ? (
                <div className="chamber-utility-view__empty-state">当前采用下毒，必须携带且仅可选择陨颜丹、麝香、鹤顶红之一。</div>
              ) : null}
              {items.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={selectedItem === item ? 'is-active' : ''}
                  onClick={() => setSelectedItem(item)}
                >
                  <strong>{item}</strong>
                  <span>{entrySource === '宫斗事务' && selectedMethod !== '下毒' ? '点击后作为本次流言内容' : entrySource === '宫斗事务' ? '点击后作为本次所用毒物' : '点击后作为本次携带道具'}</span>
                </button>
              ))}
            </div>
          ) : null}

          {activeStep === 'finish' ? (
            <div className="chamber-utility-view__empty-state">
              {entrySource === '宫斗事务' ? '本次宫斗事务已登记，待当旬夜晚结算。' : '方案已暂存。'}
            </div>
          ) : null}
        </section>
      </div>
    </UtilityPanelShell>
  );
}

interface InventoryPanelViewProps {
  onClose: () => void;
}

export function InventoryPanelView({ onClose }: InventoryPanelViewProps) {
  const [activeTab, setActiveTab] = useState<InventoryTabId>('tonic');
  const inventory = useGameFlowStore((store) => store.inventory);

  const entries = useMemo<Record<InventoryTabId, typeof inventory>>(
    () => ({
      tonic: inventory.filter((item) => item.category === 'food'),
      gift: inventory.filter((item) => item.category === 'gift' || item.category === 'music-score'),
      pill: inventory.filter((item) => item.category === 'medicine' || (item.category === 'rare' && !isKeyInventoryItem(item))),
      'key-item': inventory.filter(isKeyInventoryItem),
    }),
    [inventory],
  );

  const emptyStateCopy: Record<InventoryTabId, string> = {
    tonic: '眼下没有补品或膳食类物件。',
    gift: '眼下没有可送人的绣品、香囊或礼物。',
    pill: '眼下没有丹药、毒物或珍稀物件。',
    'key-item': '关键书信、证物与剧情道具后续会汇入这里。',
  };

  return (
    <UtilityPanelShell ariaLabel="道具管理面板" backgroundImage={INVENTORY_UI_BACKGROUND} onClose={onClose}>
      <div className="chamber-utility-view__toolbar chamber-utility-view__toolbar--inventory">
        <h2>道具管理</h2>
        <div className="chamber-utility-view__subtabs">
          {inventoryTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`chamber-utility-view__top-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chamber-utility-view__body chamber-utility-view__body--inventory">
        {entries[activeTab].length > 0 ? (
          entries[activeTab].map((entry) => (
            <article key={entry.itemId} className="chamber-utility-view__entry-card">
              <h3>{entry.name}</h3>
              <p>{entry.description}</p>
              <p>
                {entry.category === 'music-score'
                  ? `当前库存：${entry.quantity} | 曲谱颜色：${entry.color ?? entry.rarity} | 登记编号：${entry.id ?? entry.itemId}`
                  : `当前库存：${entry.quantity} | 单价：${entry.price}两 | 回收价：${getInventoryRecyclePrice(entry)}两`}
              </p>
            </article>
          ))
        ) : (
          <div className="chamber-utility-view__empty-state">{emptyStateCopy[activeTab]}</div>
        )}
      </div>
    </UtilityPanelShell>
  );
}
