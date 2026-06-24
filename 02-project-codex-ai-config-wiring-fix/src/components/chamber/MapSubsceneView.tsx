import { type ReactNode, useMemo, useRef } from 'react';

export type SubsceneNpcKind = 'fixed' | 'consort' | 'emperor' | 'dowager' | 'visitor';

export interface SubsceneNpcEntry {
  id: string;
  kind: SubsceneNpcKind;
  name: string;
  identityLabel: string;
  ariaLabel?: string;
  portraitSrc?: string;
  portrait?: ReactNode;
  interactableState?: 'available' | 'disabled' | 'spent';
  disabledReason?: string;
  onClick?: () => void;
}

export interface SubsceneActionEntry {
  id: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

interface MapSubsceneViewProps {
  locationId: string;
  ariaLabel?: string;
  npcStageLabel?: string;
  npcs?: SubsceneNpcEntry[];
  actions?: SubsceneActionEntry[];
  busy?: boolean;
  leaveLabel?: string;
  onLeave: () => void;
  children?: ReactNode;
}

const MAX_SCENE_NPCS = 6;

export function MapSubsceneView({
  locationId,
  ariaLabel,
  npcStageLabel,
  npcs = [],
  actions = [],
  busy = false,
  leaveLabel = '离开',
  onLeave,
  children,
}: MapSubsceneViewProps) {
  const slotByNpcIdRef = useRef<Record<string, number>>({});
  const placementLocationRef = useRef(locationId);

  const visibleNpcs = useMemo(() => {
    if (placementLocationRef.current !== locationId) {
      slotByNpcIdRef.current = {};
      placementLocationRef.current = locationId;
    }

    const slotByNpcId = slotByNpcIdRef.current;
    const occupiedSlots = new Set(Object.values(slotByNpcId));

    for (const npc of npcs) {
      if (slotByNpcId[npc.id] != null) {
        continue;
      }

      const nextSlot = Array.from({ length: MAX_SCENE_NPCS }, (_, index) => index).find((slot) => !occupiedSlots.has(slot));
      if (nextSlot == null) {
        continue;
      }
      slotByNpcId[npc.id] = nextSlot;
      occupiedSlots.add(nextSlot);
    }

    return npcs
      .filter((npc) => slotByNpcId[npc.id] != null)
      .slice(0, MAX_SCENE_NPCS)
      .map((npc) => ({
        ...npc,
        slotIndex: slotByNpcId[npc.id],
      }))
      .sort((left, right) => left.slotIndex - right.slotIndex);
  }, [locationId, npcs]);

  return (
    <section className="map-subscene-view" aria-label={ariaLabel ?? `${locationId}场景`}>
      <div className="map-subscene-view__npc-stage" aria-label={npcStageLabel ?? `${locationId}在场人物`}>
        {visibleNpcs.map((npc) => {
          const disabled = busy || npc.interactableState === 'disabled' || npc.interactableState === 'spent' || !npc.onClick;
          const displayName = npc.identityLabel ? `${npc.identityLabel}·${npc.name}` : npc.name;
          const slotColumnStart = (npc.slotIndex % 3) + 1;
          const slotRowStart = 2 - Math.floor(npc.slotIndex / 3);
          const className = [
            'map-subscene-view__npc-standee',
            disabled ? 'map-subscene-view__npc-standee--disabled' : '',
            npc.interactableState === 'spent' ? 'map-subscene-view__npc-standee--spent' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={npc.id}
              type="button"
              className={className}
              style={{ gridColumnStart: slotColumnStart, gridRowStart: slotRowStart }}
              aria-label={npc.ariaLabel ?? npc.name}
              title={npc.disabledReason}
              disabled={disabled}
              onClick={npc.onClick}
            >
              <span className="map-subscene-view__npc-portrait" aria-hidden="true">
                {npc.portrait ??
                  (npc.portraitSrc ? (
                    <img src={npc.portraitSrc} alt="" />
                  ) : (
                    <span className="map-subscene-view__npc-placeholder">{npc.name.slice(0, 1)}</span>
                  ))}
              </span>
              <span className="map-subscene-view__npc-name">{displayName}</span>
            </button>
          );
        })}
      </div>

      <aside className="map-subscene-view__actions" aria-label={`${locationId}互动`}>
        <div className="map-subscene-view__action-list">
          {actions.map((action) => (
            <button key={action.id} type="button" onClick={action.onClick} disabled={busy || action.disabled}>
              {action.label}
            </button>
          ))}
        </div>
        <button type="button" className="map-subscene-view__leave" onClick={onLeave} disabled={busy}>
          {leaveLabel}
        </button>
      </aside>

      {children}
    </section>
  );
}
