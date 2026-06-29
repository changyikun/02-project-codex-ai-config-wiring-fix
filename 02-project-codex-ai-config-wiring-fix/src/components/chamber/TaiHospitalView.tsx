import { useMemo, useState } from 'react';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { AutoCutoutPortrait } from '../visual/AutoCutoutPortrait';
import {
  getConcubineDisplayRankText,
  getConcubinePortraitPath,
} from '../../game/data/concubineRoster';
import {
  requestTaiyiLocalDialogue,
  type TaiyiDialogueActor,
} from '../../game/lib/taiyiDialogueRuntime';
import { buildLocationActionNarrative } from '../../game/lib/actionNarrativeRuntime';
import { clampToRange, createDialogueId, trimDialogueHistory } from '../../game/lib/dialogueSceneUtils';
import { traceDialogue } from '../../game/lib/dialogueTrace';
import {
  CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN,
  buildConsortPublicEncounterSendOffNarrativeEntry,
  type ConsortSendOffNarrative,
} from '../../game/lib/consortVisitRuntime';
import { getNpcActivitiesAtLocation } from '../../game/lib/npcActivityRuntime';
import { requestRelationshipJudgementLocal } from '../../game/lib/relationshipJudgeRuntime';
import { requestTaiyiAmbientLocal } from '../../game/lib/taiyiAmbientRuntime';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type {
  ConcubineProfile,
  ConsortDialogueOption,
  ConsortDialogueTurn,
} from '../../game/types';
import { LocationActionResultStage } from './LocationActionResultStage';
import { MapSubsceneView, type SubsceneActionEntry, type SubsceneNpcEntry } from './MapSubsceneView';
import { useLocationActionFlow, type TimedLocationActionOutcome } from './useLocationActionFlow';

interface TaiHospitalViewProps {
  concubines: ConcubineProfile[];
}

interface HistoryEntry {
  speaker: string;
  text: string;
}

interface TaiyiSceneActor extends TaiyiDialogueActor {
  portraitSrc: string;
  consortId?: string;
}

const JIANNING_PORTRAIT_SRC = '/assets/characters/men/jian-ning.png';

const buildJianNingActor = (favor: number, affection: number): TaiyiSceneActor => ({
  id: 'jianning',
  name: '简宁',
  identity: '太医院医官',
  residence: '太医院',
  personality: '寡言冷静，医理扎实，极重轻重缓急，不爱空话，待人克制，却会在关键处给出真正有用的判断。',
  summary: '太医院医官，常年接触脉案、诊方与宫闱秘病，对药理、病症与人心都看得极准，但从不轻易站队。',
  currentGoodwill: favor,
  currentAffection: affection,
  actorKind: 'jianning',
  portraitSrc: JIANNING_PORTRAIT_SRC,
});

const buildConsortActor = (consort: ConcubineProfile): TaiyiSceneActor => ({
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

const buildPendingEncounterTurn = (actor: TaiyiSceneActor): ConsortDialogueTurn => {
  let text = `${actor.identity} ${actor.name}在药廊间略略停步，像是先等你把这句开场落稳。`;

  if (actor.actorKind === 'jianning') {
    text = '简宁将指尖从脉案上收回，抬眼看向你，像是在等一句真正落到实处的话。';
  } else if (actor.actorKind === 'dowager') {
    text = '太后仍立在药柜前，只略略侧过脸，显然已经把你的动静听进去了。';
  }

  return {
    mode: 'line',
    phase: 'continue',
    speakerIdentity: actor.identity,
    speakerName: actor.name,
    text,
    sceneHint: '你已在药廊下把人拦住，对方正在接这句话。',
    options: [],
  };
};

export function TaiHospitalView({ concubines }: TaiHospitalViewProps) {
  const {
    state,
    hiddenStats,
    time,
    medicalProgress,
    patchMedicalProgress,
    applyStoryEffects,
    applyConsortRelationshipJudgement,
    npcActivity,
    resolveNpcActivityEntry,
    enterMapMain,
  } = useGameFlowStore();
  const { beginTimedLocationAction, finishTimedLocationAction } = useLocationActionFlow();
  const [activeActor, setActiveActor] = useState<TaiyiSceneActor | null>(null);
  const [dialogueTurn, setDialogueTurn] = useState<ConsortDialogueTurn | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sceneHint, setSceneHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [systemMessage, setSystemMessage] = useState('药香与水声在回廊里交错，太医院看似清净，实则最藏不住轻重缓急。');
  const [activeEncounterLabel, setActiveEncounterLabel] = useState('太医院偶遇');
  const [pendingJianNingUnlock, setPendingJianNingUnlock] = useState(false);
  const [actionResultText, setActionResultText] = useState('');
  const [pendingTimedActionOutcome, setPendingTimedActionOutcome] = useState<TimedLocationActionOutcome | null>(null);
  const [pendingEncounterSendOff, setPendingEncounterSendOff] = useState<ConsortSendOffNarrative | null>(null);
  const [encounterConsumedInteraction, setEncounterConsumedInteraction] = useState(false);

  const playerRankLabel = hiddenStats.initialRank ?? '宫妃';
  const saveId = useMemo(() => `local:${state.routeId}:${encodeURIComponent(state.name)}`, [state.name, state.routeId]);
  const dialogueOptions = dialogueTurn?.options ?? [];
  const isJianNingMet = Boolean(state.flags.isJianNingMet || medicalProgress.jianNingMet);
  const medicineLevel = Number(state.stats.medicine ?? 0) > 10 ? Number(state.stats.medicine ?? 0) / 10 : Number(state.stats.medicine ?? 0);
  const showConsultation = medicineLevel >= 5;
  const scheduledConsortActivity = useMemo(() => {
    const scheduledEntries = getNpcActivitiesAtLocation(npcActivity, '太医院');
    const entry = scheduledEntries.find((candidate) => concubines.some((consort) => consort.id === candidate.actorConsortId));
    const consort = entry ? concubines.find((candidate) => candidate.id === entry.actorConsortId) : undefined;
    return entry && consort ? { entry, consort } : null;
  }, [concubines, npcActivity]);
  const buildPayload = (
    actor: TaiyiSceneActor,
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
      saveId,
      sessionId: `session:taiyi:${actor.id}:${state.routeId}:${encodeURIComponent(state.name)}`,
      requestId: createDialogueId(`request-taiyi-${actor.id}`),
      sceneId: `taiyi:${actor.id}`,
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
    actor: TaiyiSceneActor,
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
    const nextTurn = await requestTaiyiLocalDialogue(payload, actor);
    const speakerLabel = `${nextTurn.speakerIdentity} · ${nextTurn.speakerName}`;
    traceDialogue({
      npcId: actor.id,
      sceneId: payload.sceneId,
      sessionId: payload.sessionId,
      turnsRead: nextTurn.sessionMemory?.readTurnCount ?? 0,
      candidatesRead: nextTurn.sessionMemory?.readMemoryCandidateCount ?? 0,
      candidatesWritten: nextTurn.sessionMemory?.writtenMemoryCandidateCount ?? nextTurn.memoryCandidates?.length ?? 0,
      relationCandidatesRead: nextTurn.sessionMemory?.readRelationCandidateCount ?? 0,
      relationCandidatesWritten:
        nextTurn.sessionMemory?.writtenRelationCandidateCount ?? nextTurn.relationCandidates?.length ?? 0,
      relationPromotedCount: nextTurn.relationMemory?.promotedCount ?? 0,
      relationRejectedCount: nextTurn.relationMemory?.rejectedCount ?? 0,
      relationEntryCount: nextTurn.relationMemory?.totalEntryCount ?? 0,
      source: 'local',
    });

    setDialogueTurn(nextTurn);
    setSceneHint(nextTurn.sceneHint ?? '');
    setHistory((currentHistory) =>
      trimDialogueHistory([...(overrides?.historyOverride ?? currentHistory), { speaker: speakerLabel, text: nextTurn.text }]),
    );
  };

  const finalizeJianNingUnlockIfNeeded = () => {
    if (!pendingJianNingUnlock) {
      return;
    }
    applyStoryEffects({ flags: { isJianNingMet: true } });
    patchMedicalProgress({ jianNingMet: true });
    setPendingJianNingUnlock(false);
    setSystemMessage('你已在太医院结识简宁，此后这里会长期留下他的入口。');
  };

  const beginEncounter = async (
    actor: TaiyiSceneActor,
    actionId: string,
    actionLabel: string,
    actionResult: string,
  ) => {
    setBusy(true);
    setActiveActor(actor);
    setDialogueTurn(buildPendingEncounterTurn(actor));
    setHistory([]);
    setSceneHint('你已在药廊下把人拦住，对方正在接这句话。');
    setActiveEncounterLabel(actionLabel);
    setPendingEncounterSendOff(null);
    setEncounterConsumedInteraction(false);

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
    const interactionOutcome = encounterConsumedInteraction && !outcome ? beginTimedLocationAction() : null;
    finalizeJianNingUnlockIfNeeded();
    setActiveActor(null);
    setDialogueTurn(null);
    setHistory([]);
    setSceneHint('');
    setBusy(false);
    setPendingTimedActionOutcome(null);
    setPendingEncounterSendOff(null);
    setEncounterConsumedInteraction(false);
    finishTimedLocationAction(outcome ?? interactionOutcome);
  };

  const handleStroll = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    const actionOutcome = beginTimedLocationAction();
    const nextCount = medicalProgress.strollCount + 1;
    patchMedicalProgress({ strollCount: nextCount });

    try {
      if (!isJianNingMet && nextCount >= 5) {
        const actor = buildJianNingActor(medicalProgress.jianNingFavor, medicalProgress.jianNingAffinity);
        patchMedicalProgress({ lastEncounterNpcId: actor.id });
        setPendingJianNingUnlock(true);
        holdTimedActionOutcome(actionOutcome);
        await beginEncounter(
          actor,
          'forced-meet',
          '简宁结识',
          '你在太医院连着闲逛到第五次时，正撞见简宁替一名宫人会诊。',
        );
        return;
      }

      const ambient = await requestTaiyiAmbientLocal({
        routeId: state.routeId,
        playerName: state.name,
        playerRank: playerRankLabel,
        location: '太医院',
        action: 'stroll-idle',
        stateHint: `闲逛第${nextCount}次`,
        timeContext: useGameFlowStore.getState().time,
      });
      patchMedicalProgress({ lastAmbientText: ambient });
      showActionResult(
        buildLocationActionNarrative({
          locationId: 'tai-hospital',
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

  const handleOpenJianNing = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    const actionOutcome = beginTimedLocationAction();

    try {
      const actor = buildJianNingActor(medicalProgress.jianNingFavor, medicalProgress.jianNingAffinity);
      patchMedicalProgress({ lastEncounterNpcId: actor.id });
      await beginEncounter(
        actor,
        'meet-jianning',
        '与简宁说话',
        '你绕过药柜与脉案，主动朝简宁走了过去。',
      );
      holdTimedActionOutcome(actionOutcome);
    } finally {
      setBusy(false);
    }
  };

  const handleConsultation = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    const actionOutcome = beginTimedLocationAction();
    patchMedicalProgress({ consultationCount: medicalProgress.consultationCount + 1 });
    applyStoryEffects({ stats: { medicine: 1 } });

    try {
      const ambient = await requestTaiyiAmbientLocal({
        routeId: state.routeId,
        playerName: state.name,
        playerRank: playerRankLabel,
        location: '太医院',
        action: 'consult',
        stateHint: isJianNingMet ? '跟着简宁旁听会诊' : '跟着医官旁听会诊',
        timeContext: useGameFlowStore.getState().time,
      });
      showActionResult(
        buildLocationActionNarrative({
          locationId: 'tai-hospital',
          actionId: 'consultation',
          actionLabel: '会诊',
          resultText: `${ambient} 药理略有进益。`,
        }),
        actionOutcome,
      );
    } finally {
      setBusy(false);
    }
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
          sceneType: `太医院·${activeEncounterLabel}`,
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
        if (!summary.actionLimitHit) {
          setEncounterConsumedInteraction(true);
        }
        const nextActor = {
          ...activeActor,
          currentGoodwill: clampToRange(activeActor.currentGoodwill + summary.appliedFavorDelta, -100, 100),
          currentAffection: clampToRange(activeActor.currentAffection + summary.appliedAffectionDelta, 0, 100),
        };
        setActiveActor(nextActor);
        if (summary.actionCountThisXun >= CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN) {
          setPendingEncounterSendOff(
            buildConsortPublicEncounterSendOffNarrativeEntry(`${nextActor.identity} ${nextActor.name}`, '太医院'),
          );
        }

        const settlementNotice = summary.actionLimitHit
          ? '本旬与她的互动回合已用尽，关系不再变化。'
          : '本地关系结算已落地。';

        await runNarrativeTurn(nextActor, 'follow-up', 'taiyi-follow-up', activeEncounterLabel, {
          actionResult: `${judgement.reason} ${settlementNotice}`,
          selectedOptionId: option.id,
          selectedOptionLabel: option.label,
          historyOverride: nextHistory,
        });
        return;
      }

      if (activeActor.actorKind === 'jianning') {
        const nextFavor = clampToRange(medicalProgress.jianNingFavor + judgement.favorDelta, -100, 100);
        const nextAffinity = clampToRange(medicalProgress.jianNingAffinity + judgement.affectionDelta, 0, 100);
        patchMedicalProgress({
          jianNingFavor: nextFavor,
          jianNingAffinity: nextAffinity,
          lastToneTag: judgement.toneTag,
          lastEncounterNpcId: activeActor.id,
        });
        const nextActor = {
          ...activeActor,
          currentGoodwill: nextFavor,
          currentAffection: nextAffinity,
        };
        setActiveActor(nextActor);

        await runNarrativeTurn(nextActor, 'follow-up', 'jianning-follow-up', activeEncounterLabel, {
          actionResult: `${judgement.reason} 系统已记下你与简宁这一轮的往来。`,
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
          speakerName: pendingEncounterSendOff.speakerName || pendingEncounterSendOff.narrationName || '太医院偶遇',
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

    if (isJianNingMet) {
      entries.push({
        id: 'fixed:jianning',
        kind: 'fixed',
        name: '简宁',
        identityLabel: '太医院医官',
        portraitSrc: JIANNING_PORTRAIT_SRC,
        onClick: () => {
          void handleOpenJianNing();
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
                '太医院偶遇',
                `${entry.summary}你看见${getConcubineDisplayRankText(consort)} ${consort.name}在药廊下停步，便主动上前搭话。`,
              );
            },
      });
    }

    return entries;
  }, [beginEncounter, handleOpenJianNing, isJianNingMet, resolveNpcActivityEntry, scheduledConsortActivity]);

  const subsceneActions = useMemo<SubsceneActionEntry[]>(
    () => [
      {
        id: 'stroll',
        label: '闲逛',
        onClick: () => {
          void handleStroll();
        },
      },
      ...(showConsultation
        ? [
            {
              id: 'consultation',
              label: '会诊',
              onClick: () => {
                void handleConsultation();
              },
            },
          ]
        : []),
    ],
    [handleConsultation, handleStroll, showConsultation],
  );

  return (
    <section className="taiyi-view" aria-label="太医院场景">
      {!activeActor ? (
        <MapSubsceneView
          locationId="太医院"
          npcs={subsceneNpcEntries}
          actions={subsceneActions}
          busy={busy}
          onLeave={enterMapMain}
        />
      ) : (
        <section className="taiyi-view__encounter" aria-label={`${activeActor.name} 太医院对话`}>
          <aside className="taiyi-view__actions" aria-label="太医院对话操作">
            <button type="button" onClick={closeEncounter} disabled={busy}>
              返回太医院
            </button>
            <p>{sceneHint || '药香与水声把一句话都衬得更轻，却也更难藏住真正的轻重。'}</p>
          </aside>

          <GlobalDialogueStage
            sceneLabel={`${activeActor.name} 太医院对话场景`}
            portraitLabel={`${activeActor.name} 立绘`}
            portrait={
              activeActor.actorKind === 'jianning' ? (
                <AutoCutoutPortrait
                  src={activeActor.portraitSrc}
                  alt={activeActor.name}
                  threshold={18}
                  sampleInset={20}
                  className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--taiyi global-dialogue-stage__portrait-media--jianning"
                />
              ) : activeActor.actorKind === 'dowager' ? (
                <AutoCutoutPortrait
                  src={activeActor.portraitSrc}
                  alt={activeActor.name}
                  threshold={34}
                  sampleInset={8}
                  className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--taiyi"
                />
              ) : (
                <img
                  src={activeActor.portraitSrc}
                  alt={activeActor.name}
                  className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--taiyi"
                />
              )
            }
            ariaLabel="太医院对话框"
            className="global-dialogue-stage--taiyi global-dialogue-stage--with-side-panel"
            dialogueClassName="palace-dialogue-box--taiyi-encounter"
            characterIdentity={dialogueTurn?.speakerIdentity ?? activeActor.identity}
            characterName={dialogueTurn?.speakerName ?? activeActor.name}
            content={dialogueTurn?.text ?? '药香沉静，对方像是在等你先把这一句落下来。'}
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
          locationName="太医院"
          className="global-dialogue-stage--taiyi"
          dialogueClassName="palace-dialogue-box--taiyi-encounter"
          content={actionResultText}
          onNextAction={closeActionResult}
          busy={busy}
        />
      ) : null}
    </section>
  );
}
