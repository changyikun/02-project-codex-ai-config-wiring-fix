import { useMemo } from 'react';
import { attributeFields } from '../game/data/config';
import { useGameFlowStore } from '../game/store/gameFlowStore';

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

const resolveBudgetByFamily = (routeId: string, family: string): number => {
  const normalized = family.replace(/\s+/g, '');
  const base =
    normalized.includes('商贾') ? 56 : normalized.includes('九品') ? 56 : normalized.includes('八品') ? 55 : normalized.includes('七品') ? 54 : normalized.includes('六品') ? 53 : normalized.includes('五品') ? 52 : normalized.includes('四品') ? 51 : normalized.includes('三品') ? 50 : normalized.includes('二品') ? 49 : normalized.includes('一品') ? 48 : normalized.includes('镇国公') ? 48 : normalized.includes('和亲公主') ? 48 : normalized.includes('异国贡女') ? 52 : normalized.includes('罪臣') ? 54 : 50;
  if (routeId === 'lanyinxuguo') {
    return Math.min(51, Math.max(48, base));
  }
  if (routeId === 'yingluoyeting') {
    return 54;
  }
  if (routeId === 'chenyuansucuo') {
    return 0;
  }
  return Math.min(54, Math.max(48, base));
};

const formatDisplayedValue = (key: string, value: number, locked: boolean): number => {
  if (locked) {
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
    return value * 10;
  }
  if (['health', 'intrigue', 'appearance', 'temperament'].includes(key)) {
    return value * 100;
  }
  return value * 10;
};

export function AttributeAssignmentView() {
  const { state, selectedRoute, patchState, setAttributeValue, setCurrentView, setScene } = useGameFlowStore();

  const locked = Boolean(selectedRoute?.statsLocked);
  const pointsLeftDisplay = useMemo(() => {
    if (locked) {
      return '已固定';
    }
    const numericValue = Math.round(((state.pointsLeft ?? 0) + Number.EPSILON) * 100) / 100;
    return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }, [locked, state.pointsLeft]);
  const displayedFields = useMemo(() => {
    return attributeFields.map((field) => ({
      ...field,
      current: state.stats[field.key] ?? field.value,
      displayValue: formatDisplayedValue(field.key, state.stats[field.key] ?? field.value, locked),
      max:
        field.key === 'politics'
          ? selectedRoute?.id === 'lanyinxuguo' || selectedRoute?.id === 'chenyuansucuo'
            ? 4
            : 2
          : field.max,
    }));
  }, [locked, selectedRoute?.id, state.stats]);

  const randomizeAge = () => patchState({ age: randomInt(15, 23) });

  const randomizeFamily = () => {
    const options = selectedRoute?.familyOptions ?? [state.family];
    const family = options[randomInt(0, options.length - 1)];
    const pointsTotal = resolveBudgetByFamily(selectedRoute?.id ?? state.routeId, family);
    const baseStats = Object.fromEntries(attributeFields.map((field) => [field.key, field.min]));
    patchState({
      family,
      pointsTotal,
      pointsLeft: pointsTotal,
      stats: baseStats,
    });
  };

  const autoAssign = () => {
    if (locked) {
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
    if (locked) {
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
          <aside className="attribute-assignment__portrait-panel">
            {selectedRoute ? <img src={selectedRoute.portrait} alt={selectedRoute.label} /> : null}
            <button
              type="button"
              className="attribute-assignment__confirm"
              onClick={() => {
                setScene('briefing');
                setCurrentView('opening-dialogue');
              }}
              aria-label="确认进入剧情"
              title="确认"
            >
              <img src="/assets/routes/buttons/confirm.png" alt="确认" />
            </button>
          </aside>

          <section className="attribute-assignment__panel">
            <div className="attribute-assignment__topbar">
              <div>
                剩余点数：{pointsLeftDisplay}
              </div>
              <button type="button" className="attribute-assignment__random" onClick={autoAssign}>
                <span className="attribute-assignment__random-bg" />
                <span className="attribute-assignment__random-text" />
              </button>
            </div>

            <div className="attribute-assignment__identity">
              <label className="attribute-assignment__identity-field">
                <span>姓名</span>
                <input value={state.name} onChange={(event) => patchState({ name: event.target.value })} />
              </label>
              <label className="attribute-assignment__identity-field attribute-assignment__identity-field--age">
                <span>年龄</span>
                <div className="attribute-assignment__inline">
                  <input className="attribute-assignment__input--compact" value={state.age} readOnly />
                  <button type="button" onClick={randomizeAge}>
                    <span className="attribute-assignment__tiny-random" aria-hidden="true" />
                    <span className="visually-hidden">随机</span>
                  </button>
                </div>
              </label>
              <label className="attribute-assignment__identity-field attribute-assignment__identity-field--family">
                <span>家世</span>
                <div className="attribute-assignment__inline">
                  <input value={state.family} readOnly />
                  <button type="button" onClick={randomizeFamily} disabled={(selectedRoute?.familyOptions?.length ?? 0) <= 1}>
                    <span className="attribute-assignment__tiny-random" aria-hidden="true" />
                    <span className="visually-hidden">随机</span>
                  </button>
                </div>
              </label>
            </div>

            <div className="attribute-assignment__grid">
              {displayedFields.map((field) => (
                <div key={field.key} className="attribute-assignment__item">
                  <span>{field.label}</span>
                  <div className="attribute-assignment__stepper">
                    <button type="button" onClick={() => adjust(field.key, -1, field.min, field.max)} disabled={locked}>
                      -
                    </button>
                    <strong>{field.displayValue}</strong>
                    <button type="button" onClick={() => adjust(field.key, 1, field.min, field.max)} disabled={locked}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <button
          type="button"
          className="attribute-assignment__back"
          onClick={() => setCurrentView('route-selection')}
          aria-label="返回路线选择"
          title="返回"
        >
          <img src="/assets/routes/buttons/back.png" alt="返回" />
        </button>
      </div>
    </main>
  );
}
