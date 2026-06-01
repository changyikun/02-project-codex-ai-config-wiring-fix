import { useMemo, type CSSProperties } from 'react';
import {
  PLAYER_APPEARANCE_RANGE,
  PLAYER_AMBITION_RANGE,
  PLAYER_FAVOR_RANGE,
  PLAYER_FORTUNE_RANGE,
  PLAYER_HEALTH_RANGE,
  PLAYER_INTRIGUE_RANGE,
  PLAYER_STRESS_RANGE,
  PLAYER_TEMPERAMENT_RANGE,
  PRESTIGE_RANGE,
  RARITY_COLOR_LEGENDARY,
} from '../../config/constants';
import {
  convertAppearancePoints,
  convertFortunePoints,
  convertHealthPoints,
  convertIntriguePoints,
  convertSkillLevel,
  convertTemperamentPoints,
} from '../../config/formulas';
import { getRarityColor } from '../../game/lib/bedchamberRuntime';
import type { ConcubineProfile, GameNumericsState, HiddenStatsState, RouteSelectionProfile } from '../../game/types';

const formatMetricValue = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

const getMetricPercent = (value: number, range: readonly [number, number]): number => {
  const [min, max] = range;
  if (max <= min) {
    return 0;
  }
  return clampPercent(((value - min) / (max - min)) * 100);
};

interface MetricDescriptor {
  key: string;
  label: string;
  display: string;
  numericValue?: number;
  range?: readonly [number, number];
  accentColor?: string;
}

const STRESS_SAFE_COLOR = '#5B9158';
const STRESS_WARNING_COLOR = '#C9A447';

const getMetricAccentColor = (metricKey: string, numericValue?: number, range?: readonly [number, number]): string => {
  if (typeof numericValue !== 'number') {
    return '#8b6c7f';
  }

  if (metricKey === 'stress') {
    if (numericValue > 80) {
      return RARITY_COLOR_LEGENDARY;
    }
    if (numericValue > 60) {
      return STRESS_WARNING_COLOR;
    }
    return STRESS_SAFE_COLOR;
  }

  if (metricKey === 'prestige') {
    return numericValue <= 0 ? '#7C7B78' : getRarityColor(numericValue, 5000);
  }

  if (metricKey === 'health' || metricKey === 'intrigue' || metricKey === 'appearance' || metricKey === 'temperament') {
    return getRarityColor(numericValue, 1000);
  }

  if (metricKey === 'fortune') {
    return numericValue <= 0 ? '#7C7B78' : getRarityColor(numericValue, 100);
  }

  if (!range) {
    return '#8b6c7f';
  }

  return getRarityColor(numericValue - range[0], range[1] - range[0]);
};

const resolvePlayerAmbitionValue = (state: GameNumericsState): number => {
  const politicsScore = Number(state.stats.politics ?? 0) * 20;
  const intrigueScore = (Number(state.stats.intrigue ?? 0) - 5) * 12;
  const resolved = Math.round(politicsScore + intrigueScore);
  return Math.max(PLAYER_AMBITION_RANGE[0], Math.min(PLAYER_AMBITION_RANGE[1], resolved));
};

const resolvePlayerConditionLabel = (state: GameNumericsState): string => {
  const healthValue = convertHealthPoints(state.stats.health ?? 0);
  if (healthValue <= 400) {
    return '有恙';
  }
  return '寻常';
};

const buildMetricRows = (state: GameNumericsState, hiddenStats: HiddenStatsState): MetricDescriptor[][] => [
  [
    {
      key: 'prestige',
      label: '声望',
      display: formatMetricValue(hiddenStats.prestige),
      numericValue: hiddenStats.prestige,
      range: PRESTIGE_RANGE,
    },
  ],
  [
    {
      key: 'favor',
      label: '宠爱',
      display: formatMetricValue(hiddenStats.favor),
      numericValue: hiddenStats.favor,
      range: PLAYER_FAVOR_RANGE,
      accentColor: hiddenStats.favorColor,
    },
    {
      key: 'ambition',
      label: '野心',
      display: formatMetricValue(resolvePlayerAmbitionValue(state)),
      numericValue: resolvePlayerAmbitionValue(state),
      range: PLAYER_AMBITION_RANGE,
    },
  ],
  [
    {
      key: 'family',
      label: '家世',
      display: state.family,
    },
  ],
  [
    {
      key: 'health',
      label: '健康',
      display: formatMetricValue(convertHealthPoints(state.stats.health ?? 0)),
      numericValue: convertHealthPoints(state.stats.health ?? 0),
      range: PLAYER_HEALTH_RANGE,
    },
    {
      key: 'intrigue',
      label: '心计',
      display: formatMetricValue(convertIntriguePoints(state.stats.intrigue ?? 0)),
      numericValue: convertIntriguePoints(state.stats.intrigue ?? 0),
      range: PLAYER_INTRIGUE_RANGE,
    },
  ],
  [
    {
      key: 'appearance',
      label: '容貌',
      display: formatMetricValue(convertAppearancePoints(state.stats.appearance ?? 0)),
      numericValue: convertAppearancePoints(state.stats.appearance ?? 0),
      range: PLAYER_APPEARANCE_RANGE,
    },
    {
      key: 'temperament',
      label: '气质',
      display: formatMetricValue(convertTemperamentPoints(state.stats.temperament ?? 0)),
      numericValue: convertTemperamentPoints(state.stats.temperament ?? 0),
      range: PLAYER_TEMPERAMENT_RANGE,
    },
  ],
  [
    {
      key: 'stress',
      label: '压力',
      display: formatMetricValue(hiddenStats.stress),
      numericValue: hiddenStats.stress,
      range: PLAYER_STRESS_RANGE,
    },
    {
      key: 'fortune',
      label: '福德',
      display: formatMetricValue(convertFortunePoints(state.stats.fortune ?? 0)),
      numericValue: convertFortunePoints(state.stats.fortune ?? 0),
      range: PLAYER_FORTUNE_RANGE,
    },
  ],
  [
    {
      key: 'children',
      label: '子嗣',
      display: '暂无记载',
    },
  ],
];

const buildSkillSummary = (state: GameNumericsState): string =>
  [
    ['诗词', convertSkillLevel(state.stats.poetry ?? 0)],
    ['丹青', convertSkillLevel(state.stats.painting ?? 0)],
    ['乐理', convertSkillLevel(state.stats.talent ?? 0)],
    ['刺绣', convertSkillLevel(state.stats.embroidery ?? 0)],
    ['药理', convertSkillLevel(state.stats.medicine ?? 0)],
    ['政治', convertSkillLevel(state.stats.politics ?? 0)],
  ]
    .map(([label, value]) => `${label} ${value}`)
    .join(' / ');

interface PlayerStatsViewProps {
  state: GameNumericsState;
  hiddenStats: HiddenStatsState;
  selectedRoute?: RouteSelectionProfile;
  concubines: ConcubineProfile[];
  onClose: () => void;
}

export function PlayerStatsView({ state, hiddenStats, selectedRoute, concubines, onClose }: PlayerStatsViewProps) {
  const metricRows = useMemo(() => buildMetricRows(state, hiddenStats), [hiddenStats, state]);
  const skillSummary = useMemo(() => buildSkillSummary(state), [state]);
  const conditionLabel = useMemo(() => resolvePlayerConditionLabel(state), [state]);

  const allies = useMemo(
    () =>
      concubines
        .filter((concubine) => concubine.status === 'live' && concubine.stats.relationToPlayer > 0)
        .sort((left, right) => right.stats.relationToPlayer - left.stats.relationToPlayer)
        .slice(0, 4)
        .map((concubine) => `${concubine.rankLabel} ${concubine.name}`),
    [concubines],
  );

  const rivals = useMemo(
    () =>
      concubines
        .filter((concubine) => concubine.status === 'live' && concubine.stats.relationToPlayer < 0)
        .sort((left, right) => left.stats.relationToPlayer - right.stats.relationToPlayer)
        .slice(0, 4)
        .map((concubine) => `${concubine.rankLabel} ${concubine.name}`),
    [concubines],
  );

  return (
    <section className="player-stats-view" aria-label="个人属性面板">
      <div className="player-stats-view__veil" aria-hidden="true" />

      <div className="player-stats-view__chips" aria-label="当前人物信息栏">
        <div className="concubine-list-view__chip concubine-list-view__chip--primary">
          <div className="concubine-list-view__chip-main">
            <span className="concubine-list-view__chip-rank">{hiddenStats.initialRank ?? '宫妃'}</span>
            <span className="concubine-list-view__chip-name">{state.name}</span>
          </div>
        </div>
        <div className="concubine-list-view__chip concubine-list-view__chip--secondary">{state.residenceName}</div>
        <div className="concubine-list-view__chip concubine-list-view__chip--secondary">{`状态 ${conditionLabel}`}</div>
      </div>

      <section className="player-stats-view__metric-board" aria-label="个人核心属性">
        {metricRows.map((row, rowIndex) => (
          <div
            key={`player-metric-row-${rowIndex}`}
            className={`concubine-list-view__metric-row-group concubine-list-view__metric-row-group--${row.length}`}
          >
            {row.map((metric) => {
              const accentColor = metric.accentColor ?? getMetricAccentColor(metric.key, metric.numericValue, metric.range);
              const meterStyle =
                metric.range && typeof metric.numericValue === 'number'
                  ? ({
                      '--metric-fill': accentColor,
                      '--metric-level': `${getMetricPercent(metric.numericValue, metric.range)}%`,
                    } as CSSProperties)
                  : undefined;
              const isSignedRange = Boolean(metric.range && metric.range[0] < 0);
              return (
                <article
                  key={metric.key}
                  className={`concubine-list-view__metric-card ${metric.range ? '' : 'is-text-only'}`}
                  style={meterStyle}
                >
                  <div className="concubine-list-view__metric-copy">
                    <span>{metric.label}</span>
                    <strong>{metric.display}</strong>
                  </div>
                  {metric.range ? (
                    <div
                      className={`concubine-list-view__metric-meter ${isSignedRange ? 'is-signed' : ''}`}
                      aria-hidden="true"
                    >
                      <div className="concubine-list-view__metric-meter-fill" />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ))}
      </section>

      <section className="player-stats-view__social-board" aria-label="人际关系">
        <article className="player-stats-view__social-group">
          <span>交好</span>
          <div className="concubine-list-view__social-pills">
            {allies.length > 0 ? (
              allies.map((name) => (
                <span key={name} className="concubine-list-view__social-pill is-ally">
                  {name}
                </span>
              ))
            ) : (
              <span className="concubine-list-view__social-empty">暂无明显交好对象</span>
            )}
          </div>
        </article>

        <article className="player-stats-view__social-group">
          <span>交恶</span>
          <div className="concubine-list-view__social-pills">
            {rivals.length > 0 ? (
              rivals.map((name) => (
                <span key={name} className="concubine-list-view__social-pill is-rival">
                  {name}
                </span>
              ))
            ) : (
              <span className="concubine-list-view__social-empty">暂无明显交恶对象</span>
            )}
          </div>
        </article>
      </section>

      <p className="player-stats-view__note">{`当前技艺：${skillSummary}。年龄 ${state.age}，体力 ${state.stamina}。`}</p>

      <section className="player-stats-view__portrait-stage" aria-label={`${state.name}立绘`}>
        <div className="player-stats-view__portrait-frame">
          {selectedRoute ? (
            <img src={selectedRoute.portrait} alt={selectedRoute.label} className="player-stats-view__portrait" />
          ) : (
            <div className="player-stats-view__portrait-empty">暂无立绘</div>
          )}
        </div>
      </section>

      <button type="button" className="player-stats-view__close" aria-label="返回" onClick={onClose}>
        返回
      </button>
    </section>
  );
}
