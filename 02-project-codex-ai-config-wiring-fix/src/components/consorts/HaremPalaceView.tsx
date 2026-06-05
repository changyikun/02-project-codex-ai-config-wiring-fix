import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ConsortAudiencePanel } from './ConsortAudiencePanel';
import { HAREM_PALACES, type HaremPalaceId } from '../../config/haremPalaces';
import {
  CONSORT_AUDIENCE_BACKGROUND,
  HAREM_OUTSIDE_BACKGROUND,
  HAREM_OVERVIEW_BACKGROUND,
} from '../../config/locationSceneBackgrounds';
import {
  canStartConsortVisit,
  CONSORT_VISIT_STAMINA_BLOCK_TEXT,
  CONSORT_VISIT_STAMINA_COST,
} from '../../game/lib/consortVisitRuntime';
import { getNpcVisitAtResidence, isNpcAtOwnResidence } from '../../game/lib/npcActivityRuntime';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { ConcubineProfile } from '../../game/types';
import { useLocationActionFlow, type TimedLocationActionOutcome } from '../chamber/useLocationActionFlow';

interface HaremPalaceViewProps {
  concubines: ConcubineProfile[];
  playerResidenceName: string;
  playerName: string;
  playerRankLabel: string;
}

interface HallOccupancy {
  hallId: string;
  residence: string;
  residents: ConcubineProfile[];
  presentResidents: ConcubineProfile[];
  awayResidents: ConcubineProfile[];
  hasPlayerResident: boolean;
}

const matchesHallResidence = (residence: string, palaceLabel: string, hallSuffix: string): boolean => {
  const normalizedResidence = String(residence ?? '').trim().replace(/^旧居/, '').trim();
  if (normalizedResidence.length === 0) {
    return false;
  }

  if (normalizedResidence === palaceLabel) {
    return hallSuffix === '主殿';
  }

  return normalizedResidence === `${palaceLabel}${hallSuffix}`;
};

const getResidencePresenceLabel = (
  npcActivity: ReturnType<typeof useGameFlowStore.getState>['npcActivity'],
  residentId: string,
): string => {
  if (getNpcVisitAtResidence(npcActivity, residentId)) {
    return '（会客中）';
  }
  if (!isNpcAtOwnResidence(npcActivity, residentId)) {
    return '（外出）';
  }
  return '';
};

export function HaremPalaceView({ concubines, playerResidenceName, playerName, playerRankLabel }: HaremPalaceViewProps) {
  const { state, npcActivity, resolveNpcActivityEntry, enterMainChamber } = useGameFlowStore();
  const { beginTimedLocationAction, finishTimedLocationAction } = useLocationActionFlow();
  const [selectedPalaceId, setSelectedPalaceId] = useState<HaremPalaceId | null>(null);
  const [selectedHallId, setSelectedHallId] = useState<string | null>(null);
  const [activeResidentId, setActiveResidentId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [pendingVisitOutcome, setPendingVisitOutcome] = useState<TimedLocationActionOutcome | null>(null);

  const selectedPalace = useMemo(
    () => HAREM_PALACES.find((palace) => palace.id === selectedPalaceId) ?? null,
    [selectedPalaceId],
  );

  const selectedHall = useMemo(
    () => selectedPalace?.halls.find((hall) => hall.id === selectedHallId) ?? null,
    [selectedHallId, selectedPalace],
  );

  const panelStyle = useMemo<CSSProperties>(
    () => ({
      backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.08)), url("${
        activeResidentId
          ? CONSORT_AUDIENCE_BACKGROUND
          : selectedPalace
            ? HAREM_OVERVIEW_BACKGROUND
            : HAREM_OUTSIDE_BACKGROUND
      }")`,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
    }),
    [activeResidentId, selectedPalace],
  );

  useEffect(() => {
    setSelectedHallId(null);
    setActionNote('');
  }, [selectedPalaceId]);

  const startConsortAudience = (consortId: string) => {
    if (!canStartConsortVisit(state.stamina)) {
      setActionNote(CONSORT_VISIT_STAMINA_BLOCK_TEXT);
      setActiveResidentId(null);
      return;
    }

    const outcome = beginTimedLocationAction({ staminaCost: CONSORT_VISIT_STAMINA_COST });
    setActionNote('');
    setPendingVisitOutcome(outcome);
    setActiveResidentId(consortId);
  };

  const returnToPlayerResidence = () => {
    setActionNote('');
    setActiveResidentId(null);
    setPendingVisitOutcome(null);
    enterMainChamber();
  };

  const hallOccupancy = useMemo<HallOccupancy[]>(() => {
    if (!selectedPalace) {
      return [];
    }

    return selectedPalace.halls.map((hall) => {
      const residence = `${selectedPalace.label}${hall.suffix}`;
      const residents = concubines.filter(
        (concubine) => concubine.status === 'live' && matchesHallResidence(concubine.residence, selectedPalace.label, hall.suffix),
      );
      const presentResidents = residents.filter((resident) => isNpcAtOwnResidence(npcActivity, resident.id));
      const awayResidents = residents.filter((resident) => !isNpcAtOwnResidence(npcActivity, resident.id));

      return {
        hallId: hall.id,
        residence,
        residents,
        presentResidents,
        awayResidents,
        hasPlayerResident: matchesHallResidence(playerResidenceName, selectedPalace.label, hall.suffix),
      };
    });
  }, [concubines, npcActivity, playerResidenceName, selectedPalace]);

  const selectedHallOccupancy = useMemo(
    () => hallOccupancy.find((entry) => entry.hallId === selectedHallId) ?? null,
    [hallOccupancy, selectedHallId],
  );

  const activeResident = useMemo(
    () => concubines.find((consort) => consort.id === activeResidentId) ?? null,
    [activeResidentId, concubines],
  );

  const selectedHallVisits = useMemo(
    () =>
      (selectedHallOccupancy?.residents ?? [])
        .map((resident) => {
          const visit = getNpcVisitAtResidence(npcActivity, resident.id);
          const visitor = visit ? concubines.find((consort) => consort.id === visit.actorConsortId) : undefined;
          return visit && visitor ? { resident, visitor, visit } : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [concubines, npcActivity, selectedHallOccupancy],
  );

  const footerCopy = selectedHall
    ? selectedHallOccupancy && (selectedHallOccupancy.residents.length > 0 || selectedHallOccupancy.hasPlayerResident)
      ? `当前查看：${selectedHall.suffix}。现居：${[
          selectedHallOccupancy.hasPlayerResident ? `${playerRankLabel} ${playerName}（居此）` : null,
          ...selectedHallOccupancy.residents.map(
            (resident) => `${resident.rankLabel} ${resident.name}${getResidencePresenceLabel(npcActivity, resident.id)}`,
          ),
        ]
          .filter((entry): entry is string => Boolean(entry))
          .join('、')}。`
      : `当前查看：${selectedHall.suffix}。此殿当前暂无妃嫔入住。`
    : selectedPalace
      ? '该宫现展示为一主殿、二侧殿、三偏殿布局。'
      : '点击任一宫殿，可进入该宫的一主殿、二侧殿、三偏殿布局。';

  const renderHallButton = (hall: (typeof HAREM_PALACES)[number]['halls'][number]) => {
    const occupancy = hallOccupancy.find((entry) => entry.hallId === hall.id);
    const hasResidents = Boolean(occupancy && (occupancy.residents.length > 0 || occupancy.hasPlayerResident));
    const singleResident = occupancy?.presentResidents.length === 1 ? occupancy.presentResidents[0] : null;

    return (
      <button
        key={hall.id}
        type="button"
        className={`harem-palace-view__hall-button ${selectedHallId === hall.id ? 'is-active' : ''} ${hasResidents ? 'is-occupied' : ''}`}
        onClick={() => {
          setSelectedHallId(hall.id);
          setActionNote('');
          setActiveResidentId(null);
          if (!singleResident) {
            return;
          }
          if (!getNpcVisitAtResidence(npcActivity, singleResident.id)) {
            startConsortAudience(singleResident.id);
          }
        }}
      >
        <strong>{hall.suffix}</strong>
        <div className="harem-palace-view__hall-residents">
          {occupancy?.hasPlayerResident ? (
            <span className="harem-palace-view__hall-resident">
              {playerRankLabel} {playerName}
            </span>
          ) : null}
          {hasResidents ? (
            occupancy?.residents.map((resident) => (
              <span
                key={resident.id}
                className={`harem-palace-view__hall-resident ${isNpcAtOwnResidence(npcActivity, resident.id) ? '' : 'is-away'} ${
                  getNpcVisitAtResidence(npcActivity, resident.id) ? 'is-hosting' : ''
                }`}
              >
                {resident.rankLabel} {resident.name}
                {getResidencePresenceLabel(npcActivity, resident.id)}
              </span>
            ))
          ) : null}
          {!hasResidents ? (
            <span className="harem-palace-view__hall-empty">暂无妃嫔</span>
          ) : null}
        </div>
      </button>
    );
  };

  return (
    <section className="harem-palace-view" style={panelStyle} aria-label="后宫宫殿总览">
      <div className="harem-palace-view__veil" aria-hidden="true" />

      {selectedPalace && !activeResident ? (
        <header className="harem-palace-view__header harem-palace-view__header--detail">
          <div className="harem-palace-view__heading">
            <span>宫内分布</span>
            <h2>{selectedPalace.label}</h2>
            <p>一主殿、二侧殿、三偏殿</p>
          </div>

          <div className="harem-palace-view__header-actions">
            <button type="button" className="harem-palace-view__utility-button" onClick={() => setSelectedPalaceId(null)}>
              返回宫苑
            </button>
          </div>
        </header>
      ) : (
        <header className="harem-palace-view__header harem-palace-view__header--overview" aria-hidden="true" />
      )}

      {selectedPalace && activeResident && selectedHall ? (
        <ConsortAudiencePanel
          consort={activeResident}
          palaceLabel={selectedPalace.label}
          hallLabel={selectedHall.suffix}
          concubines={concubines}
          onBack={() => {
            const activeResidenceVisit = activeResident ? getNpcVisitAtResidence(npcActivity, activeResident.id) : undefined;
            if (activeResidenceVisit) {
              resolveNpcActivityEntry(activeResidenceVisit.id);
            }
            setActiveResidentId(null);
            if (finishTimedLocationAction(pendingVisitOutcome)) {
              setPendingVisitOutcome(null);
              return;
            }
            setPendingVisitOutcome(null);
          }}
        />
      ) : selectedPalace ? (
        <div className="harem-palace-view__hall-layout" aria-label={`${selectedPalace.label} 殿位布局`}>
          <div className="harem-palace-view__hall-row harem-palace-view__hall-row--main">
            {selectedPalace.halls.slice(0, 1).map(renderHallButton)}
          </div>

          <div className="harem-palace-view__hall-row harem-palace-view__hall-row--side">
            {selectedPalace.halls.slice(1, 3).map(renderHallButton)}
          </div>

          <div className="harem-palace-view__hall-row harem-palace-view__hall-row--wing">
            {selectedPalace.halls.slice(3).map(renderHallButton)}
          </div>

          {selectedHallOccupancy && selectedHallOccupancy.presentResidents.length > 0 ? (
            <section className="harem-palace-view__resident-actions" aria-label={`${selectedHall?.suffix ?? '殿位'}可拜访妃嫔`}>
              {selectedHallOccupancy.presentResidents.map((resident) => (
                <button
                  key={resident.id}
                  type="button"
                  className="harem-palace-view__utility-button"
                  onClick={() => startConsortAudience(resident.id)}
                >
                  {`拜访 ${resident.rankLabel} ${resident.name}${
                    getNpcVisitAtResidence(npcActivity, resident.id) ? '（会客中）' : ''
                  }`}
                </button>
              ))}
            </section>
          ) : null}

          {selectedHallOccupancy?.hasPlayerResident ? (
            <section className="harem-palace-view__resident-actions" aria-label={`${selectedHall?.suffix ?? '殿位'}玩家寝殿`}>
              <button type="button" className="harem-palace-view__utility-button" onClick={returnToPlayerResidence}>
                {`回到${playerResidenceName}`}
              </button>
            </section>
          ) : null}

          {selectedHallOccupancy && selectedHallOccupancy.awayResidents.length > 0 ? (
            <section className="harem-palace-view__resident-actions" aria-label={`${selectedHall?.suffix ?? '殿位'}外出妃嫔`}>
              {selectedHallOccupancy.awayResidents.map((resident) => (
                <p key={resident.id}>{`${resident.rankLabel} ${resident.name}本旬不在殿内。`}</p>
              ))}
            </section>
          ) : null}

          {selectedHallVisits.length > 0 ? (
            <section className="harem-palace-view__resident-actions" aria-label={`${selectedHall?.suffix ?? '殿位'}同场拜访`}>
              {selectedHallVisits.map(({ resident, visitor, visit }) => (
                <p key={visit.id}>
                  {`${visitor.rankLabel} ${visitor.name}正在殿中拜访${resident.rankLabel} ${resident.name}。${visit.summary}`}
                </p>
              ))}
            </section>
          ) : null}

          <button
            type="button"
            className="harem-palace-view__detail-return"
            onClick={() => setSelectedPalaceId(null)}
          >
            返回
          </button>
        </div>
      ) : (
        <div className="harem-palace-view__grid harem-palace-view__grid--overview" aria-label="十二宫按钮">
          {HAREM_PALACES.map((palace) => (
            <button
              key={palace.id}
              type="button"
              className="harem-palace-view__palace-button"
              onClick={() => setSelectedPalaceId(palace.id)}
            >
              <span>{palace.label}</span>
            </button>
          ))}
        </div>
      )}

      {!activeResident ? (
        <footer className="harem-palace-view__footer">
          <p>{actionNote || footerCopy}</p>
        </footer>
      ) : null}
    </section>
  );
}
