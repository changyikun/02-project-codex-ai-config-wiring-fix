import { useMemo, useState } from 'react';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { AutoCutoutPortrait } from '../visual/AutoCutoutPortrait';
import {
  getConcubineDisplayRankText,
  getConcubinePortraitPath,
} from '../../game/data/concubineRoster';
import {
  requestBaohuaLocalDialogue,
  type BaohuaDialogueActor,
} from '../../game/lib/baohuaDialogueRuntime';
import { buildLocationActionNarrative } from '../../game/lib/actionNarrativeRuntime';
import { clampToRange, trimDialogueHistory } from '../../game/lib/dialogueSceneUtils';
import {
  CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN,
  buildConsortPublicEncounterSendOffNarrativeEntry,
  type ConsortSendOffNarrative,
} from '../../game/lib/consortVisitRuntime';
import { getNpcActivitiesAtLocation } from '../../game/lib/npcActivityRuntime';
import { requestRelationshipJudgementLocal } from '../../game/lib/relationshipJudgeRuntime';
import { requestTempleAmbientLocal } from '../../game/lib/templeAmbientRuntime';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type {
  ConcubineProfile,
  ConsortDialogueOption,
  ConsortDialogueTurn,
} from '../../game/types';
import { LocationActionResultStage } from './LocationActionResultStage';
import { MapSubsceneView, type SubsceneActionEntry, type SubsceneNpcEntry } from './MapSubsceneView';
import { useLocationActionFlow, type TimedLocationActionOutcome } from './useLocationActionFlow';

interface BaohuaHallViewProps {
  concubines: ConcubineProfile[];
}

interface HistoryEntry {
  speaker: string;
  text: string;
}

interface BaohuaSceneActor extends BaohuaDialogueActor {
  portraitSrc: string;
  consortId?: string;
}

const DANGYI_PORTRAIT_SRC = '/assets/characters/men/dangyi.png';

const buildDangYiActor = (favor: number, affection: number): BaohuaSceneActor => ({
  id: 'dangyi',
  name: '当一',
  identity: '佛殿执事',
  residence: '宝华殿',
  personality: '寡言沉静，眼净心稳，擅观人心，不轻许诺，却肯在关键处点醒迷局。',
  summary: '宝华殿执事，常年守殿抄经，看似离俗，实则对宫中暗流与人心执念都看得极清。',
  currentGoodwill: favor,
  currentAffection: affection,
  actorKind: 'dangyi',
  portraitSrc: DANGYI_PORTRAIT_SRC,
});

const buildConsortActor = (consort: ConcubineProfile): BaohuaSceneActor => ({
  id: consort.id,
  name: consort.name,
  identity: getConcubineDisplayRankText(consort),
  residence: consort.residence,
  personality: consort.personality,
  summary: consort.summary,
  currentGoodwill: consort.stats.relationToPlayer,
  currentAffection: consort.stats.affection,
  actorKind: 'consort',
  portraitSrc: getConcubinePortraitPath(consort.portraitId),
  consortId: consort.id,
});

export function BaohuaHallView({ concubines }: BaohuaHallViewProps) {
  const {
    state,
    hiddenStats,
    time,
    templeProgress,
    patchTempleProgress,
    applyStoryEffects,
    applyConsortRelationshipJudgement,
    npcActivity,
    resolveNpcActivityEntry,
    enterMapMain,
  } = useGameFlowStore();
  const { beginTimedLocationAction, finishTimedLocationAction } = useLocationActionFlow();
  const [activeActor, setActiveActor] = useState<BaohuaSceneActor | null>(null);
  const [dialogueTurn, setDialogueTurn] = useState<ConsortDialogueTurn | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sceneHint, setSceneHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [systemMessage, setSystemMessage] = useState('梵音低回，香雾袅袅，宝华殿里连脚步声都被压得很轻。');
  const [activeEncounterLabel, setActiveEncounterLabel] = useState('宝华殿偶遇');
  const [pendingDangYiUnlock, setPendingDangYiUnlock] = useState(false);
  const [actionResultText, setActionResultText] = useState('');
  const [pendingTimedActionOutcome, setPendingTimedActionOutcome] = useState<TimedLocationActionOutcome | null>(null);
  const [pendingEncounterSendOff, setPendingEncounterSendOff] = useState<ConsortSendOffNarrative | null>(null);

  const playerRankLabel = hiddenStats.initialRank ?? '宫妃';
  const dialogueOptions = dialogueTurn?.options ?? [];
  const isDangYiMet = Boolean(state.flags.isDangYiMet);
  const scheduledConsortActivity = useMemo(() => {
    const scheduledEntries = getNpcActivitiesAtLocation(npcActivity, '宝华殿');
    const entry = scheduledEntries.find((candidate) => concubines.some((consort) => consort.id === candidate.actorConsortId));
    const consort = entry ? concubines.find((candidate) => candidate.id === entry.actorConsortId) : undefined;
    return entry && consort ? { entry, consort } : null;
  }, [concubines, npcActivity]);
  const buildPayload = (
    actor: BaohuaSceneActor,
    topic: 'visit' | 'follow-up',
    actionId: string,
    actionLabel: string,
    overrides?: {
      actionResult?: string;
      selectedOptionId?: string;
      selectedOptionLabel?: string;
      historyOverride?: HistoryEntry[];
    },
  ) => {
    const activeHistory = trimDialogueHistory(overrides?.historyOverride ?? history);

    return {
      routeId: state.routeId,
      playerName: state.name,
      playerRank: playerRankLabel,
      playerResidence: state.residenceName,
      playerOpeningTendency: state.openingTendency,
      canPunish: false,
      topic,
      actionId,
      actionLabel,
      actionResult: overrides?.actionResult,
      selectedOptionId: overrides?.selectedOptionId,
      selectedOptionLabel: overrides?.selectedOptionLabel,
      history: activeHistory,
      recentContext: activeHistory.map((entry) => `${entry.speaker}：${entry.text}`),
      playerContext: {
        favor: state.favor,
        stress: state.stress,
        prestige: state.prestige,
        trueHeart: state.trueHeart,
        silver: state.silver,
        stamina: state.stamina,
        stats: state.stats,
      },
      consortContext: {
        id: actor.id,
        name: actor.name,
        rank: actor.identity,
        residence: actor.residence,
        stateLabel: '寻常',
        personality: actor.personality,
        summary: actor.summary,
        currentGoodwill: actor.currentGoodwill,
        currentAffection: actor.currentAffection,
        emperorFavor: 0,
        stress: 0,
        allies: [] as string[],
        rivals: [] as string[],
      },
      timeContext: time,
    } as const;
  };

  const runNarrativeTurn = async (
    actor: BaohuaSceneActor,
    topic: 'visit' | 'follow-up',
    actionId: string,
    actionLabel: string,
    overrides?: {
      actionResult?: string;
      selectedOptionId?: string;
      selectedOptionLabel?: string;
      historyOverride?: HistoryEntry[];
    },
  ) => {
    const payload = buildPayload(actor, topic, actionId, actionLabel, overrides);
    const nextTurn = await requestBaohuaLocalDialogue(payload, actor);
    const speakerLabel = `${nextTurn.speakerIdentity} · ${nextTurn.speakerName}`;

    setDialogueTurn(nextTurn);
    setSceneHint(nextTurn.sceneHint ?? '');
    setHistory((currentHistory) =>
      trimDialogueHistory([...(overrides?.historyOverride ?? currentHistory), { speaker: speakerLabel, text: nextTurn.text }]),
    );
  };

  const finalizeDangYiUnlockIfNeeded = () => {
    if (!pendingDangYiUnlock) {
      return;
    }
    applyStoryEffects({ flags: { isDangYiMet: true } });
    setPendingDangYiUnlock(false);
    setSystemMessage('你已在宝华殿结识当一，此后这里会长期留下他的入口。');
  };

  const beginEncounter = async (
    actor: BaohuaSceneActor,
    actionId: string,
    actionLabel: string,
    actionResult: string,
  ) => {
    setBusy(true);
    setActiveActor(actor);
    setDialogueTurn(null);
    setHistory([]);
    setSceneHint('');
    setActiveEncounterLabel(actionLabel);
    setPendingEncounterSendOff(null);

    try {
      await runNarrativeTurn(actor, 'visit', actionId, actionLabel, {
        actionResult,
        historyOverride: [],
      });
    } finally {
      setBusy(false);
    }
  };

  const showActionResult = (text: string, outcome: TimedLocationActionOutcome) => {
    setSystemMessage(text);
    setActionResultText(text);
    setPendingTimedActionOutcome(outcome.shouldSleep ? outcome : null);
  };

  const holdTimedActionOutcome = (outcome: TimedLocationActionOutcome) => {
    setActionResultText('');
    setPendingTimedActionOutcome(outcome.shouldSleep ? outcome : null);
  };

  const closeActionResult = () => {
    const outcome = pendingTimedActionOutcome;
    setActionResultText('');
    setPendingTimedActionOutcome(null);
    finishTimedLocationAction(outcome);
  };

  const closeEncounter = () => {
    const outcome = pendingTimedActionOutcome;
    finalizeDangYiUnlockIfNeeded();
    setActiveActor(null);
    setDialogueTurn(null);
    setHistory([]);
    setSceneHint('');
    setBusy(false);
    setPendingTimedActionOutcome(null);
    setPendingEncounterSendOff(null);
    finishTimedLocationAction(outcome);
  };

  const handleWorship = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    const actionOutcome = beginTimedLocationAction();
    const nextCount = templeProgress.worshipCount + 1;
    patchTempleProgress({ worshipCount: nextCount });

    try {
      const ambient = await requestTempleAmbientLocal({
        routeId: state.routeId,
        playerName: state.name,
        playerRank: playerRankLabel,
        location: '宝华殿',
        action: 'worship',
        stateHint: `累计礼佛${nextCount}次`,
        timeContext: time,
      });
      const resultText = buildLocationActionNarrative({
          locationId: 'baohua-hall',
          actionId: 'worship',
          actionLabel: '礼佛',
          resultText: ambient,
      });

      if (!isDangYiMet && nextCount >= 3) {
        const actor = buildDangYiActor(templeProgress.dangYiFavor, templeProgress.dangYiAffinity);
        patchTempleProgress({ lastEncounterNpcId: actor.id });
        setPendingDangYiUnlock(true);
        setSystemMessage(resultText);
        holdTimedActionOutcome(actionOutcome);
        await beginEncounter(
          actor,
          'forced-meet',
          '当一结识',
          '你连着在宝华殿礼佛至第三回，于供灯后见到了当一。',
        );
        return;
      }

      showActionResult(resultText, actionOutcome);
    } finally {
      setBusy(false);
    }
  };

  const handlePray = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    const actionOutcome = beginTimedLocationAction();
    patchTempleProgress({ prayerCount: templeProgress.prayerCount + 1 });
    applyStoryEffects({ stats: { fortune: 1 } });

    try {
      const ambient = await requestTempleAmbientLocal({
        routeId: state.routeId,
        playerName: state.name,
        playerRank: playerRankLabel,
        location: '宝华殿',
        action: 'pray',
        stateHint: `累计祈福${templeProgress.prayerCount + 1}次`,
        timeContext: time,
      });
      showActionResult(
        buildLocationActionNarrative({
          locationId: 'baohua-hall',
          actionId: 'pray',
          actionLabel: '祈福',
          resultText: `${ambient} 福德微增。`,
        }),
        actionOutcome,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleStroll = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    const actionOutcome = beginTimedLocationAction();
    const nextCount = templeProgress.strollCount + 1;
    patchTempleProgress({ strollCount: nextCount });

    try {
      const ambient = await requestTempleAmbientLocal({
        routeId: state.routeId,
        playerName: state.name,
        playerRank: playerRankLabel,
        location: '宝华殿',
        action: 'stroll-idle',
        stateHint: `闲逛第${nextCount}次`,
        timeContext: time,
      });
      patchTempleProgress({ lastAmbientText: ambient });
      showActionResult(
        buildLocationActionNarrative({
          locationId: 'baohua-hall',
          actionId: 'stroll',
          actionLabel: '闲逛',
          resultText: ambient,
        }),
        actionOutcome,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleOpenDangYi = async () => {
    if (busy) {
      return;
    }

    const actor = buildDangYiActor(templeProgress.dangYiFavor, templeProgress.dangYiAffinity);
    patchTempleProgress({ lastEncounterNpcId: actor.id });
    await beginEncounter(
      actor,
      'meet-dangyi',
      '与当一说话',
      '你绕过供灯与香案，主动朝当一走了过去。',
    );
  };

  const handleOptionSelect = async (optionId: string) => {
    if (busy || !dialogueTurn || !activeActor) {
      return;
    }

    const option = dialogueOptions.find((item) => item.id === optionId);
    if (!option) {
      return;
    }

    const nextHistory = trimDialogueHistory([
      ...history,
      {
        speaker: `${playerRankLabel} · ${state.name}`,
        text: option.label,
      },
    ]);

    setBusy(true);

    try {
      const judgement = await requestRelationshipJudgementLocal(
        {
          routeId: state.routeId,
          npcId: activeActor.id,
          sceneType: `宝华殿·${activeEncounterLabel}`,
          optionText: option.label,
          npcProfile: `${activeActor.identity} ${activeActor.name}。${activeActor.summary}。性格：${activeActor.personality}`,
          currentFavor: activeActor.currentGoodwill,
          currentAffection: activeActor.currentAffection,
          recentContext: nextHistory.map((entry) => `${entry.speaker}：${entry.text}`),
        },
        option.localToneTag,
      );

      if (activeActor.actorKind === 'consort' && activeActor.consortId) {
        const summary = applyConsortRelationshipJudgement(activeActor.consortId, 'greet', judgement);
        const nextActor = {
          ...activeActor,
          currentGoodwill: clampToRange(activeActor.currentGoodwill + summary.appliedFavorDelta, -100, 100),
          currentAffection: clampToRange(activeActor.currentAffection + summary.appliedAffectionDelta, 0, 100),
        };
        setActiveActor(nextActor);
        if (summary.actionCountThisXun >= CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN) {
          setPendingEncounterSendOff(
            buildConsortPublicEncounterSendOffNarrativeEntry(`${nextActor.identity} ${nextActor.name}`, '宝华殿'),
          );
        }

        const settlementNotice = summary.actionLimitHit
          ? '本旬与她的互动回合已用尽，关系不再变化。'
          : '本地关系结算已落地。';

        await runNarrativeTurn(nextActor, 'follow-up', 'baohua-follow-up', activeEncounterLabel, {
          actionResult: `${judgement.reason} ${settlementNotice}`,
          selectedOptionId: option.id,
          selectedOptionLabel: option.label,
          historyOverride: nextHistory,
        });
        return;
      }

      if (activeActor.actorKind === 'dangyi') {
      const nextFavor = clampToRange(templeProgress.dangYiFavor + judgement.favorDelta, -100, 100);
      const nextAffinity = clampToRange(templeProgress.dangYiAffinity + judgement.affectionDelta, 0, 100);
        patchTempleProgress({
          dangYiFavor: nextFavor,
          dangYiAffinity: nextAffinity,
          lastToneTag: judgement.toneTag,
          lastEncounterNpcId: activeActor.id,
        });
        const nextActor = {
          ...activeActor,
          currentGoodwill: nextFavor,
          currentAffection: nextAffinity,
        };
        setActiveActor(nextActor);

        await runNarrativeTurn(nextActor, 'follow-up', 'dangyi-follow-up', activeEncounterLabel, {
          actionResult: `${judgement.reason} 系统已记下你与当一这一轮的往来。`,
          selectedOptionId: option.id,
          selectedOptionLabel: option.label,
          historyOverride: nextHistory,
        });
        return;
      }

      await runNarrativeTurn(activeActor, 'follow-up', 'dowager-follow-up', activeEncounterLabel, {
        actionResult: `${judgement.reason} 这一句已被太后听进去了。`,
        selectedOptionId: option.id,
        selectedOptionLabel: option.label,
        historyOverride: nextHistory,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleNextAction = async () => {
    if (busy || !dialogueTurn || !activeActor || dialogueOptions.length > 0) {
      return;
    }

    if (dialogueTurn.phase !== 'continue' || dialogueTurn.mode !== 'line') {
      if (pendingEncounterSendOff) {
        setDialogueTurn({
          ...dialogueTurn,
          mode: 'line',
          phase: 'finish',
          speakerIdentity: pendingEncounterSendOff.speakerIdentity || '场景旁白',
          speakerName: pendingEncounterSendOff.speakerName || pendingEncounterSendOff.narrationName || '宝华殿偶遇',
          text: pendingEncounterSendOff.text,
          options: [],
          sceneHint: pendingEncounterSendOff.sceneHint || '偶遇已经收束，不宜在外景强留。',
        });
        setSceneHint(pendingEncounterSendOff.sceneHint || '偶遇已经收束，不宜在外景强留。');
        setPendingEncounterSendOff(null);
        return;
      }
      closeEncounter();
      return;
    }

    setBusy(true);

    try {
      await runNarrativeTurn(activeActor, 'follow-up', 'keep-talking', activeEncounterLabel, {
        actionResult: '你没有急着表态，只示意对方把这句话继续说完。',
      });
    } finally {
      setBusy(false);
    }
  };

  const subsceneNpcEntries = useMemo<SubsceneNpcEntry[]>(() => {
    const entries: SubsceneNpcEntry[] = [];

    if (isDangYiMet) {
      entries.push({
        id: 'fixed:dangyi',
        kind: 'fixed',
        name: '当一',
        identityLabel: '佛殿执事',
        portraitSrc: DANGYI_PORTRAIT_SRC,
        onClick: () => {
          void handleOpenDangYi();
        },
      });
    }

    if (scheduledConsortActivity) {
      const { entry, consort } = scheduledConsortActivity;
      entries.push({
        id: `consort:${entry.id}`,
        kind: 'consort',
        name: consort.name,
        identityLabel: getConcubineDisplayRankText(consort),
        portraitSrc: getConcubinePortraitPath(consort.portraitId),
        interactableState: entry.resolved ? 'spent' : 'available',
        disabledReason: entry.resolved ? '本旬已交谈过' : undefined,
        onClick: entry.resolved
          ? undefined
          : () => {
              resolveNpcActivityEntry(entry.id);
              void beginEncounter(
                buildConsortActor(consort),
                'scheduled-consort',
                '宝华殿偶遇',
                `${entry.summary}你看见${getConcubineDisplayRankText(consort)} ${consort.name}在佛灯旁停步，便主动上前搭话。`,
              );
            },
      });
    }

    return entries;
  }, [beginEncounter, handleOpenDangYi, isDangYiMet, resolveNpcActivityEntry, scheduledConsortActivity]);

  const subsceneActions = useMemo<SubsceneActionEntry[]>(
    () => [
      {
        id: 'worship',
        label: '礼佛',
        onClick: () => {
          void handleWorship();
        },
      },
      {
        id: 'pray',
        label: '祈福',
        onClick: () => {
          void handlePray();
        },
      },
      {
        id: 'stroll',
        label: '闲逛',
        onClick: () => {
          void handleStroll();
        },
      },
    ],
    [handlePray, handleStroll, handleWorship],
  );

  return (
    <section className="baohua-view" aria-label="宝华殿场景">
      {!activeActor ? (
        <MapSubsceneView
          locationId="宝华殿"
          npcs={subsceneNpcEntries}
          actions={subsceneActions}
          busy={busy}
          onLeave={enterMapMain}
        />
      ) : (
        <section className="baohua-view__encounter" aria-label={`${activeActor.name} 宝华殿对话`}>
          <aside className="baohua-view__actions" aria-label="宝华殿对话操作">
            <button type="button" onClick={closeEncounter} disabled={busy}>
              返回宝华殿
            </button>
            <p>{sceneHint || '宝华殿里一句话落下去，比别处更显得轻重分明。'}</p>
          </aside>

          <GlobalDialogueStage
            sceneLabel={`${activeActor.name} 宝华殿对话场景`}
            portraitLabel={`${activeActor.name} 立绘`}
            portrait={
              activeActor.actorKind === 'dowager' ? (
                <AutoCutoutPortrait
                  src={activeActor.portraitSrc}
                  alt={activeActor.name}
                  threshold={34}
                  sampleInset={8}
                  className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--baohua"
                />
              ) : (
                <img
                  src={activeActor.portraitSrc}
                  alt={activeActor.name}
                  className={`global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--baohua ${
                    activeActor.actorKind === 'dangyi' ? 'global-dialogue-stage__portrait-media--dangyi' : ''
                  }`}
                />
              )
            }
            ariaLabel="宝华殿对话框"
            className="global-dialogue-stage--baohua global-dialogue-stage--with-side-panel"
            dialogueClassName="palace-dialogue-box--baohua-encounter"
            characterIdentity={dialogueTurn?.speakerIdentity ?? activeActor.identity}
            characterName={dialogueTurn?.speakerName ?? activeActor.name}
            content={dialogueTurn?.text ?? '香火沉静，对方像是在等你先把这一句落下来。'}
            options={dialogueOptions as ConsortDialogueOption[]}
            onSelectOption={(optionId) => {
              void handleOptionSelect(optionId);
            }}
            onNextAction={
              dialogueOptions.length === 0
                ? () => {
                    void handleNextAction();
                  }
                : undefined
            }
            busy={busy}
          />
        </section>
      )}

      {!activeActor && actionResultText ? (
        <LocationActionResultStage
          locationName="宝华殿"
          className="global-dialogue-stage--baohua"
          dialogueClassName="palace-dialogue-box--baohua-encounter"
          content={actionResultText}
          onNextAction={closeActionResult}
          busy={busy}
        />
      ) : null}
    </section>
  );
}
