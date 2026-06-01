import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AffairsPanelView, BondPanelView, ChroniclePanelView, InventoryPanelView, MiscInfoPanelView, YangxinHearingPanelView } from '../components/chamber/ChamberUtilityViews';
import { BaohuaHallView } from '../components/chamber/BaohuaHallView';
import { DowagerAudiencePanel } from '../components/chamber/DowagerAudiencePanel';
import { HuaQingPoolView } from '../components/chamber/HuaQingPoolView';
import { KitchenView } from '../components/chamber/KitchenView';
import { MiaoYinHallView } from '../components/chamber/MiaoYinHallView';
import { NightlyServiceEventView, OVERNIGHT_TRANSITION_MS } from '../components/chamber/NightlyServiceEventView';
import { TaiHospitalView } from '../components/chamber/TaiHospitalView';
import { ConcubineListView } from '../components/consorts/ConcubineListView';
import { HaremPalaceView } from '../components/consorts/HaremPalaceView';
import { GlobalDialogueStage } from '../components/dialogue/GlobalDialogueStage';
import { PalaceStatusBar } from '../components/status/PalaceStatusBar';
import { PlayerStatsView } from '../components/status/PlayerStatsView';
import { AutoCutoutPortrait } from '../components/visual/AutoCutoutPortrait';
import { CHAMBER_ACTION_BUTTONS, CHAMBER_BOTTOM_TOOLS, CHAMBER_SIDEBAR_BUTTONS } from '../config/palaceUi';
import {
  DEFAULT_MONTHLY_EXPENSE_STRATEGY,
  MONTHLY_EXPENSE_STRATEGIES,
} from '../config/monthlyExpenseStrategy';
import { LOCATION_SCENE_BACKGROUNDS } from '../config/locationSceneBackgrounds';
import { buildRandomMusicScoreItem } from '../game/data/inventoryPresets';
import { buildInitialBondProfile } from '../game/data/bondPresets';
import {
  buildChamberActionNarrative,
  buildMapTransitionNarrative,
} from '../game/lib/actionNarrativeRuntime';
import { getRarityColor } from '../game/lib/bedchamberRuntime';
import { isJiaojiaoSpokenText } from '../game/lib/dialoguePresentation';
import { useGameFlowStore } from '../game/store/gameFlowStore';

const skillLabelMap: Record<string, string> = {
  poetry: '诗词',
  painting: '丹青',
  talent: '乐理',
  embroidery: '刺绣',
  medicine: '药理',
  politics: '政治',
};

const bottomToolMessage: Record<string, string> = {
  举办宴席: '宴席入口已预留，后续会接入宫宴花费、来客与声望收益。',
  皇嗣管理: '皇嗣管理入口已预留，后续会接入孩子成长、教育与立储判定。',
};
const ASSISTANT_PORTRAIT_SRC = '/assets/dialogue/jiaojiao-final.png';
const LIANQIAO_PORTRAIT_SRC = '/assets/characters/women/lianqiao.jpg';

const getCurrentXunKey = (year: number, month: number, xun: number): string => `${year}-${month}-${xun}`;
const toXunIndex = (year: number, month: number, xun: number): number => year * 36 + (month - 1) * 3 + xun;
type OvernightTransitionPhase = 'hidden' | 'fade-in' | 'settlement' | 'fade-out';

export function ChamberMainView() {
  const {
    state,
    hiddenStats,
    time,
    selectedRoute,
    activeChamberPanel,
    activeMapLocation,
    activeAffairsSource,
    mapEventText,
    openChamberPanel,
    closeChamberPanel,
    applyStoryEffects,
    advanceTime,
    patchState,
    musicHallProgress,
    patchMusicHallProgress,
    grantInventoryItem,
    enterMapMain,
    enterMainChamber,
    setMapEventText,
    setActiveAffairsSource,
    bondProfile,
    ensureBondProfile,
    concubines,
    ensureConcubines,
    nightlyService,
    finalizePendingNightlyService,
    acknowledgeNightlyServiceNotice,
    settlementReports,
    latestSettlementReportId,
    lastSeenSettlementReportId,
    acknowledgeSettlementReport,
  } = useGameFlowStore();
  const [dialogueText, setDialogueText] = useState('');
  const [bedchamberGiftItemName, setBedchamberGiftItemName] = useState('');
  const [overnightTransitionPhase, setOvernightTransitionPhase] = useState<OvernightTransitionPhase>('hidden');
  const [endXunAfterNightNotice, setEndXunAfterNightNotice] = useState(false);
  const [expenseStrategyPanelOpen, setExpenseStrategyPanelOpen] = useState(false);
  const isResidenceLocation = activeMapLocation === state.residenceName;
  const isOutsideScene = Boolean(activeMapLocation && !isResidenceLocation);
  const isJianzhangAudience = activeChamberPanel === 'main' && activeMapLocation === '建章宫';
  const isKitchenScene = activeChamberPanel === 'main' && activeMapLocation === '御膳房';
  const isBaohuaHallScene = activeChamberPanel === 'main' && activeMapLocation === '宝华殿';
  const isHuaQingPoolScene = activeChamberPanel === 'main' && activeMapLocation === '华清池';
  const isTaiHospitalScene = activeChamberPanel === 'main' && activeMapLocation === '太医院';
  const isMiaoYinHallScene = activeChamberPanel === 'main' && activeMapLocation === '妙音堂';
  const isHaremPanelActive = activeChamberPanel === 'harem';
  const pendingNightlyServiceEvent = nightlyService.pendingEvent;
  const pendingNightlyServiceNotice = nightlyService.pendingNotice;
  const isOvernightTransitionActive = overnightTransitionPhase !== 'hidden';
  const isNightlyOverlayActive = Boolean(pendingNightlyServiceEvent || pendingNightlyServiceNotice || isOvernightTransitionActive);
  const shouldHideChamberUiForNightlyOverlay = Boolean(
    pendingNightlyServiceEvent || pendingNightlyServiceNotice || overnightTransitionPhase === 'fade-in',
  );
  const isFullSurfacePanel = activeChamberPanel !== 'main';
  const showResidenceUi = !isOutsideScene && !isFullSurfacePanel;
  const currentSceneLabel = isHaremPanelActive ? '后宫' : activeMapLocation ?? state.residenceName;
  const currentSceneBackground = isOutsideScene && activeMapLocation ? LOCATION_SCENE_BACKGROUNDS[activeMapLocation] : undefined;
  const chamberBackgroundStyle = useMemo<CSSProperties | undefined>(
    () =>
      currentSceneBackground
        ? {
            backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)), url("${currentSceneBackground}")`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
          }
        : undefined,
    [currentSceneBackground],
  );

  useEffect(() => {
    ensureBondProfile(state.routeId);
    ensureConcubines(state.routeId);
  }, [ensureBondProfile, ensureConcubines, state.routeId]);

  useEffect(() => {
    if (overnightTransitionPhase === 'hidden' || overnightTransitionPhase === 'settlement') {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      if (overnightTransitionPhase === 'fade-out') {
        setOvernightTransitionPhase('hidden');
        return;
      }

      const currentSlotIndex = useGameFlowStore.getState().time.slotIndex;
      advanceTime(Math.max(1, 7 - currentSlotIndex));
      setOvernightTransitionPhase('settlement');
    }, OVERNIGHT_TRANSITION_MS);

    return () => window.clearTimeout(timer);
  }, [advanceTime, overnightTransitionPhase]);

  useEffect(() => {
    if (!state.flags.bedchamberIntroShown) {
      setDialogueText(`娘娘，咱们已回到${state.residenceName}。接下来您可以安排学习、休养，也可外出继续探看宫中各处。`);
      patchState({
        flags: {
          ...state.flags,
          bedchamberIntroShown: true,
        },
      });
      return;
    }

    if (activeChamberPanel !== 'main') {
      setDialogueText('');
      return;
    }

    if (
      activeMapLocation === '建章宫' ||
      activeMapLocation === '御膳房' ||
      activeMapLocation === '宝华殿' ||
      activeMapLocation === '华清池' ||
      activeMapLocation === '太医院' ||
      activeMapLocation === '妙音堂'
    ) {
      setDialogueText('');
      return;
    }

    if (!activeMapLocation && mapEventText) {
      setDialogueText(mapEventText);
      setMapEventText('');
      return;
    }

    if (activeMapLocation && !isResidenceLocation) {
      setDialogueText(buildMapTransitionNarrative({ kind: 'enter-location', locationName: activeMapLocation }));
      return;
    }

    // Keep locally-triggered action narratives visible across the stat/time rerender.
  }, [activeChamberPanel, activeMapLocation, isResidenceLocation, mapEventText, patchState, setMapEventText, state.flags, state.residenceName]);

  useEffect(() => {
    if (activeChamberPanel !== 'main' || isOutsideScene || !state.flags.isLianQiaoMet || musicHallProgress.lianQiaoAffection <= 60 || bedchamberGiftItemName) {
      return;
    }

    const currentXunIndex = toXunIndex(time.year, time.month, time.xun);
    const lastGiftXunIndex = musicHallProgress.lastGiftXunIndex ?? -999999;
    if (currentXunIndex - lastGiftXunIndex < 3) {
      return;
    }

    const giftItem = buildRandomMusicScoreItem(`${state.routeId}:${currentXunIndex}:bedchamber-lianqiao-gift`);
    grantInventoryItem(giftItem);
    patchMusicHallProgress({ lastGiftXunIndex: currentXunIndex });
    setBedchamberGiftItemName(giftItem.name);
    setDialogueText('');
  }, [
    activeChamberPanel,
    bedchamberGiftItemName,
    grantInventoryItem,
    isOutsideScene,
    musicHallProgress.lastGiftXunIndex,
    musicHallProgress.lianQiaoAffection,
    patchMusicHallProgress,
    state.flags.isLianQiaoMet,
    state.routeId,
    time.month,
    time.xun,
    time.year,
  ]);

  const skillStats = useMemo(
    () =>
      ['poetry', 'painting', 'talent', 'embroidery', 'medicine', 'politics'].map((key) => ({
        key,
        label: skillLabelMap[key],
        value: Math.round(Number(state.stats[key] ?? 0) * 10),
      })),
    [state.stats],
  );

  const currentXunKey = getCurrentXunKey(time.year, time.month, time.xun);
  const activeBondProfile =
    bondProfile.routeId === state.routeId ? bondProfile : buildInitialBondProfile(state.routeId, currentXunKey);
  const bondFavorDeltaThisXun = activeBondProfile.xunKey === currentXunKey ? activeBondProfile.favorDeltaThisXun : 0;
  const bondAffectionDeltaThisXun = activeBondProfile.xunKey === currentXunKey ? activeBondProfile.affectionDeltaThisXun : 0;
  const latestSettlementReport = useMemo(
    () => settlementReports.find((report) => report.id === latestSettlementReportId),
    [latestSettlementReportId, settlementReports],
  );
  const showSettlementReport = Boolean(
      latestSettlementReport &&
      latestSettlementReport.id !== lastSeenSettlementReportId &&
      !pendingNightlyServiceEvent &&
      !pendingNightlyServiceNotice &&
      (overnightTransitionPhase === 'hidden' || overnightTransitionPhase === 'settlement') &&
      activeChamberPanel === 'main' &&
      !isJianzhangAudience &&
      !isKitchenScene &&
      !isBaohuaHallScene &&
      !isHuaQingPoolScene &&
      !isTaiHospitalScene &&
      !isMiaoYinHallScene,
  );
  const isJiaojiaoChamberDialogue = isJiaojiaoSpokenText(dialogueText);
  const chamberDialogueClassName = `global-dialogue-stage--chamber ${
    isJiaojiaoChamberDialogue ? 'global-dialogue-stage--assistant' : 'global-dialogue-stage--narration'
  }`;

  const handleSidebar = (buttonId: string) => {
    if (buttonId === 'map-main') {
      setMapEventText(buildMapTransitionNarrative({ kind: 'enter-map', fromResidence: state.residenceName }));
      enterMapMain();
      return;
    }

    if (buttonId === 'consorts' || buttonId === 'stats' || buttonId === 'chronicle' || buttonId === 'bond') {
      if (activeChamberPanel === buttonId) {
        closeChamberPanel();
        return;
      }
      openChamberPanel(buttonId);
      setDialogueText('');
    }
  };

  const beginOvernightTransition = () => {
    setDialogueText('');
    setOvernightTransitionPhase('fade-in');
  };

  const handleNightlyServiceNoticeDone = () => {
    const noticeOutcome = pendingNightlyServiceNotice?.outcome;
    acknowledgeNightlyServiceNotice();
    setEndXunAfterNightNotice(false);
    if (endXunAfterNightNotice && noticeOutcome !== 'player-service' && noticeOutcome !== 'player-companion') {
      beginOvernightTransition();
    }
  };

  const handleNightlyServiceComplete = (choices: Parameters<typeof finalizePendingNightlyService>[0]) => {
    finalizePendingNightlyService(choices);
    setEndXunAfterNightNotice(false);
    setOvernightTransitionPhase('settlement');
  };

  const handleSettlementReportDone = (reportId: string) => {
    acknowledgeSettlementReport(reportId);
    if (overnightTransitionPhase === 'settlement') {
      setOvernightTransitionPhase('fade-out');
    }
  };

  const handleTrainingAction = (actionId: string) => {
    const action = CHAMBER_ACTION_BUTTONS.find((item) => item.id === actionId);
    if (!action) return;

    if (action.id === 'explore') {
      setMapEventText(buildMapTransitionNarrative({ kind: 'enter-map', fromResidence: state.residenceName }));
      enterMapMain();
      return;
    }

    if (action.id === 'end-xun') {
      const stepsToNight = 5 - time.slotIndex;
      setDialogueText('');
      if (stepsToNight > 0) {
        setEndXunAfterNightNotice(true);
        advanceTime(stepsToNight);
        return;
      }
      setEndXunAfterNightNotice(false);
      beginOvernightTransition();
      return;
    }

    if ((action.staminaCost ?? 0) > state.stamina) {
      setDialogueText('娘娘眼下体力不足，还是先歇一歇，再做这些事。');
      return;
    }

    applyStoryEffects({
      stamina: -(action.staminaCost ?? 0),
      favor: action.favorDelta ?? 0,
      stress: action.stressDelta ?? 0,
      stats: action.statDeltas ?? {},
    });
    advanceTime(action.timeCost ?? 1);
    setDialogueText(
      buildChamberActionNarrative({
        actionId: action.id,
        actionLabel: action.label,
        actionSummary: action.summary,
        playerName: state.name,
        residenceName: state.residenceName,
        timeLabel: `${time.year}年${time.month}月${time.xun}旬${time.slot}`,
      }),
    );
  };

  const handleBottomTool = (toolLabel: string) => {
    if (toolLabel === '道具管理') {
      openChamberPanel('inventory');
      setDialogueText('');
      return;
    }

    if (toolLabel === '查看属性') {
      openChamberPanel('stats');
      setDialogueText('');
      return;
    }

    if (toolLabel === '其他信息') {
      openChamberPanel('misc');
      setDialogueText('');
      return;
    }

    if (toolLabel === '情缘管理') {
      openChamberPanel('bond');
      setDialogueText('');
      return;
    }

    if (toolLabel === '调整用度') {
      setExpenseStrategyPanelOpen((open) => !open);
      setDialogueText('');
      return;
    }

    if (toolLabel === '宫斗事务' || toolLabel === '家族事务' || toolLabel === '朝堂事务') {
      setActiveAffairsSource(toolLabel);
      openChamberPanel('affairs');
      setDialogueText('');
      return;
    }

    setDialogueText(bottomToolMessage[toolLabel] ?? `${toolLabel}入口已预留，后续会补全对应功能。`);
  };

  const handleExpenseStrategySelect = (strategyId: (typeof MONTHLY_EXPENSE_STRATEGIES)[number]['id']) => {
    patchState({
      nextMonthlyExpenseStrategy: strategyId,
      monthlyExpenseStrategy: state.monthlyExpenseStrategy ?? DEFAULT_MONTHLY_EXPENSE_STRATEGY,
    });
    setExpenseStrategyPanelOpen(false);
  };

  return (
    <main className={`chamber-main palace-stage-shell ${isHaremPanelActive ? 'is-harem-open' : ''}`}>
      <div className="chamber-main__frame">
        <div className="chamber-main__background" style={chamberBackgroundStyle} />
        {showResidenceUi ? <div className="chamber-main__inner-panel" aria-hidden="true" /> : null}
        <PalaceStatusBar />

        {expenseStrategyPanelOpen ? (
          <section className="chamber-main__expense-choice-overlay global-dialogue-stage__options palace-dialogue-box__options" aria-label="调整用度">
            {MONTHLY_EXPENSE_STRATEGIES.map((strategy) => (
              <button
                key={strategy.id}
                type="button"
                className={`palace-dialogue-box__option ${state.nextMonthlyExpenseStrategy === strategy.id ? 'is-active' : ''}`}
                onClick={() => handleExpenseStrategySelect(strategy.id)}
              >
                <span>{strategy.label}</span>
              </button>
            ))}
          </section>
        ) : null}

        {pendingNightlyServiceEvent ? (
          <NightlyServiceEventView
            pendingEvent={pendingNightlyServiceEvent}
            playerName={state.name}
            playerPortrait={selectedRoute?.portrait}
            playerStats={state.stats}
            concubines={concubines}
            onComplete={handleNightlyServiceComplete}
          />
        ) : null}

        {!pendingNightlyServiceEvent && pendingNightlyServiceNotice ? (
          <GlobalDialogueStage
            sceneLabel="夜晚侍寝通报"
            portraitLabel="场景旁白无立绘"
            ariaLabel="夜晚侍寝通报"
            className="global-dialogue-stage--chamber"
            dialogueClassName="palace-dialogue-box--chamber"
            characterIdentity="夜间通报"
            characterName="内侍"
            content={pendingNightlyServiceNotice.lines.join('\n')}
            nextActionLabel="知道了"
            onNextAction={handleNightlyServiceNoticeDone}
          />
        ) : null}

        {!pendingNightlyServiceEvent && !pendingNightlyServiceNotice && isOvernightTransitionActive ? (
          <section
            className={`nightly-service-event nightly-service-event--overnight nightly-service-event--${overnightTransitionPhase}`}
            aria-label="一夜过去"
          >
            <div className="nightly-service-event__blackout" />
          </section>
        ) : null}

        {!shouldHideChamberUiForNightlyOverlay ? (
        <nav className="palace-sidebar palace-sidebar--chamber" aria-label="寝殿左侧功能栏">
          {CHAMBER_SIDEBAR_BUTTONS.map((button) => (
            <button
              key={button.id}
              type="button"
              className={`palace-sidebar__diamond ${activeChamberPanel === button.id ? 'is-active' : ''}`}
              style={{ top: button.top }}
              onClick={() => handleSidebar(button.id)}
            >
              <span>{button.label}</span>
            </button>
          ))}
          {isOutsideScene ? (
            <button type="button" className="palace-sidebar__quick-return" aria-label="回宫" onClick={() => enterMainChamber()}>
              <span>回</span>
              <span>宫</span>
            </button>
          ) : null}
        </nav>
        ) : null}

        {!shouldHideChamberUiForNightlyOverlay && showResidenceUi ? (
          <section className="chamber-main__title-bar" aria-label="玩家信息">
            <div className="chamber-main__title-chip">{`${hiddenStats.initialRank ?? '宫妃'} ${state.name}`}</div>
            <div className="chamber-main__residence-chip">{currentSceneLabel}</div>
          </section>
        ) : null}

        {!shouldHideChamberUiForNightlyOverlay && showResidenceUi ? (
          <>
            <section className="chamber-main__portrait-stage" aria-label="玩家立绘">
              {selectedRoute ? <img src={selectedRoute.portrait} alt={selectedRoute.label} className="chamber-main__portrait" /> : null}
            </section>

            <section className="chamber-main__skill-panel" aria-label="技能与行动">
              <div className="chamber-main__skills">
                {skillStats.map((skill) => (
                  <div key={skill.key} className="chamber-main__skill-item">
                    <span>{skill.label}</span>
                    <strong style={{ color: getRarityColor(skill.value, 100) }}>{skill.value}</strong>
                  </div>
                ))}
              </div>

              <div className="chamber-main__action-grid">
                {CHAMBER_ACTION_BUTTONS.map((action) => (
                  <button key={action.id} type="button" onClick={() => handleTrainingAction(action.id)}>
                    {action.label}
                  </button>
                ))}
              </div>

              <div className="chamber-main__bottom-tools">
                {CHAMBER_BOTTOM_TOOLS.map((tool) => (
                  <button key={tool} type="button" onClick={() => handleBottomTool(tool)}>
                    {tool}
                  </button>
                ))}
              </div>

            </section>
          </>
        ) : null}

        {!shouldHideChamberUiForNightlyOverlay && isKitchenScene ? (
          <KitchenView concubines={concubines} />
        ) : isBaohuaHallScene ? (
          <BaohuaHallView concubines={concubines} />
        ) : isHuaQingPoolScene ? (
          <HuaQingPoolView concubines={concubines} />
        ) : isTaiHospitalScene ? (
          <TaiHospitalView concubines={concubines} />
        ) : isMiaoYinHallScene ? (
          <MiaoYinHallView concubines={concubines} />
        ) : isJianzhangAudience ? (
          <DowagerAudiencePanel onLeave={enterMapMain} />
        ) : activeChamberPanel === 'harem' ? (
          <HaremPalaceView
            concubines={concubines}
            playerResidenceName={state.residenceName}
            playerName={state.name}
            playerRankLabel={hiddenStats.initialRank ?? '娘娘'}
          />
        ) : activeChamberPanel === 'chronicle' ? (
          <ChroniclePanelView
            time={time}
            state={state}
            hiddenStats={hiddenStats}
            settlementReports={settlementReports}
            onClose={closeChamberPanel}
          />
        ) : activeChamberPanel === 'bond' ? (
          <BondPanelView
            bondProfile={activeBondProfile}
            concubines={concubines}
            routeId={state.routeId}
            flags={state.flags}
            bondFavorDeltaThisXun={bondFavorDeltaThisXun}
            bondAffectionDeltaThisXun={bondAffectionDeltaThisXun}
            onClose={closeChamberPanel}
          />
        ) : activeChamberPanel === 'inventory' ? (
          <InventoryPanelView onClose={closeChamberPanel} />
        ) : activeChamberPanel === 'affairs' ? (
          <AffairsPanelView entrySource={activeAffairsSource} concubines={concubines} onClose={closeChamberPanel} />
        ) : activeChamberPanel === 'yangxin' ? (
          <YangxinHearingPanelView onClose={closeChamberPanel} />
        ) : activeChamberPanel === 'misc' ? (
          <MiscInfoPanelView state={state} hiddenStats={hiddenStats} bondProfile={activeBondProfile} onClose={closeChamberPanel} />
        ) : activeChamberPanel === 'stats' ? (
          <PlayerStatsView
            state={state}
            hiddenStats={hiddenStats}
            selectedRoute={selectedRoute}
            concubines={concubines}
            onClose={closeChamberPanel}
          />
        ) : activeChamberPanel === 'consorts' ? (
          <ConcubineListView concubines={concubines} onClose={closeChamberPanel} />
        ) : null}

        {showSettlementReport && latestSettlementReport ? (
          <GlobalDialogueStage
            sceneLabel="旬月通报场景"
            portraitLabel="娇娇立绘"
            portrait={<img src={ASSISTANT_PORTRAIT_SRC} alt="娇娇" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--assistant" />}
            ariaLabel="娇娇旬月通报"
            className="global-dialogue-stage--chamber global-dialogue-stage--assistant"
            dialogueClassName="palace-dialogue-box--chamber"
            characterIdentity="贴身宫女"
            characterName="娇娇"
            content={`${latestSettlementReport.title}。${latestSettlementReport.lines.join(' ')}`}
            nextActionLabel="记下"
            onNextAction={() => handleSettlementReportDone(latestSettlementReport.id)}
          />
        ) : null}

        {dialogueText &&
        !isNightlyOverlayActive &&
        !showSettlementReport &&
        activeChamberPanel === 'main' &&
        !isJianzhangAudience &&
        !isBaohuaHallScene &&
        !isHuaQingPoolScene &&
        !isTaiHospitalScene &&
        !isMiaoYinHallScene ? (
          <GlobalDialogueStage
            sceneLabel="寝殿指引场景"
            portraitLabel={isJiaojiaoChamberDialogue ? '娇娇立绘' : '旁白无立绘'}
            portrait={
              isJiaojiaoChamberDialogue ? (
                <img src={ASSISTANT_PORTRAIT_SRC} alt="娇娇" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--assistant" />
              ) : undefined
            }
            ariaLabel="寝殿对白"
            className={chamberDialogueClassName}
            dialogueClassName="palace-dialogue-box--chamber"
            characterIdentity={isJiaojiaoChamberDialogue ? '贴身宫女' : '场景旁白'}
            characterName={isJiaojiaoChamberDialogue ? '娇娇' : currentSceneLabel}
            content={dialogueText}
            nextActionLabel="收起"
            onNextAction={() => setDialogueText('')}
          />
        ) : null}

        {bedchamberGiftItemName && !isNightlyOverlayActive && !showSettlementReport && activeChamberPanel === 'main' && !isOutsideScene ? (
          <GlobalDialogueStage
            sceneLabel="寝殿连翘赠礼场景"
            portraitLabel="连翘立绘"
            portrait={
              <AutoCutoutPortrait
                src={LIANQIAO_PORTRAIT_SRC}
                alt="连翘"
                threshold={22}
                sampleInset={18}
                className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--miaoyin global-dialogue-stage__portrait-media--lianqiao"
              />
            }
            ariaLabel="连翘寝殿赠礼"
            className="global-dialogue-stage--miaoyin"
            dialogueClassName="palace-dialogue-box--miaoyin-encounter"
            characterIdentity="妙音堂伶人"
            characterName="连翘"
            content={`连翘托宫人把一卷新谱送到了寝殿门前。她只留下一句话：这折《${bedchamberGiftItemName}》你若肯细听，想来不会白费。`}
            nextActionLabel="收下"
            onNextAction={() => setBedchamberGiftItemName('')}
          />
        ) : null}
      </div>
    </main>
  );
}
