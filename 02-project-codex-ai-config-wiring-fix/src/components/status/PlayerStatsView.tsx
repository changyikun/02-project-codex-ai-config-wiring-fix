import { useMemo, useState, type CSSProperties } from 'react';
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
  convertFortuneAttributePoints,
  convertFortunePoints,
  convertHealthPoints,
  convertIntriguePoints,
  convertSkillLevel,
  convertTemperamentPoints,
} from '../../config/formulas';
import { getRarityColor } from '../../game/lib/bedchamberRuntime';
import { getConcubinePortraitPath } from '../../game/data/concubineRoster';
import { getPlayerAttributeFieldConfig, getPlayerStatusFieldConfig } from '../../game/numerics/numericCatalog';
import type { ConcubineProfile, GameNumericsState, HiddenStatsState, RouteSelectionProfile } from '../../game/types';
import { AttributeHelpButton } from './AttributeHelpButton';

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
  note?: string;
}

interface SkillDescriptor {
  key: string;
  label: string;
  display: string;
  note?: string;
}

const STRESS_SAFE_COLOR = '#5F8B80';
const STRESS_WARNING_COLOR = '#A77F3D';
const ATTRIBUTE_STATS_FINALIZED_FLAG = 'attributeStatsFinalized';

const isRuntimeStatValue = (state: GameNumericsState, value: number): boolean =>
  Boolean(state.flags[ATTRIBUTE_STATS_FINALIZED_FLAG]) || Math.abs(value) > 10;

const resolveMainStatDisplayValue = (
  state: GameNumericsState,
  key: 'health' | 'intrigue' | 'appearance' | 'temperament',
): number => {
  const value = Number(state.stats[key] ?? 0);
  if (isRuntimeStatValue(state, value)) {
    return value;
  }
  if (key === 'health') return convertHealthPoints(value);
  if (key === 'intrigue') return convertIntriguePoints(value);
  if (key === 'appearance') return convertAppearancePoints(value);
  return convertTemperamentPoints(value);
};

const resolveFortuneDisplayValue = (state: GameNumericsState): number => {
  const value = Number(state.stats.fortune ?? 0);
  return isRuntimeStatValue(state, value) ? convertFortunePoints(value) : convertFortuneAttributePoints(value);
};

const resolveSkillDisplayValue = (state: GameNumericsState, key: string): number => {
  const value = Number(state.stats[key] ?? 0);
  return isRuntimeStatValue(state, value) ? value : convertSkillLevel(value);
};

const resolvePointScaleValue = (value: number, divisor: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.abs(value) > 10 ? value / divisor : value;
};

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
  const politicsPoints = resolvePointScaleValue(Number(state.stats.politics ?? 0), 10);
  const intriguePoints = resolvePointScaleValue(Number(state.stats.intrigue ?? 0), 100);
  const politicsScore = politicsPoints * 20;
  const intrigueScore = (intriguePoints - 5) * 12;
  const resolved = Math.round(politicsScore + intrigueScore);
  return Math.max(PLAYER_AMBITION_RANGE[0], Math.min(PLAYER_AMBITION_RANGE[1], resolved));
};

const resolvePlayerConditionLabel = (state: GameNumericsState): string => {
  const healthValue = resolveMainStatDisplayValue(state, 'health');
  if (healthValue <= 400) {
    return '有恙';
  }
  return '寻常';
};

const resolvePlayerAttributeNote = (key: string): string | undefined => getPlayerAttributeFieldConfig(key)?.note;
const resolvePlayerMetricNote = (key: string): string | undefined =>
  getPlayerAttributeFieldConfig(key)?.note ?? getPlayerStatusFieldConfig(key)?.note;

const buildMetricRows = (state: GameNumericsState, hiddenStats: HiddenStatsState): MetricDescriptor[][] => [
  [
    {
      key: 'prestige',
      label: '声望',
      display: formatMetricValue(hiddenStats.prestige),
      numericValue: hiddenStats.prestige,
      range: PRESTIGE_RANGE,
      note: resolvePlayerMetricNote('prestige'),
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
      note: resolvePlayerMetricNote('favor'),
    },
    {
      key: 'ambition',
      label: '野心',
      display: formatMetricValue(resolvePlayerAmbitionValue(state)),
      numericValue: resolvePlayerAmbitionValue(state),
      range: PLAYER_AMBITION_RANGE,
      note: resolvePlayerMetricNote('ambition'),
    },
  ],
  [
    {
      key: 'family',
      label: '家世',
      display: state.family,
      note: resolvePlayerMetricNote('family'),
    },
  ],
  [
    {
      key: 'health',
      label: '健康',
      display: formatMetricValue(resolveMainStatDisplayValue(state, 'health')),
      numericValue: resolveMainStatDisplayValue(state, 'health'),
      range: PLAYER_HEALTH_RANGE,
      note: resolvePlayerAttributeNote('health'),
    },
    {
      key: 'intrigue',
      label: '心计',
      display: formatMetricValue(resolveMainStatDisplayValue(state, 'intrigue')),
      numericValue: resolveMainStatDisplayValue(state, 'intrigue'),
      range: PLAYER_INTRIGUE_RANGE,
      note: resolvePlayerAttributeNote('intrigue'),
    },
  ],
  [
    {
      key: 'appearance',
      label: '容貌',
      display: formatMetricValue(resolveMainStatDisplayValue(state, 'appearance')),
      numericValue: resolveMainStatDisplayValue(state, 'appearance'),
      range: PLAYER_APPEARANCE_RANGE,
      note: resolvePlayerAttributeNote('appearance'),
    },
    {
      key: 'temperament',
      label: '气质',
      display: formatMetricValue(resolveMainStatDisplayValue(state, 'temperament')),
      numericValue: resolveMainStatDisplayValue(state, 'temperament'),
      range: PLAYER_TEMPERAMENT_RANGE,
      note: resolvePlayerAttributeNote('temperament'),
    },
  ],
  [
    {
      key: 'stress',
      label: '压力',
      display: formatMetricValue(hiddenStats.stress),
      numericValue: hiddenStats.stress,
      range: PLAYER_STRESS_RANGE,
      note: resolvePlayerMetricNote('stress'),
    },
    {
      key: 'fortune',
      label: '福德',
      display: formatMetricValue(resolveFortuneDisplayValue(state)),
      numericValue: resolveFortuneDisplayValue(state),
      range: PLAYER_FORTUNE_RANGE,
      note: resolvePlayerAttributeNote('fortune'),
    },
  ],
  [
    {
      key: 'children',
      label: '子嗣',
      display: '暂无记载',
      note: resolvePlayerMetricNote('children'),
    },
  ],
];

const buildSkillRows = (state: GameNumericsState): SkillDescriptor[] =>
  [
    ['poetry', '诗词'],
    ['painting', '丹青'],
    ['talent', '乐理'],
    ['embroidery', '刺绣'],
    ['medicine', '药理'],
    ['politics', '政治'],
  ].map(([key, label]) => ({
    key,
    label,
    display: formatMetricValue(resolveSkillDisplayValue(state, key)),
    note: resolvePlayerAttributeNote(key),
  }));

interface PlayerStatsViewProps {
  state: GameNumericsState;
  hiddenStats: HiddenStatsState;
  selectedRoute?: RouteSelectionProfile;
  concubines: ConcubineProfile[];
  onClose: () => void;
}

export function PlayerStatsView({ state, hiddenStats, selectedRoute, concubines, onClose }: PlayerStatsViewProps) {
  const metricRows = useMemo(() => buildMetricRows(state, hiddenStats), [hiddenStats, state]);
  const visibleMetricRows = useMemo(
    () =>
      metricRows
        .map((row) => row.filter((metric) => metric.key !== 'family' && metric.key !== 'children'))
        .filter((row) => row.length > 0),
    [metricRows],
  );
  const skillRows = useMemo(() => buildSkillRows(state), [state]);
  const conditionLabel = useMemo(() => resolvePlayerConditionLabel(state), [state]);
  const [activeHelpKey, setActiveHelpKey] = useState<string | null>(null);

  const toggleHelp = (key: string): void => {
    setActiveHelpKey((current) => (current === key ? null : key));
  };

  const allies = useMemo(
    () =>
      concubines
        .filter((concubine) => concubine.status === 'live' && concubine.stats.relationToPlayer > 0)
        .sort((left, right) => right.stats.relationToPlayer - left.stats.relationToPlayer)
        .slice(0, 4),
    [concubines],
  );

  const rivals = useMemo(
    () =>
      concubines
        .filter((concubine) => concubine.status === 'live' && concubine.stats.relationToPlayer < 0)
        .sort((left, right) => left.stats.relationToPlayer - right.stats.relationToPlayer)
        .slice(0, 4),
    [concubines],
  );

  const infoRows = useMemo(
    () => [
      ['当前位份', hiddenStats.initialRank ?? '宫妃'],
      ['居所', state.residenceName],
      ['状态', conditionLabel],
      ['家世', state.family],
      ['年龄', `${state.age}`],
      ['子嗣', '暂无记载'],
    ],
    [conditionLabel, hiddenStats.initialRank, state.age, state.family, state.residenceName],
  );

  return (
    <section className="player-stats-view" aria-label="个人属性面板">
      <div className="player-stats-view__veil" aria-hidden="true" />
      <h2 className="player-stats-view__title">个人属性</h2>

      <section className="player-stats-view__info-list" aria-label="当前人物信息">
        <h3>{state.name}</h3>
        {infoRows.map(([label, value]) => (
          <div key={label} className="player-stats-view__info-row">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <section className="player-stats-view__metric-board" aria-label="个人核心属性">
        <h3 className="player-stats-view__section-title">基础信息</h3>
        {visibleMetricRows.map((row, rowIndex) => (
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
                    <span className="concubine-list-view__metric-label-wrap">
                      <span>{metric.label}</span>
                      {metric.note ? (
                        <>
                          <AttributeHelpButton
                            id={`player-metric-help-${metric.key}`}
                            label={metric.label}
                            note={metric.note}
                            open={activeHelpKey === `metric:${metric.key}`}
                            onToggle={() => toggleHelp(`metric:${metric.key}`)}
                            buttonClassName="concubine-list-view__metric-help"
                          />
                        </>
                      ) : null}
                    </span>
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
        <h3 className="player-stats-view__section-title">宫中关系</h3>
        <article className="player-stats-view__social-group">
          <span>交好</span>
          <div className="player-stats-view__relationship-list">
            {allies.length > 0 ? (
              allies.map((consort) => (
                <span key={consort.id} className="player-stats-view__relationship-avatar">
                  <img src={getConcubinePortraitPath(consort.portraitId)} alt="" />
                  <span>{consort.name}</span>
                </span>
              ))
            ) : (
              <span className="player-stats-view__relationship-empty">暂无明显交好对象</span>
            )}
          </div>
        </article>

        <article className="player-stats-view__social-group">
          <span>交恶</span>
          <div className="player-stats-view__relationship-list">
            {rivals.length > 0 ? (
              rivals.map((consort) => (
                <span key={consort.id} className="player-stats-view__relationship-avatar">
                  <img src={getConcubinePortraitPath(consort.portraitId)} alt="" />
                  <span>{consort.name}</span>
                </span>
              ))
            ) : (
              <span className="player-stats-view__relationship-empty">暂无明显交恶对象</span>
            )}
          </div>
        </article>
      </section>

      <section className="player-stats-view__note" aria-label="个人技艺与状态">
        <h3 className="player-stats-view__section-title">技艺</h3>
        <div className="player-stats-view__skill-list" aria-label="个人技艺属性">
          {skillRows.map((skill) => (
            <span key={skill.key} className="player-stats-view__skill-item">
              <span className="concubine-list-view__metric-label-wrap">
                <span>{skill.label}</span>
                {skill.note ? (
                  <>
                    <AttributeHelpButton
                      id={`player-skill-help-${skill.key}`}
                      label={skill.label}
                      note={skill.note}
                      open={activeHelpKey === `skill:${skill.key}`}
                      onToggle={() => toggleHelp(`skill:${skill.key}`)}
                      buttonClassName="concubine-list-view__metric-help"
                    />
                  </>
                ) : null}
              </span>
              <strong>{skill.display}</strong>
            </span>
          ))}
        </div>
      </section>

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
