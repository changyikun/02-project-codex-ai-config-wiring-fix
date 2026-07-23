import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AGE_RANGE } from '../config/constants';
import { convertFortuneAttributePoints } from '../config/formulas';
import { attributeFields } from '../game/data/config';
import { resolveRouteInitialPointsTotal } from '../game/numerics/numericCatalog';
import { useGameFlowStore } from '../game/store/gameFlowStore';
import { AttributeHelpButton } from '../components/status/AttributeHelpButton';

const ATTRIBUTE_STATS_FINALIZED_FLAG = 'attributeStatsFinalized';
const TRANSIENT_NOTICE_DURATION_MS = 2200;

const attributePetals = Array.from({ length: 16 }, (_, index) => ({
  id: `attribute-petal-${index}`,
  left: `${3 + ((index * 6.1) % 94)}%`,
  delay: `${(index % 8) * 0.72}s`,
  duration: `${12 + (index % 6) * 1.45}s`,
  size: `${14 + (index % 5) * 6}px`,
  drift: `${16 + (index % 7) * 9}px`,
}));

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const formatDisplayedValue = (key: string, value: number, routeLocked: boolean, finalized: boolean): number => {
  if (finalized) {
    return value;
  }

  if (routeLocked) {
    const fixedMap: Record<string, number> = {
      health: 600,
      fortune: 30,
      intrigue: 699,
      appearance: 899,
      temperament: 800,
      poetry: 0,
      talent: 60,
      painting: 60,
      embroidery: 10,
      medicine: 50,
      politics: 40,
    };
    return fixedMap[key] ?? value;
  }

  if (key === 'fortune') {
    return convertFortuneAttributePoints(value);
  }
  if (['health', 'intrigue', 'appearance', 'temperament'].includes(key)) {
    return value * 100;
  }
  return value * 10;
};

export function AttributeAssignmentView() {
  const { state, selectedRoute, setPlayerName, patchState, setAttributeValue, finalizeAttributeAssignment, setCurrentView, setScene } =
    useGameFlowStore();
  const [activeHelpKey, setActiveHelpKey] = useState<string | null>(null);
  const [familyNotice, setFamilyNotice] = useState('');
  const [familyNoticeKey, setFamilyNoticeKey] = useState(0);
  const familyNoticeTimerRef = useRef<number | null>(null);

  const finalized = Boolean(state.flags[ATTRIBUTE_STATS_FINALIZED_FLAG]);
  const routeLocked = Boolean(selectedRoute?.statsLocked);
  const controlsLocked = routeLocked || finalized;
  const hasRandomFamilyOptions = (selectedRoute?.familyOptions?.length ?? 0) > 1;
  const pointsLeftDisplay = useMemo(() => {
    if (finalized) {
      return '已确认';
    }
    if (routeLocked) {
      return '已固定';
    }
    const numericValue = Math.round(((state.pointsLeft ?? 0) + Number.EPSILON) * 100) / 100;
    return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }, [finalized, routeLocked, state.pointsLeft]);
  const displayedFields = useMemo(() => {
    return attributeFields.map((field) => ({
      ...field,
      current: state.stats[field.key] ?? field.value,
      displayValue: formatDisplayedValue(field.key, state.stats[field.key] ?? field.value, routeLocked, finalized),
      max:
        field.key === 'politics'
          ? selectedRoute?.id === 'lanyinxuguo' || selectedRoute?.id === 'chenyuansucuo'
            ? 4
            : 2
          : field.max,
    }));
  }, [finalized, routeLocked, selectedRoute?.id, state.stats]);

  useEffect(() => {
    return () => {
      if (familyNoticeTimerRef.current !== null) {
        window.clearTimeout(familyNoticeTimerRef.current);
      }
    };
  }, []);

  const clearFamilyNotice = () => {
    if (familyNoticeTimerRef.current !== null) {
      window.clearTimeout(familyNoticeTimerRef.current);
      familyNoticeTimerRef.current = null;
    }
    setFamilyNotice('');
  };

  const showFamilyNotice = (message: string) => {
    if (familyNoticeTimerRef.current !== null) {
      window.clearTimeout(familyNoticeTimerRef.current);
    }
    setFamilyNoticeKey((current) => current + 1);
    setFamilyNotice(message);
    familyNoticeTimerRef.current = window.setTimeout(() => {
      setFamilyNotice('');
      familyNoticeTimerRef.current = null;
    }, TRANSIENT_NOTICE_DURATION_MS);
  };

  const adjustAge = (direction: -1 | 1) => {
    const nextAge = Math.min(AGE_RANGE[1], Math.max(AGE_RANGE[0], state.age + direction));
    if (nextAge !== state.age) {
      patchState({ age: nextAge });
    }
  };

  const randomizeFamily = () => {
    if (!hasRandomFamilyOptions) {
      showFamilyNotice('当前路线为固定家世');
      return;
    }

    clearFamilyNotice();
    const options = selectedRoute?.familyOptions ?? [state.family];
    const family = options[randomInt(0, options.length - 1)];
    const pointsTotal = resolveRouteInitialPointsTotal(selectedRoute?.id ?? state.routeId, family);
    const baseStats = Object.fromEntries(attributeFields.map((field) => [field.key, field.min]));
    patchState({
      family,
      pointsTotal,
      pointsLeft: pointsTotal,
      stats: baseStats,
    });
  };

  const autoAssign = () => {
    if (controlsLocked) {
      return;
    }
    const pointsTotal = state.pointsTotal ?? 0;
    const mins = Object.fromEntries(displayedFields.map((field) => [field.key, field.min]));
    const maxes = Object.fromEntries(displayedFields.map((field) => [field.key, field.max]));
    const nextStats: Record<string, number> = { ...mins };

    let remaining = pointsTotal;
    const keys = displayedFields.map((field) => field.key);
    while (remaining > 0) {
      const key = keys[randomInt(0, keys.length - 1)];
      const currentValue = nextStats[key] ?? 0;
      const maxValue = maxes[key] ?? currentValue;
      if (currentValue >= maxValue) {
        continue;
      }
      nextStats[key] = currentValue + 1;
      remaining -= 1;
    }
    patchState({ stats: nextStats, pointsLeft: 0 });
  };

  const adjust = (key: string, direction: -1 | 1, min: number, max: number) => {
    if (controlsLocked) {
      return;
    }
    if (direction > 0 && state.pointsLeft <= 0) {
      return;
    }
    const current = state.stats[key] ?? min;
    const next = Math.min(max, Math.max(min, current + direction));
    if (next === current) {
      return;
    }
    setAttributeValue(key, next);
  };

  return (
    <main className="attribute-assignment">
      <div className="attribute-assignment__frame">
        <div className="attribute-assignment__background" />
        <div className="attribute-assignment__content">
          <div className="attribute-assignment__petals" aria-hidden="true">
            {attributePetals.map((petal) => (
              <span
                key={petal.id}
                className="start-scene__petal"
                style={{
                  left: petal.left,
                  top: '-10%',
                  width: petal.size,
                  height: `calc(${petal.size} * 0.72)`,
                  animationDelay: petal.delay,
                  animationDuration: petal.duration,
                  ['--petal-drift' as string]: petal.drift,
                } as CSSProperties}
              />
            ))}
          </div>
          <h1 className="attribute-assignment__title">初始设定</h1>
          <aside className="attribute-assignment__portrait-panel">
            {selectedRoute ? <img src={selectedRoute.portrait} alt={selectedRoute.label} /> : null}
            <span className="attribute-assignment__taohua" aria-hidden="true" />
          </aside>

          <section className="attribute-assignment__panel">
            <div className="attribute-assignment__identity">
              <label className="attribute-assignment__identity-field">
                <span>姓名</span>
                <input value={state.name} onChange={(event) => setPlayerName(event.target.value)} />
              </label>
              <label className="attribute-assignment__identity-field attribute-assignment__identity-field--age">
                <span>年龄</span>
                <div className="attribute-assignment__inline attribute-assignment__inline--age">
                  <button
                    type="button"
                    className="attribute-assignment__age-step"
                    onClick={() => adjustAge(-1)}
                    disabled={state.age <= AGE_RANGE[0]}
                    aria-label="年龄减一"
                    title="年龄减一"
                  >
                    -
                  </button>
                  <input className="attribute-assignment__input--compact" aria-label="年龄" value={state.age} readOnly />
                  <button
                    type="button"
                    className="attribute-assignment__age-step"
                    onClick={() => adjustAge(1)}
                    disabled={state.age >= AGE_RANGE[1]}
                    aria-label="年龄加一"
                    title="年龄加一"
                  >
                    +
                  </button>
                </div>
              </label>
              <label className="attribute-assignment__identity-field attribute-assignment__identity-field--family">
                <span>家世</span>
                <div className="attribute-assignment__inline">
                  <input value={state.family} readOnly />
                  <button
                    type="button"
                    className="attribute-assignment__family-random"
                    onClick={randomizeFamily}
                    disabled={finalized}
                  >
                    随机
                  </button>
                  {familyNotice ? (
                    <span key={familyNoticeKey} className="attribute-assignment__family-notice">
                      {familyNotice}
                    </span>
                  ) : null}
                </div>
              </label>
            </div>

            <div className="attribute-assignment__topbar">
              <div>
                剩余点数：{pointsLeftDisplay}
              </div>
              <button type="button" className="attribute-assignment__random" onClick={autoAssign}>
                随机
              </button>
            </div>

            <div className="attribute-assignment__grid">
              {displayedFields.map((field) => {
                const currentValue = state.stats[field.key] ?? field.min;
                const canDecrease = !controlsLocked && currentValue > field.min;
                const canIncrease = !controlsLocked && currentValue < field.max && (state.pointsLeft ?? 0) > 0;

                return (
                  <div key={field.key} className="attribute-assignment__item">
                    <div className="attribute-assignment__label-wrap">
                      <span>{field.label}</span>
                      <AttributeHelpButton
                        id={`attribute-help-${field.key}`}
                        label={field.label}
                        note={field.note ?? `${field.label}说明待补充。`}
                        open={activeHelpKey === field.key}
                        onToggle={() => setActiveHelpKey((current) => (current === field.key ? null : field.key))}
                        buttonClassName="attribute-assignment__help"
                      />
                    </div>
                    <div className="attribute-assignment__stepper">
                      <button
                        type="button"
                        onClick={() => adjust(field.key, -1, field.min, field.max)}
                        disabled={!canDecrease}
                        aria-label={`${field.label}减少`}
                        title={`${field.label}减少`}
                      >
                        -
                      </button>
                      <strong>{field.displayValue}</strong>
                      <button
                        type="button"
                        onClick={() => adjust(field.key, 1, field.min, field.max)}
                        disabled={!canIncrease}
                        aria-label={`${field.label}增加`}
                        title={`${field.label}增加`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <div className="attribute-assignment__actions" aria-label="属性加点操作">
          <button
            type="button"
            className="attribute-assignment__confirm"
            onClick={() => {
              finalizeAttributeAssignment();
              setScene('briefing');
              setCurrentView('opening-dialogue');
            }}
            aria-label="确认进入剧情"
            title="入宫"
          >
            入宫
          </button>
          <button
            type="button"
            className="attribute-assignment__back"
            onClick={() => setCurrentView('route-selection')}
            aria-label="返回路线选择"
            title="返回"
          >
            返回
          </button>
        </div>
      </div>
    </main>
  );
}
