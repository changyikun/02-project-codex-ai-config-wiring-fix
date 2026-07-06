import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RARITY_COLOR_LEGENDARY } from '../../config/constants';
import {
  getConcubineConditionLabel,
  getConcubineDisplayRankText,
  getConcubineFavorTier,
  getConcubinePortraitPath,
  getConcubineRankPalette,
  getConcubineRankShiftNotice,
  sortConcubinesByStatus,
} from '../../game/data/concubineRoster';
import { getRarityColor } from '../../game/lib/bedchamberRuntime';
import { getConsortAttributeFieldConfig } from '../../game/numerics/numericCatalog';
import type { ConcubineProfile, ConcubineStatus } from '../../game/types';
import { AttributeHelpButton } from '../status/AttributeHelpButton';

const statusTabs: Array<{ id: ConcubineStatus; label: string }> = [
  { id: 'live', label: '后宫' },
  { id: 'limbo', label: '冷宫' },
  { id: 'deceased', label: '已逝' },
];

const formatSignedValue = (value: number): string => (value > 0 ? `+${value}` : String(value));
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

const STRESS_SAFE_COLOR = '#5F8B80';
const STRESS_WARNING_COLOR = '#A77F3D';

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

  if (metricKey === 'favor') {
    return getConcubineFavorTier({
      stats: {
        favor: numericValue,
      },
    } as ConcubineProfile).color;
  }

  if (metricKey === 'fortune' || metricKey === 'ambition' || metricKey === 'relationToPlayer') {
    return numericValue <= 0 ? '#7C7B78' : getRarityColor(numericValue, 100);
  }

  if (metricKey === 'affection') {
    return getRarityColor(numericValue, 100);
  }

  if (!range) {
    return '#8b6c7f';
  }

  return getRarityColor(numericValue - range[0], range[1] - range[0]);
};

const buildMetric = (metric: Omit<MetricDescriptor, 'note'>): MetricDescriptor => ({
  ...metric,
  note: getConsortAttributeFieldConfig(metric.key)?.note,
});

const buildMetricRows = (consort: ConcubineProfile): MetricDescriptor[][] => [
  [
    buildMetric({
      key: 'prestige',
      label: '声望',
      display: formatMetricValue(consort.stats.prestige),
      numericValue: consort.stats.prestige,
      range: [-2000, 5000],
    }),
  ],
  [
    buildMetric({
      key: 'favor',
      label: '宠爱',
      display: formatMetricValue(consort.stats.favor),
      numericValue: consort.stats.favor,
      range: [-100, 100],
    }),
    buildMetric({
      key: 'fortune',
      label: '福德',
      display: formatMetricValue(consort.stats.fortune),
      numericValue: consort.stats.fortune,
      range: [-100, 100],
    }),
    buildMetric({
      key: 'ambition',
      label: '野心',
      display: formatMetricValue(consort.stats.ambition),
      numericValue: consort.stats.ambition,
      range: [-100, 100],
    }),
  ],
  [
    buildMetric({
      key: 'stress',
      label: '压力',
      display: formatMetricValue(consort.stats.stress),
      numericValue: consort.stats.stress,
      range: [-100, 100],
    }),
  ],
  [
    buildMetric({
      key: 'familyBackground',
      label: '家世',
      display: consort.familyBackground,
    }),
  ],
  [
    buildMetric({
      key: 'health',
      label: '健康',
      display: formatMetricValue(consort.stats.health),
      numericValue: consort.stats.health,
      range: [0, 1000],
    }),
    buildMetric({
      key: 'intrigue',
      label: '心计',
      display: formatMetricValue(consort.stats.intrigue),
      numericValue: consort.stats.intrigue,
      range: [0, 1000],
    }),
  ],
  [
    buildMetric({
      key: 'appearance',
      label: '容貌',
      display: formatMetricValue(consort.stats.appearance),
      numericValue: consort.stats.appearance,
      range: [0, 1000],
    }),
    buildMetric({
      key: 'temperament',
      label: '气质',
      display: formatMetricValue(consort.stats.temperament),
      numericValue: consort.stats.temperament,
      range: [0, 1000],
    }),
  ],
  [
    buildMetric({
      key: 'relationToPlayer',
      label: '好感',
      display: formatSignedValue(consort.stats.relationToPlayer),
      numericValue: consort.stats.relationToPlayer,
      range: [-100, 100],
    }),
    buildMetric({
      key: 'affection',
      label: '倾情',
      display: formatMetricValue(consort.stats.affection),
      numericValue: consort.stats.affection,
      range: [0, 100],
    }),
  ],
  [
    buildMetric({
      key: 'childrenCount',
      label: '子嗣',
      display: String(consort.stats.childrenCount),
    }),
  ],
];

interface ConcubineListViewProps {
  concubines: ConcubineProfile[];
  onClose: () => void;
}

export function ConcubineListView({ concubines, onClose }: ConcubineListViewProps) {
  const [activeStatus, setActiveStatus] = useState<ConcubineStatus>('live');
  const [selectedId, setSelectedId] = useState<string>('');
  const [activeMetricHelpKey, setActiveMetricHelpKey] = useState<string | null>(null);

  const visibleConsorts = useMemo(() => sortConcubinesByStatus(concubines, activeStatus), [activeStatus, concubines]);

  useEffect(() => {
    if (!visibleConsorts.some((consort) => consort.id === selectedId)) {
      setSelectedId(visibleConsorts[0]?.id ?? '');
    }
  }, [selectedId, visibleConsorts]);

  useEffect(() => {
    setActiveMetricHelpKey(null);
  }, [activeStatus, selectedId]);

  const activeConsort = visibleConsorts.find((consort) => consort.id === selectedId) ?? visibleConsorts[0] ?? null;

  if (!activeConsort) {
    return null;
  }

  const currentRankText = getConcubineDisplayRankText(activeConsort);
  const currentRankPalette = getConcubineRankPalette(activeConsort);
  const metricRows = buildMetricRows(activeConsort)
    .map((row) => row.filter((metric) => !['familyBackground', 'relationToPlayer', 'affection'].includes(metric.key)))
    .filter((row) => row.length > 0);
  const featuredMetrics = [
    buildMetric({
      key: 'relationToPlayer',
      label: '好感',
      display: formatSignedValue(activeConsort.stats.relationToPlayer),
      numericValue: activeConsort.stats.relationToPlayer,
      range: [-100, 100],
    }),
    buildMetric({
      key: 'affection',
      label: '倾情',
      display: formatMetricValue(activeConsort.stats.affection),
      numericValue: activeConsort.stats.affection,
      range: [0, 100],
    }),
  ];
  const currentConditionLabel = getConcubineConditionLabel(activeConsort);
  const rankShiftNotice = getConcubineRankShiftNotice(activeConsort);
  const resolveRelationProfiles = (ids: string[]): ConcubineProfile[] =>
    ids
      .map((id) => concubines.find((consort) => consort.id === id || consort.name === id))
      .filter((consort): consort is ConcubineProfile => Boolean(consort))
      .slice(0, 3);
  const allyProfiles = resolveRelationProfiles(activeConsort.allies);
  const rivalProfiles = resolveRelationProfiles(activeConsort.rivals);

  return (
    <section className="concubine-list-view" aria-label="嫔妃总览面板">
      <aside className="concubine-list-view__sidebar" aria-label="嫔妃状态与名单">
        <div className="concubine-list-view__tabs" role="tablist" aria-label="嫔妃状态切换">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeStatus === tab.id}
              className={`concubine-list-view__tab ${activeStatus === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveStatus(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="concubine-list-view__entries" role="list" aria-label={`${statusTabs.find((tab) => tab.id === activeStatus)?.label} 名单`}>
          {visibleConsorts.map((consort) => (
            <button
              key={consort.id}
              type="button"
              role="listitem"
              aria-label={`${getConcubineDisplayRankText(consort)} ${consort.name}`}
              className={`concubine-list-view__entry ${selectedId === consort.id ? 'is-active' : ''}`}
              onClick={() => setSelectedId(consort.id)}
            >
              <span className="concubine-list-view__entry-label">
                <span className="concubine-list-view__entry-rank" style={{ color: getConcubineRankPalette(consort).rankColor }}>
                  {getConcubineDisplayRankText(consort)}
                </span>
                {' '}
                <span className="concubine-list-view__entry-name" style={{ color: getConcubineRankPalette(consort).nameColor }}>
                  {consort.name}
                </span>
              </span>
            </button>
          ))}
        </div>

        <button type="button" className="concubine-list-view__back" onClick={onClose}>
          返回
        </button>
      </aside>

      <div className="concubine-list-view__detail-surface" aria-hidden="true" />

      <div className="concubine-list-view__chips" aria-label="当前嫔妃信息栏">
        <div className="concubine-list-view__chip concubine-list-view__chip--primary">
          <div className="concubine-list-view__chip-main">
            <span className="concubine-list-view__chip-rank" style={{ color: currentRankPalette.rankColor }}>
              {currentRankText}
            </span>
            {' '}
            <span className="concubine-list-view__chip-name" style={{ color: currentRankPalette.nameColor }}>
              {activeConsort.name}
            </span>
          </div>
          {rankShiftNotice ? <small className="concubine-list-view__chip-hint">{rankShiftNotice}</small> : null}
        </div>
      </div>

      <section className="concubine-list-view__info-board" aria-label="嫔妃人物信息">
        <dl>
          <div className="concubine-list-view__info-row">
            <dt>居所</dt>
            <dd>{activeConsort.residence}</dd>
          </div>
          <div className="concubine-list-view__info-row">
            <dt>状态</dt>
            <dd>{currentConditionLabel}</dd>
          </div>
          <div className="concubine-list-view__info-row">
            <dt>家世</dt>
            <dd>{activeConsort.familyBackground}</dd>
          </div>
          <div className="concubine-list-view__info-row">
            <dt>性格</dt>
            <dd>{activeConsort.personality}</dd>
          </div>
          <div className="concubine-list-view__info-row concubine-list-view__info-row--summary">
            <dt>生平</dt>
            <dd>{activeConsort.summary}</dd>
          </div>
          <div className="concubine-list-view__info-row concubine-list-view__info-row--featured">
            <dt></dt>
            <dd>
              <section className="concubine-list-view__featured-metrics" aria-label="好感与倾情">
                <h3>与我情分</h3>
                <div className="concubine-list-view__featured-list">
                  {featuredMetrics.map((metric) => {
                    const accentColor = metric.accentColor ?? getMetricAccentColor(metric.key, metric.numericValue, metric.range);
                    const meterStyle =
                      metric.range && typeof metric.numericValue === 'number'
                        ? ({
                            '--metric-fill': accentColor,
                            '--metric-level': `${getMetricPercent(metric.numericValue, metric.range)}%`,
                          } as CSSProperties)
                        : undefined;
                    return (
                      <article key={metric.key} className="concubine-list-view__featured-metric" style={meterStyle}>
                        <div className="concubine-list-view__featured-copy">
                          <span>{metric.label}</span>
                          <strong>{metric.display.replace(/^\+/, '')}</strong>
                        </div>
                        <div className="concubine-list-view__featured-meter" aria-hidden="true">
                          <i />
                        </div>
                        <div className="concubine-list-view__featured-scale" aria-hidden="true">
                          <span>0</span>
                          <span>100</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </dd>
          </div>
        </dl>
      </section>

      <section className="concubine-list-view__metric-board" aria-label="嫔妃核心属性">
        {metricRows.map((row, rowIndex) => (
          <div
            key={`metric-row-${rowIndex}`}
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
                            id={`concubine-metric-help-${metric.key}`}
                            label={metric.label}
                            note={metric.note}
                            open={activeMetricHelpKey === metric.key}
                            onToggle={() => setActiveMetricHelpKey((current) => (current === metric.key ? null : metric.key))}
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

      <section className="concubine-list-view__relationship-board" aria-label="嫔妃人际关系">
        <article className="concubine-list-view__relationship-group">
          <h3>交好NPC</h3>
          <div className="concubine-list-view__relationship-list">
            {allyProfiles.length > 0 ? (
              allyProfiles.map((consort) => (
                <span key={consort.id} className="concubine-list-view__relationship-avatar">
                  <img src={getConcubinePortraitPath(consort.portraitId)} alt="" />
                  <span>{consort.name}</span>
                </span>
              ))
            ) : (
              <span className="concubine-list-view__relationship-empty">暂无</span>
            )}
          </div>
        </article>
        <article className="concubine-list-view__relationship-group">
          <h3>交恶NPC</h3>
          <div className="concubine-list-view__relationship-list">
            {rivalProfiles.length > 0 ? (
              rivalProfiles.map((consort) => (
                <span key={consort.id} className="concubine-list-view__relationship-avatar">
                  <img src={getConcubinePortraitPath(consort.portraitId)} alt="" />
                  <span>{consort.name}</span>
                </span>
              ))
            ) : (
              <span className="concubine-list-view__relationship-empty">暂无</span>
            )}
          </div>
        </article>
      </section>

      <section className="concubine-list-view__portrait-stage" aria-label={`${activeConsort.name}立绘`}>
        <img
          src={getConcubinePortraitPath(activeConsort.portraitId)}
          alt={activeConsort.name}
          className="concubine-list-view__portrait"
        />
      </section>
    </section>
  );
}
