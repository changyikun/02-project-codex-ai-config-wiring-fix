import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AffairsPanelView, BondPanelView, ChroniclePanelView, InventoryPanelView, MiscInfoPanelView } from '../components/chamber/ChamberUtilityViews';
import { BaohuaHallView } from '../components/chamber/BaohuaHallView';
import { DowagerAudiencePanel } from '../components/chamber/DowagerAudiencePanel';
import { HuaQingPoolView } from '../components/chamber/HuaQingPoolView';
import { KitchenView } from '../components/chamber/KitchenView';
import { MiaoYinHallView } from '../components/chamber/MiaoYinHallView';
import { NightlyServiceEventView, OVERNIGHT_TRANSITION_MS } from '../components/chamber/NightlyServiceEventView';
import { TaiHospitalView } from '../components/chamber/TaiHospitalView';
import { YetingYardView } from '../components/chamber/YetingYardView';
import { ConcubineListView } from '../components/consorts/ConcubineListView';
import { ConsortAudiencePanel } from '../components/consorts/ConsortAudiencePanel';
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
import {
  HAREM_OUTSIDE_BACKGROUND,
  LOCATION_SCENE_BACKGROUNDS,
  YANGXIN_VERDICT_BACKGROUND,
  resolvePlayerHomeBackground,
} from '../config/locationSceneBackgrounds';
import { buildRandomMusicScoreItem } from '../game/data/inventoryPresets';
import { buildInitialBondProfile } from '../game/data/bondPresets';
import {
  getConcubineDisplayRankText,
  getConcubinePortraitPath,
} from '../game/data/concubineRoster';
import {
  buildChamberActionNarrative,
  buildMapTransitionNarrative,
} from '../game/lib/actionNarrativeRuntime';
import { getRarityColor } from '../game/lib/bedchamberRuntime';
import { isJiaojiaoSpokenText } from '../game/lib/dialoguePresentation';
import { getNpcActivitiesAtLocation, getPendingNpcPlayerVisit } from '../game/lib/npcActivityRuntime';
import { useGameFlowStore } from '../game/store/gameFlowStore';

const skillLabelMap: Record<string, string> = {
  poetry: '诗词',
  painting: '丹青',
  talent: '乐理',
  embroidery: '刺绣',
  medicine: '药理',
  politics: '政治',
};

const ATTRIBUTE_STATS_FINALIZED_FLAG = 'attributeStatsFinalized';

const resolveSkillDisplayValue = (rawValue: number, statsFinalized: boolean): number => {
  if (!Number.isFinite(rawValue)) {
    return 0;
  }

  return Math.round(statsFinalized || Math.abs(rawValue) > 10 ? rawValue : rawValue * 10);
};

const bottomToolMessage: Record<string, string> = {
  举办宴席: '宴席入口已预留，后续会接入宫宴花费、来客与声望收益。',
  皇嗣管理: '皇嗣管理入口已预留，后续会接入孩子成长、教育与立储判定。',
};
const ASSISTANT_PORTRAIT_SRC = '/assets/dialogue/jiaojiao-final.png';
const EUNUCH_PORTRAIT_SRC = '/assets/characters/men/taijian.png';
const EMPEROR_PORTRAIT_SRC = '/assets/characters/men/emperor.jpg';
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
type PendingChamberDialogueAction =
  | 'enter-map'
  | 'reopen-expense-choice'
  | 'overnight-reminder'
  | 'overnight-transition'
  | null;

type NpcPlayerVisitChoiceId = 'receive' | 'probe' | 'decline';

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

const npcVisitPurposeLabel: Record<string, string> = {
  gift: '送礼',
  probe: '试探',
  'win-over': '拉拢',
  gossip: '传话',
  pressure: '施压',
};

const buildNpcPlayerVisitOpening = (visitorName: string, purpose: string): string => {
  const purposeLabel = npcVisitPurposeLabel[purpose] ?? '递话';
  if (purpose === 'gift') {
    return `${visitorName}遣宫人先递了话，随后亲自入殿，将随身带来的匣子轻轻搁在案边。她笑意不深，只说今日路过，想来问候娘娘几句。`;
  }
  if (purpose === 'pressure') {
    return `${visitorName}来得不算突然，却也没有给你推辞的余地。她在帘外停了一息，入内后先看了看殿中陈设，才把话锋压低。`;
  }
  if (purpose === 'gossip') {
    return `${visitorName}带着几句宫里新起的风声来访。她没有急着坐下，只把话说得半真半隐，像是等你先表态。`;
  }
  return `${visitorName}今日主动来访，话说得周全，却处处留着余地。她此行像是${purposeLabel}，也像是在看你会如何接她这一局。`;
};

const buildNpcPlayerVisitResult = (visitorName: string, choiceId: NpcPlayerVisitChoiceId): string => {
  if (choiceId === 'receive') {
    return `你命人奉茶，请${visitorName}入座。她神色稍缓，话里少了几分试探，临走前也肯多留一句余地。`;
  }
  if (choiceId === 'probe') {
    return `你顺着${visitorName}的话锋问回去，没有急着应下。她听出你的防备，面上仍笑，眼底却多了几分重新估量。`;
  }
  return `你借身体乏累婉言送客。${visitorName}没有当场失态，只把未尽的话收了回去，离殿时脚步比来时轻了些。`;
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
    patchConcubineById,
    customConsorts,
    nightlyService,
    finalizePendingNightlyService,
    acknowledgeNightlyServiceNotice,
    settlementReports,
    latestSettlementReportId,
    lastSeenSettlementReportId,
    acknowledgeSettlementReport,
    pendingOvernightReturn,
    clearOvernightReturn,
    completeOvernightTransition,
    npcActivity,
    acknowledgeNpcPlayerVisit,
    resolveNpcActivityEntry,
    pendingYangxinVerdict,
    advanceYangxinVerdict,
    finalizeYangxinVerdict,
  } = useGameFlowStore();
  const [dialogueText, setDialogueText] = useState('');
  const [bedchamberGiftItemName, setBedchamberGiftItemName] = useState('');
  const [overnightTransitionPhase, setOvernightTransitionPhase] = useState<OvernightTransitionPhase>('hidden');
  const [overnightTransitionReason, setOvernightTransitionReason] = useState<'deep-night' | 'stamina' | undefined>(undefined);
  const [endXunAfterNightNotice, setEndXunAfterNightNotice] = useState(false);
  const [expenseStrategyPanelOpen, setExpenseStrategyPanelOpen] = useState(false);
  const [utilityReturnPanel, setUtilityReturnPanel] = useState<ChamberPanelId | null>(null);
  const [npcPlayerVisitResultText, setNpcPlayerVisitResultText] = useState('');
  const [yangxinStatementIndex, setYangxinStatementIndex] = useState(0);
  const [activeLocationAudience, setActiveLocationAudience] = useState<{
    entryId: string;
    consortId: string;
    summary: string;
  } | null>(null);
  const [pendingChamberDialogueAction, setPendingChamberDialogueAction] =
    useState<PendingChamberDialogueAction>(null);
  const overnightTransitionRunKeyRef = useRef<string | null>(null);
  const suppressNextYangxinEntryNarrativeRef = useRef(false);
  const isResidenceLocation = activeMapLocation === state.residenceName;
  const isOutsideScene = Boolean(activeMapLocation && !isResidenceLocation);
  const isJianzhangAudience = activeChamberPanel === 'main' && activeMapLocation === '建章宫';
  const isKitchenScene = activeChamberPanel === 'main' && activeMapLocation === '御膳房';
  const isBaohuaHallScene = activeChamberPanel === 'main' && activeMapLocation === '宝华殿';
  const isHuaQingPoolScene = activeChamberPanel === 'main' && activeMapLocation === '华清池';
  const isTaiHospitalScene = activeChamberPanel === 'main' && activeMapLocation === '太医院';
  const isMiaoYinHallScene = activeChamberPanel === 'main' && activeMapLocation === '妙音堂';
  const isYetingYardScene = activeChamberPanel === 'main' && activeMapLocation === '掖庭院';
  const isHaremPanelActive = activeChamberPanel === 'harem';
  const pendingNightlyServiceEvent = nightlyService.pendingEvent;
  const pendingNightlyServiceNotice = nightlyService.pendingNotice;
  const shouldDelayNightlyServiceOverlay = Boolean(dialogueText || pendingYangxinVerdict);
  const shouldShowPendingNightlyServiceEvent = Boolean(pendingNightlyServiceEvent && !shouldDelayNightlyServiceOverlay);
  const shouldShowPendingNightlyServiceNotice = Boolean(
    !shouldShowPendingNightlyServiceEvent && pendingNightlyServiceNotice && !shouldDelayNightlyServiceOverlay,
  );
  const isOvernightTransitionActive = overnightTransitionPhase !== 'hidden';
  const isOvernightTransitionVisualActive = isOvernightTransitionActive && !pendingYangxinVerdict;
  const isNightlyOverlayActive = Boolean(
    shouldShowPendingNightlyServiceEvent || shouldShowPendingNightlyServiceNotice || isOvernightTransitionVisualActive,
  );
  const shouldHideChamberUiForNightlyOverlay = Boolean(
    shouldShowPendingNightlyServiceEvent || shouldShowPendingNightlyServiceNotice || (overnightTransitionPhase === 'fade-in' && !pendingYangxinVerdict),
  );
  const isJiaojiaoPanel = activeChamberPanel === 'jiaojiao';
  const isFullSurfacePanel = activeChamberPanel !== 'main' && !isJiaojiaoPanel;
  const showResidenceUi = !isOutsideScene && !isFullSurfacePanel;
  const currentSceneLabel = isHaremPanelActive ? '后宫' : activeMapLocation ?? state.residenceName;
  const currentSceneBackground =
    pendingYangxinVerdict && pendingYangxinVerdict.stage !== 'summon'
      ? YANGXIN_VERDICT_BACKGROUND
      : isHaremPanelActive
      ? HAREM_OUTSIDE_BACKGROUND
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
  const allConsorts = useMemo(() => [...concubines, ...customConsorts], [concubines, customConsorts]);
  const activeLocationNpcActivities = useMemo(() => {
    if (!activeMapLocation || isResidenceLocation) {
      return [];
    }
    return getNpcActivitiesAtLocation(npcActivity, activeMapLocation, { includeResolved: true })
      .map((entry) => {
        const consort = allConsorts.find((candidate) => candidate.id === entry.actorConsortId);
        return consort ? { entry, consort } : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [activeMapLocation, allConsorts, isResidenceLocation, npcActivity]);
  const activeLocationAudienceConsort = useMemo(
    () => allConsorts.find((consort) => consort.id === activeLocationAudience?.consortId) ?? null,
    [activeLocationAudience, allConsorts],
  );

  useEffect(() => {
    ensureBondProfile(state.routeId);
    ensureConcubines(state.routeId);
  }, [ensureBondProfile, ensureConcubines, state.routeId]);

  useEffect(() => {
    setActiveLocationAudience(null);
  }, [activeMapLocation]);

  useEffect(() => {
    setYangxinStatementIndex(0);
  }, [pendingYangxinVerdict?.id, pendingYangxinVerdict?.stage]);

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
        setOvernightTransitionReason(undefined);
        return;
      }

      completeOvernightTransition(overnightTransitionReason);
      setOvernightTransitionPhase('settlement');
    }, OVERNIGHT_TRANSITION_MS);

    return () => window.clearTimeout(timer);
  }, [completeOvernightTransition, overnightTransitionPhase, overnightTransitionReason, time.month, time.slotIndex, time.slotProgress, time.xun, time.year]);

  useEffect(() => {
    if (pendingYangxinVerdict) {
      setPendingChamberDialogueAction(null);
      setDialogueText('');
      return;
    }

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
      activeMapLocation === '妙音堂' ||
      activeMapLocation === '掖庭院'
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
      if (activeMapLocation === '养心殿' && suppressNextYangxinEntryNarrativeRef.current) {
        suppressNextYangxinEntryNarrativeRef.current = false;
        setPendingChamberDialogueAction(null);
        setDialogueText('');
        return;
      }
      setPendingChamberDialogueAction(null);
      setDialogueText(buildMapTransitionNarrative({ kind: 'enter-location', locationName: activeMapLocation }));
      return;
    }

    // Keep locally-triggered action narratives visible across the stat/time rerender.
  }, [activeChamberPanel, activeMapLocation, isResidenceLocation, mapEventText, patchState, pendingYangxinVerdict, setMapEventText, state.flags, state.residenceName]);

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
        value: resolveSkillDisplayValue(Number(state.stats[key] ?? 0), Boolean(state.flags[ATTRIBUTE_STATS_FINALIZED_FLAG])),
      })),
    [state.flags, state.stats],
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
      !pendingYangxinVerdict &&
      !pendingNightlyServiceEvent &&
      !pendingNightlyServiceNotice &&
      (overnightTransitionPhase === 'hidden' || overnightTransitionPhase === 'settlement') &&
      activeChamberPanel === 'main' &&
      !shouldSuppressSettlementReportForScene,
  );
  const pendingNpcPlayerVisit = useMemo(() => getPendingNpcPlayerVisit(npcActivity), [npcActivity]);
  const pendingNpcPlayerVisitor = useMemo(
    () => concubines.find((consort) => consort.id === pendingNpcPlayerVisit?.actorConsortId),
    [concubines, pendingNpcPlayerVisit],
  );
  const canReceiveNpcPlayerVisit = Boolean(
    pendingNpcPlayerVisit &&
      pendingNpcPlayerVisitor &&
      !dialogueText &&
      !pendingYangxinVerdict &&
      !showSettlementReport &&
      !isNightlyOverlayActive &&
      !bedchamberGiftItemName &&
      !expenseStrategyPanelOpen &&
      activeChamberPanel === 'main' &&
      !isOutsideScene &&
      time.slotIndex >= 2,
  );
  const showNpcPlayerVisit = canReceiveNpcPlayerVisit;
  const npcPlayerVisitOptions = useMemo(
    () =>
      npcPlayerVisitResultText
        ? []
        : [
            { id: 'receive', label: '请她入座', effectHint: '态度转暖，对你关系小幅上升。' },
            { id: 'probe', label: '试探来意', effectHint: '保留防备，关系略有波动。' },
            { id: 'decline', label: '婉言送客', effectHint: '拒绝来访，对你关系下降。' },
          ],
    [npcPlayerVisitResultText],
  );
  const hasMoreYangxinStatements = Boolean(
    pendingYangxinVerdict?.stage === 'statements' &&
      pendingYangxinVerdict.statements.length > 0 &&
      yangxinStatementIndex < pendingYangxinVerdict.statements.length - 1,
  );
  const yangxinVerdictDialogue = useMemo(() => {
    if (!pendingYangxinVerdict) {
      return undefined;
    }

    const buildPortrait = (speakerId: string, speakerName: string): { label: string; portrait?: ReactNode } => {
      if (speakerId === 'emperor') {
        return {
          label: '皇帝立绘',
          portrait: (
            <img
              src={EMPEROR_PORTRAIT_SRC}
              alt="皇帝"
              className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--emperor"
            />
          ),
        };
      }

      if (speakerId === 'jiaojiao') {
        return {
          label: '娇娇立绘',
          portrait: (
            <img
              src={ASSISTANT_PORTRAIT_SRC}
              alt="娇娇"
              className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--assistant"
            />
          ),
        };
      }

      if (speakerId === 'player') {
        return {
          label: '主角立绘',
          portrait: selectedRoute?.portrait ? (
            <img
              src={selectedRoute.portrait}
              alt="你"
              className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--player"
            />
          ) : undefined,
        };
      }

      const consortId = speakerId.startsWith('consort-') ? speakerId.slice('consort-'.length) : '';
      const consort = allConsorts.find((candidate) => candidate.id === consortId);
      if (consort) {
        return {
          label: `${consort.name}立绘`,
          portrait: (
            <AutoCutoutPortrait
              src={getConcubinePortraitPath(consort.portraitId)}
              alt={consort.name}
              threshold={18}
              sampleInset={16}
              className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--consort"
            />
          ),
        };
      }

      return { label: `${speakerName}剪影` };
    };

    if (pendingYangxinVerdict.stage === 'summon') {
      return {
        sceneLabel: '养心殿传唤',
        portraitLabel: '内侍立绘',
        portrait: (
          <img
            src={EUNUCH_PORTRAIT_SRC}
            alt="内侍"
            className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--eunuch"
          />
        ),
        characterIdentity: '传旨内侍',
        characterName: '内侍',
        content: '养心殿传旨，请娘娘即刻前往听裁。',
        nextActionLabel: '前往养心殿',
      };
    }

    if (pendingYangxinVerdict.stage === 'statements') {
      const statement =
        pendingYangxinVerdict.statements[Math.min(yangxinStatementIndex, Math.max(0, pendingYangxinVerdict.statements.length - 1))];
      if (!statement) {
        return {
          sceneLabel: '养心殿裁断',
          portraitLabel: '皇帝立绘',
          portrait: buildPortrait('emperor', '皇帝').portrait,
          characterIdentity: '裁断者',
          characterName: '皇帝',
          content: '相关人已经到齐，皇帝命内廷呈上案卷。',
          nextActionLabel: '回话',
        };
      }

      const portraitConfig = buildPortrait(statement.speakerId, statement.speakerName);
      return {
        sceneLabel: '养心殿裁断',
        portraitLabel: portraitConfig.label,
        portrait: portraitConfig.portrait,
        characterIdentity: statement.speakerRole,
        characterName: statement.speakerId === 'player' ? '你' : statement.speakerName,
        content: statement.text,
        nextActionLabel: hasMoreYangxinStatements ? '继续听裁' : '回话',
      };
    }

    if (pendingYangxinVerdict.stage === 'player-choice') {
      const portraitConfig = buildPortrait('emperor', '皇帝');
      const playerIsSuspect = pendingYangxinVerdict.attendees.some(
        (attendee) => attendee.id === 'player' && attendee.role === '定罪候选人',
      );
      return {
        sceneLabel: '养心殿求情',
        portraitLabel: portraitConfig.label,
        portrait: portraitConfig.portrait,
        characterIdentity: '裁断者',
        characterName: '皇帝',
        content: playerIsSuspect
          ? '皇帝将案卷合上，准你在裁断落下前为自己说最后一句。你要如何自处？'
          : '皇帝将案卷合上，准你在裁断落下前说最后一句。你要如何回话？',
        nextActionLabel: undefined,
      };
    }

    const portraitConfig = buildPortrait('emperor', '皇帝');
    return {
      sceneLabel: '养心殿裁断结果',
      portraitLabel: portraitConfig.label,
      portrait: portraitConfig.portrait,
      characterIdentity: '裁断者',
      characterName: '皇帝',
      content: pendingYangxinVerdict.result?.summary ?? '皇帝已经落下裁断，命内廷照此执行。',
      nextActionLabel: '退下',
    };
  }, [allConsorts, hasMoreYangxinStatements, pendingYangxinVerdict, selectedRoute?.portrait, yangxinStatementIndex]);
  const yangxinVerdictOptions =
    pendingYangxinVerdict?.stage === 'player-choice'
      ? pendingYangxinVerdict.playerChoices.map((choice) => ({
          id: choice.id,
          label: choice.label,
          effectHint: choice.effectHint,
        }))
      : [];
  const isJiaojiaoChamberDialogue = isJiaojiaoSpokenText(dialogueText);
  const chamberDialogueClassName = `global-dialogue-stage--chamber ${
    isJiaojiaoChamberDialogue ? 'global-dialogue-stage--assistant' : 'global-dialogue-stage--narration'
  }`;
  const isChamberDialogueBlocking = Boolean(
    dialogueText ||
      pendingYangxinVerdict ||
      showSettlementReport ||
      showNpcPlayerVisit ||
      isNightlyOverlayActive ||
      bedchamberGiftItemName ||
      Boolean(activeLocationAudience),
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

    if (currentSceneBackground !== displayedSceneBackground && isChamberDialogueBlocking && !pendingYangxinVerdict) {
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
    pendingYangxinVerdict,
    pendingSceneBackground,
  ]);

  const handleSidebar = (buttonId: string) => {
    if (isChamberUiInteractionLocked) {
      return;
    }

    const currentUtilityReturnPanel = activeChamberPanel === 'harem' || activeChamberPanel === 'jiaojiao' ? activeChamberPanel : null;

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
        handleUtilityPanelClose();
        return;
      }
      setUtilityReturnPanel((current) => current ?? currentUtilityReturnPanel);
      openChamberPanel(buttonId);
      setPendingChamberDialogueAction(null);
      setDialogueText('');
    }
  };

  const handleReturnHomeFromLocation = () => {
    if (isChamberUiInteractionLocked) {
      return;
    }

    setActiveLocationAudience(null);
    setPendingChamberDialogueAction(null);
    setDialogueText('');
    setMapEventText('');
    enterMainChamber();
  };

  const beginOvernightTransition = (reason?: 'deep-night' | 'stamina') => {
    enterMainChamber();
    setPendingChamberDialogueAction(null);
    setDialogueText('');
    setOvernightTransitionReason(reason);
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
    setOvernightTransitionReason(pendingOvernightReturn.reason);
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

  const handleYangxinVerdictNext = () => {
    if (!pendingYangxinVerdict) {
      return;
    }
    if (pendingYangxinVerdict.stage === 'statements' && hasMoreYangxinStatements) {
      setYangxinStatementIndex((current) => Math.min(current + 1, pendingYangxinVerdict.statements.length - 1));
      return;
    }
    if (pendingYangxinVerdict.stage === 'verdict') {
      setOvernightTransitionPhase('hidden');
      setOvernightTransitionReason(undefined);
      suppressNextYangxinEntryNarrativeRef.current = true;
      finalizeYangxinVerdict(pendingYangxinVerdict.id);
      return;
    }
    advanceYangxinVerdict();
  };

  const handleYangxinVerdictChoice = (choiceId: string) => {
    advanceYangxinVerdict(choiceId as Parameters<typeof advanceYangxinVerdict>[0]);
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
      beginOvernightTransition(overnightTransitionReason);
      return;
    }

    setPendingChamberDialogueAction(null);
    setDialogueText('');
  };

  const handleStartLocationAudience = (entryId: string) => {
    const activity = activeLocationNpcActivities.find((item) => item.entry.id === entryId);
    if (!activity || activity.entry.resolved) {
      return;
    }
    setDialogueText('');
    setPendingChamberDialogueAction(null);
    setActiveLocationAudience({
      entryId,
      consortId: activity.consort.id,
      summary: activity.entry.summary,
    });
    resolveNpcActivityEntry(entryId);
  };

  const handleNpcPlayerVisitChoice = (choiceId: string) => {
    if (!pendingNpcPlayerVisit || !pendingNpcPlayerVisitor) {
      return;
    }
    const resolvedChoiceId = choiceId as NpcPlayerVisitChoiceId;
    const relationDelta = resolvedChoiceId === 'receive' ? 3 : resolvedChoiceId === 'probe' ? -1 : -4;
    const stressDelta = resolvedChoiceId === 'receive' ? -1 : resolvedChoiceId === 'probe' ? 1 : 2;
    patchConcubineById(pendingNpcPlayerVisitor.id, (current) => ({
      ...current,
      stats: {
        ...current.stats,
        relationToPlayer: Math.max(-100, Math.min(100, current.stats.relationToPlayer + relationDelta)),
        stress: Math.max(0, Math.min(100, current.stats.stress + stressDelta)),
      },
    }));
    setNpcPlayerVisitResultText(buildNpcPlayerVisitResult(pendingNpcPlayerVisitor.name, resolvedChoiceId));
  };

  const handleNpcPlayerVisitDone = () => {
    if (!pendingNpcPlayerVisit) {
      setNpcPlayerVisitResultText('');
      return;
    }
    acknowledgeNpcPlayerVisit(pendingNpcPlayerVisit.id);
    setNpcPlayerVisitResultText('');
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

  useEffect(() => {
    setNpcPlayerVisitResultText('');
  }, [pendingNpcPlayerVisit?.id]);

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
            portraitLabel="内侍立绘"
            portrait={<img src={EUNUCH_PORTRAIT_SRC} alt="内侍" className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--eunuch" />}
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

        {!pendingYangxinVerdict && !pendingNightlyServiceEvent && !pendingNightlyServiceNotice && isOvernightTransitionActive ? (
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

        {!shouldHideChamberUiForNightlyOverlay &&
        activeChamberPanel === 'main' &&
        activeMapLocation &&
        !isResidenceLocation &&
        !activeLocationAudience &&
        activeLocationNpcActivities.length > 0 &&
        !dialogueText &&
        !pendingYangxinVerdict &&
        !showSettlementReport &&
        !showNpcPlayerVisit &&
        !isNightlyOverlayActive ? (
          <section className="chamber-main__location-visitors" aria-label={`${activeMapLocation}可交互妃嫔`}>
            <strong>本旬在此</strong>
            {activeLocationNpcActivities.map(({ entry, consort }) => (
              <button key={entry.id} type="button" disabled={entry.resolved} onClick={() => handleStartLocationAudience(entry.id)}>
                {entry.resolved
                  ? `${getConcubineDisplayRankText(consort)} ${consort.name}仍在此处（已交谈）`
                  : `与${getConcubineDisplayRankText(consort)} ${consort.name}交谈`}
              </button>
            ))}
          </section>
        ) : null}

        {!shouldHideChamberUiForNightlyOverlay && activeLocationAudience && activeLocationAudienceConsort && activeMapLocation ? (
          <ConsortAudiencePanel
            consort={activeLocationAudienceConsort}
            palaceLabel={activeMapLocation}
            hallLabel="偶遇"
            concubines={concubines}
            backLabel={`返回${activeMapLocation}`}
            initialActionLabel={`${activeMapLocation}偶遇`}
            initialActionResult={`${buildMapTransitionNarrative({
              kind: 'enter-location',
              locationName: activeMapLocation,
            })}${activeLocationAudience.summary}你看见${getConcubineDisplayRankText(activeLocationAudienceConsort)} ${
              activeLocationAudienceConsort.name
            }正在此处，便主动上前搭话。`}
            onBack={() => setActiveLocationAudience(null)}
          />
        ) : !shouldHideChamberUiForNightlyOverlay && isKitchenScene ? (
          <KitchenView concubines={concubines} />
        ) : isBaohuaHallScene ? (
          <BaohuaHallView concubines={concubines} />
        ) : isHuaQingPoolScene ? (
          <HuaQingPoolView concubines={concubines} />
        ) : isTaiHospitalScene ? (
          <TaiHospitalView concubines={concubines} />
        ) : isMiaoYinHallScene ? (
          <MiaoYinHallView concubines={concubines} />
        ) : isYetingYardScene ? (
          <YetingYardView />
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
            onClose={handleUtilityPanelClose}
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
          <ConcubineListView concubines={concubines} onClose={handleUtilityPanelClose} />
        ) : null}

        {pendingYangxinVerdict && yangxinVerdictDialogue ? (
          <GlobalDialogueStage
            sceneLabel={yangxinVerdictDialogue.sceneLabel}
            portraitLabel={yangxinVerdictDialogue.portraitLabel}
            portrait={yangxinVerdictDialogue.portrait}
            ariaLabel="养心殿裁断"
            className="global-dialogue-stage--chamber global-dialogue-stage--yangxin"
            dialogueClassName="palace-dialogue-box--chamber"
            characterIdentity={yangxinVerdictDialogue.characterIdentity}
            characterName={yangxinVerdictDialogue.characterName}
            content={yangxinVerdictDialogue.content}
            options={yangxinVerdictOptions}
            onSelectOption={pendingYangxinVerdict.stage === 'player-choice' ? handleYangxinVerdictChoice : undefined}
            nextActionLabel={yangxinVerdictDialogue.nextActionLabel}
            onNextAction={pendingYangxinVerdict.stage === 'player-choice' ? undefined : handleYangxinVerdictNext}
            numericFeedbackBucket="settlement"
          />
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

        {showNpcPlayerVisit && pendingNpcPlayerVisit && pendingNpcPlayerVisitor ? (
          <GlobalDialogueStage
            sceneLabel="妃嫔拜访寝殿场景"
            portraitLabel={`${pendingNpcPlayerVisitor.name}立绘`}
            portrait={
              <AutoCutoutPortrait
                src={getConcubinePortraitPath(pendingNpcPlayerVisitor.portraitId)}
                alt={pendingNpcPlayerVisitor.name}
                threshold={18}
                sampleInset={16}
                className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--consort"
              />
            }
            ariaLabel="妃嫔拜访寝殿"
            className="global-dialogue-stage--chamber global-dialogue-stage--narration"
            dialogueClassName="palace-dialogue-box--chamber"
            characterIdentity={getConcubineDisplayRankText(pendingNpcPlayerVisitor)}
            characterName={pendingNpcPlayerVisitor.name}
            content={
              npcPlayerVisitResultText ||
              buildNpcPlayerVisitOpening(
                `${getConcubineDisplayRankText(pendingNpcPlayerVisitor)} ${pendingNpcPlayerVisitor.name}`,
                pendingNpcPlayerVisit.purpose,
              )
            }
            options={npcPlayerVisitOptions}
            onSelectOption={npcPlayerVisitResultText ? undefined : handleNpcPlayerVisitChoice}
            nextActionLabel={npcPlayerVisitResultText ? '记下' : undefined}
            onNextAction={npcPlayerVisitResultText ? handleNpcPlayerVisitDone : undefined}
          />
        ) : null}

        {dialogueText &&
        !isNightlyOverlayActive &&
        !showSettlementReport &&
        !showNpcPlayerVisit &&
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
