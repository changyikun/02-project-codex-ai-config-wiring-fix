import { useEffect, useRef, useState } from 'react';
import { attributeFields } from '../../game/data/config';
import { type GameFlowStore, useGameFlowStore } from '../../game/store/gameFlowStore';
import type { ConcubineProfile, ConcubineStats, GameNumericsState, InventoryItem, NumericFeedbackBucket } from '../../game/types';

interface NumericChangeToast {
  id: string;
  change: string;
}

type NumericSnapshot = Record<string, { label: string; value: number; trackMissingAsZero?: boolean }>;

interface QueuedNumericChange {
  change: string;
  bucket: NumericFeedbackBucket;
}

interface NumericChangeLine {
  key: string;
  change: string;
}

const TOAST_VISIBLE_MS = 3600;
const MAX_VISIBLE_TOASTS = 10;

const primaryMetricLabels: Partial<Record<keyof GameNumericsState, string>> = {
  silver: '银两',
  prestige: '声望',
  stress: '压力',
  trueHeart: '真心',
};

const statDisplayScale: Record<string, number> = {
  health: 100,
  fortune: 10,
  intrigue: 100,
  appearance: 100,
  temperament: 100,
  poetry: 10,
  talent: 10,
  painting: 10,
  embroidery: 10,
  medicine: 10,
  politics: 10,
};

const consortMetrics: Array<{ key: keyof Pick<ConcubineStats, 'prestige' | 'stress'>; label: string }> = [
  { key: 'prestige', label: '声望' },
  { key: 'stress', label: '压力' },
];

const normalizeDisplayNumber = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const formatDelta = (delta: number): string => {
  const normalized = normalizeDisplayNumber(delta);
  return `${normalized > 0 ? '+' : ''}${Number.isInteger(normalized) ? normalized : normalized.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`;
};

const getConsortLabel = (consort: ConcubineProfile): string => `${consort.rankLabel}${consort.name}`;

const addConsortSnapshot = (snapshot: NumericSnapshot, consorts: ConcubineProfile[], source: string) => {
  consorts.forEach((consort) => {
    consortMetrics.forEach(({ key, label }) => {
      const value = consort.stats[key];
      snapshot[`${source}.${consort.id}.${key}`] = {
        label: `${getConsortLabel(consort)}${label}`,
        value: normalizeDisplayNumber(value),
      };
    });
  });
};

const addInventorySnapshot = (snapshot: NumericSnapshot, inventory: InventoryItem[]) => {
  inventory.forEach((item) => {
    snapshot[`inventory.${item.itemId}`] = {
      label: item.name,
      value: normalizeDisplayNumber(item.quantity),
      trackMissingAsZero: true,
    };
  });
};

const buildNumericSnapshot = (
  state: GameNumericsState,
  concubines: ConcubineProfile[],
  customConsorts: ConcubineProfile[],
  inventory: InventoryItem[],
): NumericSnapshot => {
  const snapshot: NumericSnapshot = {};

  Object.entries(primaryMetricLabels).forEach(([key, label]) => {
    snapshot[key] = {
      label,
      value: normalizeDisplayNumber(Number(state[key as keyof GameNumericsState] ?? 0)),
    };
  });

  attributeFields.forEach((field) => {
    const scale = statDisplayScale[field.key] ?? 1;
    snapshot[`stats.${field.key}`] = {
      label: field.label,
      value: normalizeDisplayNumber(Number(state.stats[field.key] ?? 0) * scale),
    };
  });

  addConsortSnapshot(snapshot, concubines, 'consorts');
  addConsortSnapshot(snapshot, customConsorts, 'customConsorts');
  addInventorySnapshot(snapshot, inventory);

  return snapshot;
};

const buildChangeLines = (previous: NumericSnapshot, next: NumericSnapshot): NumericChangeLine[] =>
  Array.from(new Set([...Object.keys(previous), ...Object.keys(next)])).flatMap((key) => {
    const entry = next[key];
    const previousEntry = previous[key];
    if (!entry || !previousEntry) {
      if (!(entry?.trackMissingAsZero || previousEntry?.trackMissingAsZero)) {
        return [];
      }
    }

    const nextValue = entry?.value ?? 0;
    const previousValue = previousEntry?.value ?? 0;
    const delta = normalizeDisplayNumber(nextValue - previousValue);
    if (delta === 0) {
      return [];
    }

    const label = entry?.label ?? previousEntry?.label ?? key;

    return {
      key,
      change: `${label} ${formatDelta(delta)}`,
    };
  });

const shouldTrackNumericToast = (currentView: string): boolean => currentView === 'map-main' || currentView === 'bedchamber';

const classifyNumericFeedbackBucket = (store: GameFlowStore, change: NumericChangeLine): NumericFeedbackBucket => {
  if (store.currentView === 'map-main') {
    return 'map-event';
  }

  if (store.currentView === 'bedchamber') {
    if (store.nightlyService.pendingNotice?.outcome === 'other-consort-service') {
      return 'settlement';
    }

    if (store.nightlyService.pendingNotice?.outcome === 'other-consort-companion' && change.key === 'favor') {
      return 'settlement';
    }

    if (store.nightlyService.pendingEvent || store.nightlyService.pendingNotice) {
      return 'nightly-service';
    }

    if (store.latestSettlementReportId && store.latestSettlementReportId !== store.lastSeenSettlementReportId) {
      return 'settlement';
    }
  }

  return 'chamber-action';
};

const buildSnapshotFromStore = (store: GameFlowStore): NumericSnapshot =>
  buildNumericSnapshot(store.state, store.concubines, store.customConsorts, store.inventory);

export function NumericChangeToastLayer() {
  const numericFeedbackSignal = useGameFlowStore((store) => store.numericFeedbackSignal);
  const previousSnapshotRef = useRef<NumericSnapshot | null>(null);
  const queuedChangesRef = useRef<QueuedNumericChange[]>([]);
  const toastSequenceRef = useRef(0);
  const toastTimersRef = useRef<Record<string, number>>({});
  const [toasts, setToasts] = useState<NumericChangeToast[]>([]);

  const clearVisibleToasts = () => {
    Object.values(toastTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    toastTimersRef.current = {};
    setToasts((current) => (current.length === 0 ? current : []));
  };

  const pushVisibleToasts = (changes: string[]) => {
    if (changes.length === 0) {
      return;
    }

    const nextToasts = changes.map((change) => {
      const id = `numeric-toast-${Date.now()}-${toastSequenceRef.current}`;
      toastSequenceRef.current += 1;
      return { id, change };
    });

    setToasts((current) => [...current, ...nextToasts].slice(-MAX_VISIBLE_TOASTS));

    nextToasts.forEach((toast) => {
      toastTimersRef.current[toast.id] = window.setTimeout(() => {
        setToasts((current) => current.filter((currentToast) => currentToast.id !== toast.id));
        delete toastTimersRef.current[toast.id];
      }, TOAST_VISIBLE_MS);
    });
  };

  useEffect(() => {
    previousSnapshotRef.current = buildSnapshotFromStore(useGameFlowStore.getState());

    const unsubscribe = useGameFlowStore.subscribe((nextStore) => {
      const nextSnapshot = buildSnapshotFromStore(nextStore);
      const previousSnapshot = previousSnapshotRef.current;
      previousSnapshotRef.current = nextSnapshot;

      if (!previousSnapshot) {
        return;
      }

      if (!shouldTrackNumericToast(nextStore.currentView)) {
        queuedChangesRef.current = [];
        clearVisibleToasts();
        return;
      }

      const changes = buildChangeLines(previousSnapshot, nextSnapshot);
      if (changes.length === 0) {
        return;
      }

      queuedChangesRef.current = [
        ...queuedChangesRef.current,
        ...changes.map((change) => ({
          change: change.change,
          bucket: classifyNumericFeedbackBucket(nextStore, change),
        })),
      ].slice(-MAX_VISIBLE_TOASTS * 2);
    });

    return () => {
      unsubscribe();
      queuedChangesRef.current = [];
      clearVisibleToasts();
    };
  }, []);

  useEffect(() => {
    const bucket = numericFeedbackSignal.bucket;
    const matchingChanges = queuedChangesRef.current.filter((entry) => entry.bucket === bucket).map((entry) => entry.change);
    if (matchingChanges.length === 0) {
      return;
    }

    queuedChangesRef.current = queuedChangesRef.current.filter((entry) => entry.bucket !== bucket);
    pushVisibleToasts(matchingChanges);
  }, [numericFeedbackSignal]);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <aside className="numeric-change-toast-layer" aria-label="数值变化提示" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="numeric-change-toast" role="status">
          <span>{toast.change}</span>
        </div>
      ))}
    </aside>
  );
}
