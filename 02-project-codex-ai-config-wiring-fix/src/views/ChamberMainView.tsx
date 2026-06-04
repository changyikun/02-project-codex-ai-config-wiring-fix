import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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
import { DIALOGUE_EXPLICIT_PAGE_BREAK, GlobalDialogueStage } from '../components/dialogue/GlobalDialogueStage';
import { PalaceStatusBar } from '../components/status/PalaceStatusBar';
import { PlayerStatsView } from '../components/status/PlayerStatsView';
import { AutoCutoutPortrait } from '../components/visual/AutoCutoutPortrait';
import type { ChamberPanelId } from '../config/bedchamber';
import {
  CHAMBER_ACTION_BUTTONS,
  CHAMBER_HOME_ACTION_LAYOUTS,
  CHAMBER_SIDEBAR_BUTTONS,
  JIAOJIAO_COMMAND_LAYOUTS,
} from '../config/palaceUi';
import {
  DEFAULT_MONTHLY_EXPENSE_STRATEGY,
  MONTHLY_EXPENSE_STRATEGIES,
} from '../config/monthlyExpenseStrategy';
import { HAREM_OVERVIEW_BACKGROUND, LOCATION_SCENE_BACKGROUNDS, resolvePlayerHomeBackground } from '../config/locationSceneBackgrounds';
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
const JIAOJIAO_COMMAND_PROMPT = '娘娘，有何吩咐？';
const LIANQIAO_PORTRAIT_SRC = '/assets/characters/women/lianqiao.jpg';
const EXPENSE_EXPLANATION_OPTION_ID = 'expense-explanation';
const EXPENSE_EXPLANATION_TEXT = [
  '娘娘，这三档说的是每月固定用度，不是立刻花一笔银子。寝殿这里调整后，是登记下月用度，等跨月结算时才生效。',
  '节衣缩食：每月用月俸四分之一。好处是省银两；代价是起居和体面受损，声望-5，健康-1。',
  '量入为出：每月用月俸一半。它最稳妥，不额外增减声望和健康。',
  '锦衣玉食：每月用月俸四分之三。花费重些，但能撑住体面与起居，声望+10，健康+1。',
].join(DIALOGUE_EXPLICIT_PAGE_BREAK);
const CHAMBER_BACKGROUND_CROSSFADE_MS = 680;

const getCurrentXunKey = (year: number, month: number, xun: number): string => `${year}-${month}-${xun}`;
const toXunIndex = (year: number, month: number, xun: number): number => year * 36 + (month - 1) * 3 + xun;
type OvernightTransitionPhase = 'hidden' | 'fade-in' | 'settlement' | 'fade-out';
type PendingChamberDialogueAction = 'enter-map' | 'reopen-expense-choice' | 'overnight-reminder' | 'overnight-transition' | null;

const buildChamberBackgroundStyle = (backgroundImage?: string): CSSProperties | undefined =>
  backgroundImage
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)), url("${backgroundImage}")`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }
    : undefined;

const buildOvernightReminderText = (origin: 'map' | 'chamber', reason: 'deep-night' | 'stamina'): string => {
  if (origin === 'map') {
    return reason === 'stamina'
      ? '娘娘，今日体力已经尽了。奴婢陪您回宫歇下，余下的事明儿清晨再听回禀。'
      : '娘娘，夜已经深了。奴婢陪您回宫歇下，等明儿清晨再听各处回禀。';
  }

  return reason === 'stamina'
    ? '娘娘，今日体力已经尽了。奴婢替您收拾灯烛，先歇下吧。'
    : '娘娘，已经深夜了。奴婢替您放下帐子，先歇下吧。';
};

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
    pendingOvernightReturn,
    clearOvernightReturn,
  } = useGameFlowStore();
  const [dialogueText, setDialogueText] = useState('');
  const [bedchamberGiftItemName, setBedchamberGiftItemName] = useState('');
  const [overnightTransitionPhase, setOvernightTransitionPhase] = useState<OvernightTransitionPhase>('hidden');
  const [endXunAfterNightNotice, setEndXunAfterNightNotice] = useState(false);
  const [expenseStrategyPanelOpen, setExpenseStrategyPanelOpen] = useState(false);
  const [utilityReturnPanel, setUtilityReturnPanel] = useState<ChamberPanelId | null>(null);
  const [pendingChamberDialogueAction, setPendingChamberDialogueAction] =
    useState<PendingChamberDialogueAction>(null);
  const overnightTransitionRunKeyRef = useRef<string | null>(null);
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
  const shouldDelayNightlyServiceOverlay = Boolean(dialogueText);
  const shouldShowPendingNightlyServiceEvent = Boolean(pendingNightlyServiceEvent && !shouldDelayNightlyServiceOverlay);
  const shouldShowPendingNightlyServiceNotice = Boolean(
    !shouldShowPendingNightlyServiceEvent && pendingNightlyServiceNotice && !shouldDelayNightlyServiceOverlay,
  );
  const isOvernightTransitionActive = overnightTransitionPhase !== 'hidden';
  const isNightlyOverlayActive = Boolean(
    shouldShowPendingNightlyServiceEvent || shouldShowPendingNightlyServiceNotice || isOvernightTransitionActive,
  );
  const shouldHideChamberUiForNightlyOverlay = Boolean(
    shouldShowPendingNightlyServiceEvent || shouldShowPendingNightlyServiceNotice || overnightTransitionPhase === 'fade-in',
  );
  const isJiaojiaoPanel = activeChamberPanel === 'jiaojiao';
  const isFullSurfacePanel = activeChamberPanel !== 'main' && !isJiaojiaoPanel;
  const showResidenceUi = !isOutsideScene && !isFullSurfacePanel;
  const currentSceneLabel = isHaremPanelActive ? '后宫' : activeMapLocation ?? state.residenceName;
  const currentSceneBackground =
    isHaremPanelActive
      ? HAREM_OVERVIEW_BACKGROUND
      : isOutsideScene && activeMapLocation
        ? LOCATION_SCENE_BACKGROUNDS[activeMapLocation]
        : resolvePlayerHomeBackground(time.slot);
  const [displayedSceneBackground, setDisplayedSceneBackground] = useState(currentSceneBackground);
  const [fadingSceneBackground, setFadingSceneBackground] = useState<string | undefined>();
  const [pendingSceneBackground, setPendingSceneBackground] = useState<string | undefined>();
  const chamberBackgroundStyle = useMemo<CSSProperties | undefined>(
    () => buildChamberBackgroundStyle(displayedSceneBackground),
    [displayedSceneBackground],
  );
  const fadingChamberBackgroundStyle = useMemo<CSSProperties | undefined>(
    () => buildChamberBackgroundStyle(fadingSceneBackground),
    [fadingSceneBackground],
  );

  useEffect(() => {
    ensureBondProfile(state.routeId);
    ensureConcubines(state.routeId);
  }, [ensureBondProfile, ensureConcubines, state.routeId]);

  useEffect(() => {
    if (overnightTransitionPhase === 'hidden' || overnightTransitionPhase === 'settlement') {
      return undefined;
    }

    const transitionRunKey = `${overnightTransitionPhase}:${time.year}-${time.month}-${time.xun}-${time.slotIndex}-${time.slotProgress}`;
    const timer = window.setTimeout(() => {
      if (overnightTransitionRunKeyRef.current === transitionRunKey) {
        return;
      }
      overnightTransitionRunKeyRef.current = transitionRunKey;

      if (overnightTransitionPhase === 'fade-out') {
        setOvernightTransitionPhase('hidden');
        return;
      }

      const currentSlotIndex = useGameFlowStore.getState().time.slotIndex;
      advanceTime(Math.max(1, 7 - currentSlotIndex));
      setOvernightTransitionPhase('settlement');
    }, OVERNIGHT_TRANSITION_MS);

    return () => window.clearTimeout(timer);
  }, [advanceTime, overnightTransitionPhase, time.month, time.slotIndex, time.slotProgress, time.xun, time.year]);

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

    if (activeChamberPanel !== 'main' && activeChamberPanel !== 'jiaojiao') {
      setPendingChamberDialogueAction(null);
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
      setPendingChamberDialogueAction(null);
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
    setPendingChamberDialogueAction(null);
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
  const isOvernightSettlementPhase = overnightTransitionPhase === 'settlement';
  const shouldSuppressSettlementReportForScene =
    !isOvernightSettlementPhase &&
    (isJianzhangAudience ||
      isKitchenScene ||
      isBaohuaHallScene ||
      isHuaQingPoolScene ||
      isTaiHospitalScene ||
      isMiaoYinHallScene);
  const showSettlementReport = Boolean(
      latestSettlementReport &&
      latestSettlementReport.id !== lastSeenSettlementReportId &&
      !dialogueText &&
      !pendingNightlyServiceEvent &&
      !pendingNightlyServiceNotice &&
      (overnightTransitionPhase === 'hidden' || overnightTransitionPhase === 'settlement') &&
      activeChamberPanel === 'main' &&
      !shouldSuppressSettlementReportForScene,
  );
  const isJiaojiaoChamberDialogue = isJiaojiaoSpokenText(dialogueText);
  const chamberDialogueClassName = `global-dialogue-stage--chamber ${
    isJiaojiaoChamberDialogue ? 'global-dialogue-stage--assistant' : 'global-dialogue-stage--narration'
  }`;
  const isChamberDialogueBlocking = Boolean(
    dialogueText || showSettlementReport || isNightlyOverlayActive || bedchamberGiftItemName,
  );
  const isChamberUiInteractionLocked = isChamberDialogueBlocking || expenseStrategyPanelOpen;

  useEffect(() => {
    if (currentSceneBackground === displayedSceneBackground && !pendingSceneBackground) {
      return undefined;
    }

    if (isOvernightTransitionActive && currentSceneBackground !== displayedSceneBackground) {
      setFadingSceneBackground(undefined);
      setDisplayedSceneBackground(currentSceneBackground);
      setPendingSceneBackground(undefined);
      return undefined;
    }

    if (currentSceneBackground !== displayedSceneBackground && isChamberDialogueBlocking) {
      setPendingSceneBackground(currentSceneBackground);
      return undefined;
    }

    const nextSceneBackground = pendingSceneBackground ?? currentSceneBackground;
    if (nextSceneBackground === displayedSceneBackground) {
      setPendingSceneBackground(undefined);
      return undefined;
    }

    setFadingSceneBackground(displayedSceneBackground);
    setDisplayedSceneBackground(nextSceneBackground);
    setPendingSceneBackground(undefined);

    const timer = window.setTimeout(() => {
      setFadingSceneBackground(undefined);
    }, CHAMBER_BACKGROUND_CROSSFADE_MS);

    return () => window.clearTimeout(timer);
  }, [
    currentSceneBackground,
    displayedSceneBackground,
    isChamberDialogueBlocking,
    isOvernightTransitionActive,
    pendingSceneBackground,
  ]);

  const handleSidebar = (buttonId: string) => {
    if (isChamberUiInteractionLocked) {
      return;
    }

    if (buttonId === 'map-main') {
      setUtilityReturnPanel(null);
      if (isOutsideScene) {
        setPendingChamberDialogueAction(null);
        setDialogueText('');
        setMapEventText('');
        enterMapMain();
        return;
      }

      closeChamberPanel();
      setPendingChamberDialogueAction('enter-map');
      setDialogueText(buildMapTransitionNarrative({ kind: 'enter-map', fromResidence: state.residenceName }));
      return;
    }

    if (buttonId === 'consorts' || buttonId === 'stats' || buttonId === 'chronicle' || buttonId === 'bond') {
      if (activeChamberPanel === buttonId) {
        setUtilityReturnPanel(null);
        closeChamberPanel();
        return;
      }
      setUtilityReturnPanel(null);
      openChamberPanel(buttonId);
      setPendingChamberDialogueAction(null);
      setDialogueText('');
    }
  };

  const handleReturnHomeFromLocation = () => {
    if (isChamberUiInteractionLocked) {
      return;
    }

    setPendingChamberDialogueAction(null);
    setDialogueText('');
    setMapEventText('');
    enterMainChamber();
  };

  const beginOvernightTransition = () => {
    enterMainChamber();
    setPendingChamberDialogueAction(null);
    setDialogueText('');
    setOvernightTransitionPhase('fade-in');
  };

  useEffect(() => {
    if (
      !pendingOvernightReturn ||
      activeChamberPanel !== 'main' ||
      isNightlyOverlayActive ||
      dialogueText ||
      bedchamberGiftItemName
    ) {
      return;
    }

    enterMainChamber();
    setPendingChamberDialogueAction('overnight-transition');
    setDialogueText(buildOvernightReminderText(pendingOvernightReturn.origin, pendingOvernightReturn.reason));
    clearOvernightReturn();
  }, [
    activeChamberPanel,
    bedchamberGiftItemName,
    clearOvernightReturn,
    dialogueText,
    enterMainChamber,
    isNightlyOverlayActive,
    pendingOvernightReturn,
  ]);

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
    if (isChamberUiInteractionLocked) {
      return;
    }

    const action = CHAMBER_ACTION_BUTTONS.find((item) => item.id === actionId);
    if (!action) return;

    if (action.id === 'explore') {
      setPendingChamberDialogueAction('enter-map');
      setDialogueText(buildMapTransitionNarrative({ kind: 'enter-map', fromResidence: state.residenceName }));
      return;
    }

    if (action.id === 'end-xun') {
      const stepsToNight = 5 - time.slotIndex;
      setPendingChamberDialogueAction(null);
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
      setPendingChamberDialogueAction(null);
      setDialogueText('娘娘眼下体力不足，还是先歇一歇，再做这些事。');
      return;
    }

    applyStoryEffects({
      stamina: -(action.staminaCost ?? 0),
      favor: action.favorDelta ?? 0,
      stress: action.stressDelta ?? 0,
      stats: action.statDeltas ?? {},
    });
    const hasTimeCost = Boolean(action.timeCost && action.timeCost > 0);
    const nextStamina = Math.max(0, state.stamina - (action.staminaCost ?? 0));
    const shouldSleepAfterAction = hasTimeCost && (time.slot === '深夜' || nextStamina <= 0);
    if (time.slot !== '深夜') {
      advanceTime(action.timeCost ?? 1);
    }
    setPendingChamberDialogueAction(null);
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
    if (shouldSleepAfterAction) {
      setPendingChamberDialogueAction('overnight-reminder');
    }
  };

  const handleBottomTool = (toolLabel: string) => {
    if (isChamberUiInteractionLocked) {
      return;
    }

    const openUtilityPanel = (panel: ChamberPanelId) => {
      setUtilityReturnPanel(activeChamberPanel === 'jiaojiao' ? 'jiaojiao' : null);
      openChamberPanel(panel);
      setPendingChamberDialogueAction(null);
      setDialogueText('');
    };

    if (toolLabel === '道具管理') {
      openUtilityPanel('inventory');
      return;
    }

    if (toolLabel === '查看属性') {
      openUtilityPanel('stats');
      return;
    }

    if (toolLabel === '其他信息') {
      openUtilityPanel('misc');
      return;
    }

    if (toolLabel === '情缘管理') {
      openUtilityPanel('bond');
      return;
    }

    if (toolLabel === '调整用度') {
      setExpenseStrategyPanelOpen((open) => !open);
      setPendingChamberDialogueAction(null);
      setDialogueText('');
      return;
    }

    if (toolLabel === '宫斗事务' || toolLabel === '家族事务' || toolLabel === '朝堂事务') {
      setActiveAffairsSource(toolLabel);
      openUtilityPanel('affairs');
      return;
    }

    setPendingChamberDialogueAction(null);
    setDialogueText(bottomToolMessage[toolLabel] ?? `${toolLabel}入口已预留，后续会补全对应功能。`);
  };

  const handleOpenJiaojiaoPanel = () => {
    if (isChamberUiInteractionLocked) {
      return;
    }

    openChamberPanel('jiaojiao');
    setPendingChamberDialogueAction(null);
    setDialogueText('');
  };

  const handleJiaojiaoCommand = (commandId: string) => {
    if (commandId === 'dismiss') {
      setUtilityReturnPanel(null);
      closeChamberPanel();
      setPendingChamberDialogueAction(null);
      setDialogueText('');
      return;
    }

    handleBottomTool(commandId);
  };

  const handleUtilityPanelClose = () => {
    if (utilityReturnPanel) {
      openChamberPanel(utilityReturnPanel);
      setUtilityReturnPanel(null);
      setPendingChamberDialogueAction(null);
      setDialogueText('');
      return;
    }

    closeChamberPanel();
  };

  const handleChamberDialogueDone = () => {
    if (pendingChamberDialogueAction === 'enter-map') {
      setPendingChamberDialogueAction(null);
      setDialogueText('');
      setMapEventText('');
      enterMapMain();
      return;
    }

    if (pendingChamberDialogueAction === 'reopen-expense-choice') {
      setPendingChamberDialogueAction(null);
      setDialogueText('');
      setExpenseStrategyPanelOpen(true);
      return;
    }

    if (pendingChamberDialogueAction === 'overnight-reminder') {
      const reason = state.stamina <= 0 ? 'stamina' : 'deep-night';
      setPendingChamberDialogueAction('overnight-transition');
      setDialogueText(buildOvernightReminderText('chamber', reason));
      return;
    }

    if (pendingChamberDialogueAction === 'overnight-transition') {
      beginOvernightTransition();
      return;
    }

    setPendingChamberDialogueAction(null);
    setDialogueText('');
  };

  const handleExpenseExplanation = () => {
    setExpenseStrategyPanelOpen(false);
    setPendingChamberDialogueAction('reopen-expense-choice');
    setDialogueText(EXPENSE_EXPLANATION_TEXT);
  };

  const handleExpenseStrategySelect = (strategyId: (typeof MONTHLY_EXPENSE_STRATEGIES)[number]['id']) => {
    patchState({
      nextMonthlyExpenseStrategy: strategyId,
      monthlyExpenseStrategy: state.monthlyExpenseStrategy ?? DEFAULT_MONTHLY_EXPENSE_STRATEGY,
    });
    setExpenseStrategyPanelOpen(false);
  };

  return (
    <main className={`chamber-main palace-stage-shell ${isHaremPanelActive ? 'is-harem-open' : ''} ${isJiaojiaoPanel ? 'is-jiaojiao-open' : ''}`}>
      <div className="chamber-main__frame">
        <div className="chamber-main__background chamber-main__background--current" style={chamberBackgroundStyle} />
        {fadingSceneBackground ? (
          <div className="chamber-main__background chamber-main__background--previous" style={fadingChamberBackgroundStyle} />
        ) : null}
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
            <button
              key={EXPENSE_EXPLANATION_OPTION_ID}
              type="button"
              className="palace-dialogue-box__option"
              onClick={handleExpenseExplanation}
            >
              <span>先问清用度</span>
            </button>
          </section>
        ) : null}

        {shouldShowPendingNightlyServiceEvent && pendingNightlyServiceEvent ? (
          <NightlyServiceEventView
            pendingEvent={pendingNightlyServiceEvent}
            playerName={state.name}
            playerPortrait={selectedRoute?.portrait}
            playerStats={state.stats}
            concubines={concubines}
            onComplete={handleNightlyServiceComplete}
          />
        ) : null}

        {shouldShowPendingNightlyServiceNotice && pendingNightlyServiceNotice ? (
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
            numericFeedbackBucket="nightly-service"
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
          {CHAMBER_SIDEBAR_BUTTONS.map((button) => {
            return (
              <button
                key={button.id}
                type="button"
                className={`palace-sidebar__diamond ${activeChamberPanel === button.id ? 'is-active' : ''}`}
                style={{ top: button.top }}
                onClick={() => handleSidebar(button.id)}
              >
                <span>{button.label}</span>
              </button>
            );
          })}
          {isOutsideScene ? (
            <button type="button" className="palace-sidebar__quick-return" aria-label="回宫" onClick={handleReturnHomeFromLocation}>
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

        {!shouldHideChamberUiForNightlyOverlay && showResidenceUi && activeChamberPanel === 'main' ? (
          <>
            <section className="chamber-main__portrait-stage" aria-label="玩家立绘">
              {selectedRoute ? <img src={selectedRoute.portrait} alt={selectedRoute.label} className="chamber-main__portrait" /> : null}
            </section>

            <section className="chamber-main__scene-actions" aria-label="寝殿行动">
              {CHAMBER_HOME_ACTION_LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  aria-label={layout.label}
                  className={`chamber-main__scene-button chamber-main__scene-button--${layout.orientation}`}
                  style={{
                    top: layout.top,
                    left: layout.left,
                    width: layout.width,
                    height: layout.height,
                  }}
                  onClick={() => handleTrainingAction(layout.id)}
                >
                  <span>
                    {layout.orientation === 'vertical'
                      ? [...layout.label].map((character, index) => (
                          <span key={`${layout.id}-${index}`} className="chamber-main__scene-button-char">
                            {character}
                          </span>
                        ))
                      : layout.label}
                  </span>
                </button>
              ))}
              <button type="button" className="chamber-main__jiaojiao-entry" aria-label="吩咐娇娇" onClick={handleOpenJiaojiaoPanel}>
                <img src={ASSISTANT_PORTRAIT_SRC} alt="" aria-hidden="true" />
                <span>吩咐娇娇</span>
              </button>
            </section>

            <section className="chamber-main__skills-strip" aria-label="技能属性">
              <div className="chamber-main__skills">
                {skillStats.map((skill) => (
                  <div key={skill.key} className="chamber-main__skill-item">
                    <span>{skill.label}</span>
                    <strong style={{ color: getRarityColor(skill.value, 100) }}>{skill.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {!shouldHideChamberUiForNightlyOverlay && showResidenceUi && isJiaojiaoPanel ? (
          <section className="chamber-main__jiaojiao-panel" aria-label="吩咐娇娇选项">
            <img src={ASSISTANT_PORTRAIT_SRC} alt="" aria-hidden="true" className="chamber-main__jiaojiao-portrait" />
            <section className="chamber-main__jiaojiao-prompt" aria-label="娇娇吩咐提示">
              <header>贴身宫女 · 娇娇</header>
              <p>{JIAOJIAO_COMMAND_PROMPT}</p>
            </section>
            {JIAOJIAO_COMMAND_LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                type="button"
                aria-label={layout.label}
                className={`chamber-main__scene-button chamber-main__scene-button--${layout.orientation} ${
                  layout.id === 'dismiss' ? 'chamber-main__scene-button--dismiss' : ''
                }`}
                style={{
                  top: layout.top,
                  left: layout.left,
                  width: layout.width,
                  height: layout.height,
                }}
                onClick={() => handleJiaojiaoCommand(layout.id)}
              >
                <span>{layout.label}</span>
              </button>
            ))}
          </section>
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
            onClose={handleUtilityPanelClose}
          />
        ) : activeChamberPanel === 'inventory' ? (
          <InventoryPanelView onClose={handleUtilityPanelClose} />
        ) : activeChamberPanel === 'affairs' ? (
          <AffairsPanelView entrySource={activeAffairsSource} concubines={concubines} onClose={handleUtilityPanelClose} />
        ) : activeChamberPanel === 'yangxin' ? (
          <YangxinHearingPanelView onClose={handleUtilityPanelClose} />
        ) : activeChamberPanel === 'misc' ? (
          <MiscInfoPanelView state={state} hiddenStats={hiddenStats} bondProfile={activeBondProfile} onClose={handleUtilityPanelClose} />
        ) : activeChamberPanel === 'stats' ? (
          <PlayerStatsView
            state={state}
            hiddenStats={hiddenStats}
            selectedRoute={selectedRoute}
            concubines={concubines}
            onClose={handleUtilityPanelClose}
          />
        ) : activeChamberPanel === 'consorts' ? (
          <ConcubineListView concubines={concubines} onClose={closeChamberPanel} />
        ) : null}

        {showSettlementReport && latestSettlementReport ? (
          <GlobalDialogueStage
            sceneLabel={latestSettlementReport.kind === 'event' ? '宫宴通报场景' : '旬月通报场景'}
            portraitLabel="娇娇立绘"
            portrait={<img src={ASSISTANT_PORTRAIT_SRC} alt="娇娇" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--assistant" />}
            ariaLabel={latestSettlementReport.kind === 'event' ? '宫宴事件通报' : '娇娇旬月通报'}
            className="global-dialogue-stage--chamber global-dialogue-stage--assistant"
            dialogueClassName="palace-dialogue-box--chamber"
            characterIdentity={latestSettlementReport.kind === 'event' ? '司乐女官' : '贴身宫女'}
            characterName={latestSettlementReport.kind === 'event' ? '掌册宫人' : '娇娇'}
            content={`${latestSettlementReport.title}。${latestSettlementReport.lines.join(' ')}`}
            nextActionLabel="记下"
            onNextAction={() => handleSettlementReportDone(latestSettlementReport.id)}
            numericFeedbackBucket="settlement"
          />
        ) : null}

        {dialogueText &&
        !isNightlyOverlayActive &&
        !showSettlementReport &&
        (activeChamberPanel === 'main' || isJiaojiaoPanel) &&
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
            nextActionLabel={
              pendingChamberDialogueAction === 'enter-map'
                ? '前往地图'
                : pendingChamberDialogueAction === 'reopen-expense-choice'
                  ? '重新选择'
                  : pendingChamberDialogueAction === 'overnight-transition'
                    ? '歇下'
                    : '收起'
            }
            onNextAction={handleChamberDialogueDone}
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
