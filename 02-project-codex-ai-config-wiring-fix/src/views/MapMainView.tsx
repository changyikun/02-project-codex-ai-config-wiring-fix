import { useEffect, useMemo, useState } from 'react';
import { AffairsPanelView, BondPanelView, ChroniclePanelView } from '../components/chamber/ChamberUtilityViews';
import { GlobalDialogueStage } from '../components/dialogue/GlobalDialogueStage';
import { PalaceStatusBar } from '../components/status/PalaceStatusBar';
import { ConcubineListView } from '../components/consorts/ConcubineListView';
import { HaremPalaceView } from '../components/consorts/HaremPalaceView';
import { PlayerStatsView } from '../components/status/PlayerStatsView';
import type { ChamberPanelId } from '../config/bedchamber';
import { HAREM_OUTSIDE_BACKGROUND, LOCATION_SCENE_BACKGROUNDS } from '../config/locationSceneBackgrounds';
import { buildMapHotspots, MAP_SIDEBAR_BUTTONS, resolveMapBackgroundImage, type MapHotspotConfig } from '../config/palaceUi';
import { buildInitialBondProfile } from '../game/data/bondPresets';
import { getConcubinePortraitPath } from '../game/data/concubineRoster';
import { buildMapTransitionNarrative } from '../game/lib/actionNarrativeRuntime';
import { isJiaojiaoSpokenText } from '../game/lib/dialoguePresentation';
import { canAccessHotSpringByPrestige } from '../game/lib/rankRuntime';
import {
  applyYingluoyetingStoryChoice,
  resolveYingluoyetingMapEvent,
  YINGLUOYETING_EVENT_IDS,
  YINGLUOYETING_STORY_FLAGS,
  type YingluoyetingMapEvent,
} from '../game/lib/yingluoyetingStoryRuntime';
import { useGameFlowStore } from '../game/store/gameFlowStore';
import { renderNarrativeEntry } from '../game/narrative/narrativeCatalog';
import { narrativeEntryToPresentation } from '../game/narrative/narrativeDialogueAdapter';

const MAP_GUIDE_LINE_IDS = ['map.guide.line1', 'map.guide.line2'] as const;
const EUNUCH_PORTRAIT_SRC = '/assets/characters/men/taijian.png';
type MapUtilityPanelId = Extract<ChamberPanelId, 'consorts' | 'stats' | 'chronicle' | 'bond' | 'harem' | 'affairs'>;
const ASSISTANT_PORTRAIT_SRC = '/assets/characters/women/jiaojiao.png';
const CHEN_WANNING_PORTRAIT_SRC = getConcubinePortraitPath('陈婉宁');

const resolveYingluoyetingEventPortrait = (event: YingluoyetingMapEvent, isResult: boolean) => {
  if (isResult) {
    return undefined;
  }

  if (event.speakerName === '陈婉宁') {
    return (
      <img
        src={CHEN_WANNING_PORTRAIT_SRC}
        alt="陈婉宁"
        className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--consort"
      />
    );
  }

  return <div className="global-dialogue-stage__portrait-placeholder">{event.speakerName}</div>;
};

const resolveYingluoyetingEventPortraitLabel = (event: YingluoyetingMapEvent, isResult: boolean): string => {
  if (isResult) {
    return `${event.speakerName}剪影`;
  }

  return event.speakerName === '陈婉宁' ? '陈婉宁立绘' : `${event.speakerName}剪影`;
};

export function MapMainView() {
  const {
    state,
    hiddenStats,
    time,
    selectedRoute,
    inventory,
    concubines,
    bondProfile,
    mapEventText,
    activeAffairsSource,
    settlementReports,
    latestSettlementReportId,
    lastSeenSettlementReportId,
    openChamberPanel,
    setMapEventText,
    patchState,
    enterMainChamber,
    grantInventoryItem,
    patchConcubineById,
    acknowledgeSettlementReport,
  } = useGameFlowStore();
  const [guideStep, setGuideStep] = useState(0);
  const [selectedHotspotId, setSelectedHotspotId] = useState<MapHotspotConfig['id'] | null>(null);
  const [activeYingluoyetingEvent, setActiveYingluoyetingEvent] = useState<YingluoyetingMapEvent | null>(null);
  const [activeYingluoyetingEventReturnMode, setActiveYingluoyetingEventReturnMode] =
    useState<'return-residence' | null>(null);
  const [pendingYingluoyetingEventAfterFirstMeet, setPendingYingluoyetingEventAfterFirstMeet] =
    useState<YingluoyetingMapEvent | null>(null);
  const [yingluoyetingResultText, setYingluoyetingResultText] = useState('');
  const [yingluoyetingResultHint, setYingluoyetingResultHint] = useState('');
  const [activeMapUtilityPanel, setActiveMapUtilityPanel] = useState<MapUtilityPanelId | null>(null);
  const guideActive = !state.flags.mapGuideFinished;
  const openingHaremFirstMeetPending = Boolean(
    state.routeId === 'yingluoyeting' && state.flags[YINGLUOYETING_STORY_FLAGS.openingHaremFirstMeetPending],
  );
  const mapHotspots = useMemo(() => buildMapHotspots(state.residenceName), [state.residenceName]);

  const selectedHotspot = useMemo(
    () => mapHotspots.find((hotspot) => hotspot.id === selectedHotspotId) ?? null,
    [mapHotspots, selectedHotspotId],
  );
  const currentXunKey = `${time.year}-${time.month}-${time.xun}`;
  const activeBondProfile =
    bondProfile.routeId === state.routeId ? bondProfile : buildInitialBondProfile(state.routeId, currentXunKey);
  const closeMapUtilityPanel = () => setActiveMapUtilityPanel(null);
  const activeYingluoyetingBackground = activeYingluoyetingEvent
    ? activeYingluoyetingEvent.locationId === '后宫'
      ? HAREM_OUTSIDE_BACKGROUND
      : LOCATION_SCENE_BACKGROUNDS[activeYingluoyetingEvent.locationId]
    : undefined;
  const mapBackgroundImage = activeYingluoyetingBackground ?? resolveMapBackgroundImage(time.slot);
  const locationSceneActive = Boolean(activeYingluoyetingEvent);
  const activeYingluoyetingDialogueIsResult = Boolean(yingluoyetingResultText);
  const activeYingluoyetingDialogueIdentity = activeYingluoyetingDialogueIsResult
    ? '场景旁白'
    : activeYingluoyetingEvent?.speakerIdentity ?? '场景旁白';
  const activeYingluoyetingDialogueName = activeYingluoyetingDialogueIsResult
    ? activeYingluoyetingEvent?.locationId ?? '主线剧情'
    : activeYingluoyetingEvent?.speakerName ?? '主线剧情';
  const activeGuideEntry = guideActive ? renderNarrativeEntry(MAP_GUIDE_LINE_IDS[Math.min(guideStep, MAP_GUIDE_LINE_IDS.length - 1)]) : undefined;
  const activeGuidePresentation = activeGuideEntry ? narrativeEntryToPresentation(activeGuideEntry) : undefined;

  const dialogueText = useMemo(() => {
    if (guideActive) {
      return activeGuidePresentation?.text ?? '';
    }
    if (selectedHotspot) {
      return buildMapTransitionNarrative({
        kind: 'inspect-location',
        locationName: selectedHotspot.label,
        locationDescription: selectedHotspot.description,
      });
    }
    if (mapEventText) {
      return mapEventText;
    }
    return '';
  }, [activeGuidePresentation?.text, guideActive, mapEventText, selectedHotspot]);
  const latestSettlementReport = useMemo(() => {
    if (!latestSettlementReportId) {
      return undefined;
    }
    const latestIndex = settlementReports.findIndex((report) => report.id === latestSettlementReportId);
    if (latestIndex < 0) {
      return undefined;
    }
    const lastSeenIndex = lastSeenSettlementReportId
      ? settlementReports.findIndex((report) => report.id === lastSeenSettlementReportId)
      : -1;
    return settlementReports.slice(Math.max(0, lastSeenIndex + 1), latestIndex + 1)[0];
  }, [latestSettlementReportId, lastSeenSettlementReportId, settlementReports]);
  const latestSettlementReportIsPromotion = latestSettlementReport?.kind === 'promotion';
  const showSettlementReport = Boolean(
    latestSettlementReport &&
      latestSettlementReport.id !== lastSeenSettlementReportId &&
      (latestSettlementReportIsPromotion ||
        (!dialogueText &&
          !selectedHotspot &&
          !activeYingluoyetingEvent &&
          !activeMapUtilityPanel &&
          !locationSceneActive)),
  );
  const isJiaojiaoMapDialogue = activeGuidePresentation?.actorKey === 'jiaojiao' || isJiaojiaoSpokenText(dialogueText);
  const mapDialogueClassName = `global-dialogue-stage--map ${
    isJiaojiaoMapDialogue ? 'global-dialogue-stage--assistant' : 'global-dialogue-stage--narration'
  }`;
  const isMapDialogueBlocking = Boolean(
    (dialogueText && !selectedHotspot) || showSettlementReport || activeYingluoyetingEvent,
  );
  const isMapInteractionBlocked = Boolean(isMapDialogueBlocking || activeMapUtilityPanel);

  const resetYingluoyetingEvent = () => {
    setActiveYingluoyetingEvent(null);
    setActiveYingluoyetingEventReturnMode(null);
    setPendingYingluoyetingEventAfterFirstMeet(null);
    setYingluoyetingResultText('');
    setYingluoyetingResultHint('');
  };

  useEffect(() => {
    if (
      state.routeId !== 'yingluoyeting' ||
      !state.flags.mapGuideFinished ||
      !state.flags[YINGLUOYETING_STORY_FLAGS.openingHaremFirstMeetPending] ||
      activeYingluoyetingEvent ||
      yingluoyetingResultText
    ) {
      return;
    }

    const openingHaremEvent = resolveYingluoyetingMapEvent({
      state,
      time,
      locationId: '后宫',
      inventory,
    });

    setSelectedHotspotId(null);
    setMapEventText('');
    setActiveMapUtilityPanel(null);

    if (!openingHaremEvent) {
      patchState({
        flags: {
          ...state.flags,
          [YINGLUOYETING_STORY_FLAGS.openingHaremFirstMeetPending]: false,
        },
      });
      enterMainChamber();
      return;
    }

    setActiveYingluoyetingEvent(openingHaremEvent);
    setActiveYingluoyetingEventReturnMode('return-residence');
    setPendingYingluoyetingEventAfterFirstMeet(null);
    setYingluoyetingResultText('');
    setYingluoyetingResultHint('');
  }, [
    activeYingluoyetingEvent,
    enterMainChamber,
    inventory,
    patchState,
    setMapEventText,
    state,
    time,
    yingluoyetingResultText,
  ]);

  const finishGuide = () => {
    const shouldEnterOpeningHaremFirstMeet = Boolean(
      state.routeId === 'yingluoyeting' && state.flags[YINGLUOYETING_STORY_FLAGS.openingHaremFirstMeetPending],
    );
    patchState({
      flags: {
        ...state.flags,
        mapGuideFinished: true,
      },
    });
    setMapEventText('');
    setActiveMapUtilityPanel(null);
    if (shouldEnterOpeningHaremFirstMeet) {
      return;
    }
    enterMainChamber();
  };

  const handleSidebar = (buttonId: string) => {
    if (isMapDialogueBlocking) {
      return;
    }

    if (guideActive) {
      setMapEventText('先跟着娇娇把地图认熟，等回宫之后，再细看这些常驻入口。');
      return;
    }

    if (buttonId === 'return') {
      setActiveMapUtilityPanel(null);
      setMapEventText(buildMapTransitionNarrative({ kind: 'return-chamber', residenceName: state.residenceName }));
      enterMainChamber();
      return;
    }

    if (buttonId === 'consorts' || buttonId === 'stats' || buttonId === 'chronicle' || buttonId === 'bond') {
      setActiveMapUtilityPanel((current) => (current === buttonId ? null : buttonId));
      setSelectedHotspotId(null);
      setMapEventText('');
    }
  };

  const handleHotspot = (hotspotId: MapHotspotConfig['id']) => {
    if (isMapInteractionBlocked) {
      return;
    }

    if (guideActive) {
      setMapEventText('先把地图和入口认熟，待会儿回寝殿后，娘娘再随时外出。');
      return;
    }
    resetYingluoyetingEvent();
    if (hotspotId === state.residenceName) {
      setSelectedHotspotId(null);
      setMapEventText(buildMapTransitionNarrative({ kind: 'return-chamber', residenceName: state.residenceName }));
      enterMainChamber();
      return;
    }
    setSelectedHotspotId(hotspotId);
  };

  const handleEnterHotspot = () => {
    if (isMapInteractionBlocked) {
      return;
    }

    if (!selectedHotspot) return;

    if (selectedHotspot.id === state.residenceName) {
      setSelectedHotspotId(null);
      setMapEventText(buildMapTransitionNarrative({ kind: 'return-chamber', residenceName: state.residenceName }));
      enterMainChamber();
      return;
    }

    if (selectedHotspot.id === '华清池' && !canAccessHotSpringByPrestige(state.prestige)) {
      setSelectedHotspotId(null);
      setMapEventText('小主，华清池乃是容华及以上位分方可享用之地，咱们还是先请回吧。');
      return;
    }

    const yingluoyetingEvent = resolveYingluoyetingMapEvent({
      state,
      time,
      locationId: selectedHotspot.id,
      inventory,
    });
    if (yingluoyetingEvent) {
      const chenFirstMeetEvent =
        yingluoyetingEvent.eventId !== YINGLUOYETING_EVENT_IDS.chenFirstMeet &&
        yingluoyetingEvent.speakerName === '陈婉宁'
          ? resolveYingluoyetingMapEvent({
              state,
              time,
              locationId: '后宫',
              inventory,
            })
          : undefined;

      setSelectedHotspotId(null);
      setMapEventText('');
      setActiveYingluoyetingEvent(chenFirstMeetEvent ?? yingluoyetingEvent);
      setActiveYingluoyetingEventReturnMode(null);
      setPendingYingluoyetingEventAfterFirstMeet(chenFirstMeetEvent ? yingluoyetingEvent : null);
      setYingluoyetingResultText('');
      setYingluoyetingResultHint('');
      return;
    }

    const previousTime = time;
    setMapEventText('');

    setSelectedHotspotId(null);

    if (selectedHotspot.id === '后宫') {
      enterMainChamber('后宫', previousTime);
      openChamberPanel('harem');
      return;
    }

    if (selectedHotspot.id === state.residenceName) {
      enterMainChamber();
      return;
    }

    enterMainChamber(selectedHotspot.id, previousTime);
  };

  const applyConcubineRelationDeltas = (
    deltas: Array<{ consortName: string; relationToPlayerDelta: number }> | undefined,
  ) => {
    deltas?.forEach((delta) => {
      const targetConsort = concubines.find((consort) => consort.name === delta.consortName);
      if (!targetConsort) {
        return;
      }
      patchConcubineById(targetConsort.id, (consort) => ({
        ...consort,
        stats: {
          ...consort.stats,
          relationToPlayer: Math.max(-100, Math.min(100, consort.stats.relationToPlayer + delta.relationToPlayerDelta)),
        },
      }));
    });
  };

  const handleYingluoyetingChoice = (choiceId: string) => {
    if (!activeYingluoyetingEvent) {
      return;
    }
    const latestPlayerState = useGameFlowStore.getState().state;
    const result = applyYingluoyetingStoryChoice({
      eventId: activeYingluoyetingEvent.eventId,
      choiceId,
      state: latestPlayerState,
    });
    patchState({
      ...result.statePatch,
      stats: result.statePatch.stats ? { ...latestPlayerState.stats, ...result.statePatch.stats } : latestPlayerState.stats,
      flags: result.statePatch.flags ? { ...latestPlayerState.flags, ...result.statePatch.flags } : latestPlayerState.flags,
    });
    if (result.grantedItem) {
      grantInventoryItem(result.grantedItem);
    }
    applyConcubineRelationDeltas(result.concubineRelationDeltas);
    setYingluoyetingResultText(result.resultText);
    setYingluoyetingResultHint(result.resultHint ?? '');
  };

  const handleYingluoyetingNextAction = () => {
    if (
      activeYingluoyetingEvent?.eventId === YINGLUOYETING_EVENT_IDS.chenFirstMeet &&
      pendingYingluoyetingEventAfterFirstMeet
    ) {
      setActiveYingluoyetingEvent(pendingYingluoyetingEventAfterFirstMeet);
      setPendingYingluoyetingEventAfterFirstMeet(null);
      setYingluoyetingResultText('');
      setYingluoyetingResultHint('');
      return;
    }

    if (activeYingluoyetingEvent?.locationId === '后宫') {
      const shouldReturnToNewResidence =
        activeYingluoyetingEventReturnMode === 'return-residence' ||
        Boolean(useGameFlowStore.getState().state.flags[YINGLUOYETING_STORY_FLAGS.openingHaremFirstMeetPending]);
      resetYingluoyetingEvent();
      if (shouldReturnToNewResidence) {
        patchState({
          flags: {
            ...state.flags,
            [YINGLUOYETING_STORY_FLAGS.openingHaremFirstMeetPending]: false,
          },
        });
        enterMainChamber();
        return;
      }
      setActiveMapUtilityPanel('harem');
      return;
    }

    resetYingluoyetingEvent();
  };

  return (
    <main className="map-main palace-stage-shell">
      <div className="map-main__frame">
        <div
          className={`map-main__background ${locationSceneActive ? 'is-location-scene' : ''}`}
          style={{ backgroundImage: `url(${mapBackgroundImage})` }}
        />
        <PalaceStatusBar />

        <nav className="palace-sidebar palace-sidebar--map" aria-label="大地图常驻入口">
          {MAP_SIDEBAR_BUTTONS.map((button) => (
            <button
              key={button.id}
              type="button"
              className={`palace-sidebar__diamond ${activeMapUtilityPanel === button.id ? 'is-active' : ''}`}
              style={{ top: button.top }}
              onClick={() => handleSidebar(button.id)}
            >
              <span>{button.label}</span>
            </button>
          ))}
        </nav>

        {!locationSceneActive && !activeMapUtilityPanel ? (
          <section className="map-main__hotspot-layer" aria-label="宫廷地图">
            {mapHotspots.map((hotspot) => (
              <button
                key={hotspot.id}
                type="button"
                className={`map-main__hotspot ${hotspot.vertical ? 'is-vertical' : ''} ${
                  hotspot.emphasis === 'large' ? 'is-large' : ''
                } ${selectedHotspotId === hotspot.id ? 'is-active' : ''} ${
                  hotspot.id === state.residenceName ? 'is-player-residence' : ''
                }`}
                style={{
                  top: hotspot.top,
                  left: hotspot.left,
                  width: hotspot.width,
                  height: hotspot.height,
                }}
                onClick={() => handleHotspot(hotspot.id)}
              >
                <span>{hotspot.label}</span>
              </button>
            ))}
          </section>
        ) : null}

        {activeMapUtilityPanel ? (
          <button type="button" className="map-main__utility-close" onClick={closeMapUtilityPanel}>
            返回地图
          </button>
        ) : null}

        {activeMapUtilityPanel === 'harem' ? (
          <HaremPalaceView
            concubines={concubines}
            playerResidenceName={state.residenceName}
            playerName={state.name}
            playerRankLabel={hiddenStats.initialRank ?? '娘娘'}
          />
        ) : activeMapUtilityPanel === 'chronicle' ? (
          <ChroniclePanelView
            time={time}
            state={state}
            hiddenStats={hiddenStats}
            settlementReports={settlementReports}
            onClose={closeMapUtilityPanel}
          />
        ) : activeMapUtilityPanel === 'bond' ? (
          <BondPanelView
            bondProfile={activeBondProfile}
            concubines={concubines}
            routeId={state.routeId}
            flags={state.flags}
            bondFavorDeltaThisXun={activeBondProfile.xunKey === currentXunKey ? activeBondProfile.favorDeltaThisXun : 0}
            bondAffectionDeltaThisXun={
              activeBondProfile.xunKey === currentXunKey ? activeBondProfile.affectionDeltaThisXun : 0
            }
            onClose={closeMapUtilityPanel}
          />
        ) : activeMapUtilityPanel === 'affairs' ? (
          <AffairsPanelView entrySource={activeAffairsSource} concubines={concubines} onClose={closeMapUtilityPanel} />
        ) : activeMapUtilityPanel === 'stats' ? (
          <PlayerStatsView
            state={state}
            hiddenStats={hiddenStats}
            selectedRoute={selectedRoute}
            concubines={concubines}
            onClose={closeMapUtilityPanel}
          />
        ) : activeMapUtilityPanel === 'consorts' ? (
          <ConcubineListView concubines={concubines} onClose={closeMapUtilityPanel} />
        ) : null}

        {selectedHotspot && !activeMapUtilityPanel ? (
          <section
            className={`map-main__event-card ${selectedHotspot.id === '宫门' ? 'map-main__event-card--gongmen' : ''}`}
            aria-label={`${selectedHotspot.label} 地点弹窗`}
          >
            <h2>{selectedHotspot.label}</h2>
            <p>{selectedHotspot.description}</p>
            <div className={`map-main__event-actions ${selectedHotspot.id === '宫门' ? 'map-main__event-actions--gongmen' : ''}`}>
              <button type="button" onClick={handleEnterHotspot}>
                {selectedHotspot.id === state.residenceName ? '回宫' : '进入此处'}
              </button>
              <button type="button" className="is-secondary" onClick={() => setSelectedHotspotId(null)}>
                留在地图
              </button>
            </div>
          </section>
        ) : null}

        {activeYingluoyetingEvent ? (
          <GlobalDialogueStage
            sceneLabel={`${activeYingluoyetingEvent.locationId}主线剧情舞台`}
            portraitLabel={resolveYingluoyetingEventPortraitLabel(activeYingluoyetingEvent, activeYingluoyetingDialogueIsResult)}
            portrait={resolveYingluoyetingEventPortrait(activeYingluoyetingEvent, activeYingluoyetingDialogueIsResult)}
            narrationName={activeYingluoyetingEvent.locationId}
            quotedSpeakerIdentity={activeYingluoyetingEvent.speakerIdentity}
            quotedSpeakerName={activeYingluoyetingEvent.speakerName}
            ariaLabel={`${activeYingluoyetingEvent.locationId}主线剧情`}
            className="global-dialogue-stage--yingluoyeting"
            dialogueClassName="palace-dialogue-box--yingluoyeting"
            characterIdentity={activeYingluoyetingDialogueIdentity}
            characterName={activeYingluoyetingDialogueName}
            content={yingluoyetingResultText || activeYingluoyetingEvent.text}
            highlightText={yingluoyetingResultHint}
            onNextAction={yingluoyetingResultText ? handleYingluoyetingNextAction : undefined}
            options={yingluoyetingResultText ? [] : activeYingluoyetingEvent.options}
            onSelectOption={yingluoyetingResultText ? undefined : handleYingluoyetingChoice}
          />
        ) : null}

        {showSettlementReport && latestSettlementReport ? (
          <GlobalDialogueStage
            sceneLabel={
              latestSettlementReport.kind === 'promotion'
                ? '地图晋升通报场景'
                : latestSettlementReport.kind === 'event'
                  ? '地图事件通报场景'
                  : '地图时间通报场景'
            }
            portraitLabel={latestSettlementReport.kind === 'promotion' ? '传旨太监立绘' : '娇娇立绘'}
            portrait={
              latestSettlementReport.kind === 'promotion' ? (
                <img
                  src={EUNUCH_PORTRAIT_SRC}
                  alt="传旨太监"
                  className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--eunuch"
                />
              ) : (
                <img
                  src={ASSISTANT_PORTRAIT_SRC}
                  alt="娇娇"
                  className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--assistant"
                />
              )
            }
            ariaLabel={
              latestSettlementReport.kind === 'promotion'
                ? '晋升太监通报'
                : latestSettlementReport.kind === 'event'
                  ? '地图事件通报'
                  : '娇娇时间通报'
            }
            className={`global-dialogue-stage--map ${
              latestSettlementReport.kind === 'promotion' ? 'global-dialogue-stage--nightly-service' : 'global-dialogue-stage--assistant'
            }`}
            dialogueClassName="palace-dialogue-box--map"
            characterIdentity={
              latestSettlementReport.kind === 'promotion'
                ? '传旨内侍'
                : latestSettlementReport.kind === 'event'
                  ? '司乐女官'
                  : '贴身宫女'
            }
            characterName={
              latestSettlementReport.kind === 'promotion' ? '内侍' : latestSettlementReport.kind === 'event' ? '掌册宫人' : '娇娇'
            }
            content={`${latestSettlementReport.title}。${latestSettlementReport.lines.join(' ')}`}
            onNextAction={() => acknowledgeSettlementReport(latestSettlementReport.id)}
            numericFeedbackBucket="settlement"
          />
        ) : null}

        {(dialogueText || guideActive) && !selectedHotspot && !showSettlementReport ? (
          <GlobalDialogueStage
            sceneLabel="地图引导场景"
            portraitLabel={isJiaojiaoMapDialogue ? '娇娇立绘' : '旁白无立绘'}
            portrait={
              isJiaojiaoMapDialogue ? (
                <img src={ASSISTANT_PORTRAIT_SRC} alt="娇娇" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--assistant" />
              ) : undefined
            }
            ariaLabel="地图引导对话框"
            className={mapDialogueClassName}
            dialogueClassName="palace-dialogue-box--map"
            characterIdentity={activeGuidePresentation?.speakerIdentity || (isJiaojiaoMapDialogue ? '贴身宫女' : '场景旁白')}
            characterName={activeGuidePresentation?.speakerName || (isJiaojiaoMapDialogue ? '娇娇' : '宫道')}
            content={dialogueText}
            onNextAction={() => {
              if (guideActive) {
                if (guideStep >= MAP_GUIDE_LINE_IDS.length - 1) {
                  finishGuide();
                } else {
                  setGuideStep((current) => current + 1);
                }
                return;
              }
              setMapEventText('');
            }}
          />
        ) : null}
      </div>
    </main>
  );
}
