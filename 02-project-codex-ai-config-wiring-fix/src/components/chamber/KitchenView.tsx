import { useMemo, useState } from 'react';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { buildKitchenFoodCatalog } from '../../game/data/inventoryPresets';
import {
  getConcubineDisplayRankText,
  getConcubinePortraitPath,
} from '../../game/data/concubineRoster';
import {
  requestKitchenLocalDialogue,
  type KitchenDialogueActor,
} from '../../game/lib/kitchenDialogueRuntime';
import { buildLocationActionNarrative } from '../../game/lib/actionNarrativeRuntime';
import { clampToRange, trimDialogueHistory } from '../../game/lib/dialogueSceneUtils';
import {
  CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN,
  buildConsortPublicEncounterSendOffNarrativeEntry,
  type ConsortSendOffNarrative,
} from '../../game/lib/consortVisitRuntime';
import { getNpcActivitiesAtLocation } from '../../game/lib/npcActivityRuntime';
import { requestRelationshipJudgementLocal } from '../../game/lib/relationshipJudgeRuntime';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type {
  ConcubineProfile,
  ConsortDialogueOption,
  ConsortDialogueTurn,
  InventoryItem,
} from '../../game/types';
import { LocationActionResultStage } from './LocationActionResultStage';
import { MapSubsceneView, type SubsceneActionEntry, type SubsceneNpcEntry } from './MapSubsceneView';
import { useLocationActionFlow, type TimedLocationActionOutcome } from './useLocationActionFlow';

interface KitchenViewProps {
  concubines: ConcubineProfile[];
}

interface HistoryEntry {
  speaker: string;
  text: string;
}

interface KitchenSceneActor extends KitchenDialogueActor {
  portraitSrc: string;
  consortId?: string;
}

const BU_ZIYOU_PORTRAIT_SRC = '/assets/characters/men/bu-ziyou.png';

const buildBuZiyouActor = (favor: number, affection: number): KitchenSceneActor => ({
  id: 'buziyou',
  name: '布自游',
  identity: '御厨',
  residence: '御膳房',
  personality:
    '开朗嘴贫，记性极好，心细如发，表面松弛却很会察言观色，对宫里的脏事看得极明白，却仍努力替人留一口热乎气。',
  summary:
    '出身民间食肆，现是御膳房掌勺，熟知送膳路线、暗格和宫中人心。看起来最好说话，真正踩到底线时却下手极稳。',
  currentGoodwill: favor,
  currentAffection: affection,
  actorKind: 'buziyou',
  portraitSrc: BU_ZIYOU_PORTRAIT_SRC,
});

const buildConsortActor = (consort: ConcubineProfile): KitchenSceneActor => ({
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

export function KitchenView({ concubines }: KitchenViewProps) {
  const {
    state,
    hiddenStats,
    time,
    kitchenProgress,
    buyInventoryItem,
    patchKitchenProgress,
    applyConsortRelationshipJudgement,
    npcActivity,
    resolveNpcActivityEntry,
    enterMapMain,
  } = useGameFlowStore();
  const { beginTimedLocationAction, finishTimedLocationAction } = useLocationActionFlow();
  const [activeActor, setActiveActor] = useState<KitchenSceneActor | null>(null);
  const [dialogueTurn, setDialogueTurn] = useState<ConsortDialogueTurn | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sceneHint, setSceneHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [systemMessage, setSystemMessage] = useState('御膳房热气蒸腾，锅勺声与宫人脚步混成一片。');
  const [activeEncounterLabel, setActiveEncounterLabel] = useState('御膳房偶遇');
  const [actionResultText, setActionResultText] = useState('');
  const [pendingTimedActionOutcome, setPendingTimedActionOutcome] = useState<TimedLocationActionOutcome | null>(null);
  const [pendingEncounterSendOff, setPendingEncounterSendOff] = useState<ConsortSendOffNarrative | null>(null);

  const playerRankLabel = hiddenStats.initialRank ?? '宫妃';
  const kitchenCatalog = useMemo(() => buildKitchenFoodCatalog(), []);
  const dialogueOptions = dialogueTurn?.options ?? [];
  const scheduledConsortActivity = useMemo(() => {
    const scheduledEntries = getNpcActivitiesAtLocation(npcActivity, '御膳房');
    const entry = scheduledEntries.find((candidate) => concubines.some((consort) => consort.id === candidate.actorConsortId));
    const consort = entry ? concubines.find((candidate) => candidate.id === entry.actorConsortId) : undefined;
    return entry && consort ? { entry, consort } : null;
  }, [concubines, npcActivity]);

  const buildPayload = (
    actor: KitchenSceneActor,
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
    actor: KitchenSceneActor,
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
    const nextTurn = await requestKitchenLocalDialogue(payload, actor);
    const speakerLabel = `${nextTurn.speakerIdentity} · ${nextTurn.speakerName}`;

    setDialogueTurn(nextTurn);
    setSceneHint(nextTurn.sceneHint ?? '');
    setHistory((currentHistory) =>
      trimDialogueHistory([...(overrides?.historyOverride ?? currentHistory), { speaker: speakerLabel, text: nextTurn.text }]),
    );
  };

  const beginEncounter = async (
    actor: KitchenSceneActor,
    actionId: string,
    actionLabel: string,
    actionResult: string,
  ) => {
    setBusy(true);
    setShopOpen(false);
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
    setActiveActor(null);
    setDialogueTurn(null);
    setHistory([]);
    setSceneHint('');
    setBusy(false);
    setPendingTimedActionOutcome(null);
    setPendingEncounterSendOff(null);
    finishTimedLocationAction(outcome);
  };

  const handleBuyFood = (item: InventoryItem) => {
    const result = buyInventoryItem(item);
    setSystemMessage(
      buildLocationActionNarrative({
        locationId: 'kitchen',
        actionId: 'buy',
        actionLabel: '购买美食',
        resultText: result.message,
      }),
    );
  };

  const handleStroll = async () => {
    if (busy) {
      return;
    }

    const actionOutcome = beginTimedLocationAction();
    const nextCount = kitchenProgress.strollCount + 1;
    patchKitchenProgress({ strollCount: nextCount });

    if (!kitchenProgress.buZiyouMet && nextCount >= 4) {
      const actor = buildBuZiyouActor(kitchenProgress.buZiyouFavor, kitchenProgress.buZiyouAffinity);
      patchKitchenProgress({
        buZiyouUnlocked: true,
        buZiyouMet: true,
        lastEncounterNpcId: actor.id,
      });
      setSystemMessage(
        buildLocationActionNarrative({
          locationId: 'kitchen',
          actionId: 'meet',
          actionLabel: '御膳房闲逛',
          resultText: '你在第四次闲逛时，于灶间深处撞见了布自游。',
        }),
      );
      holdTimedActionOutcome(actionOutcome);
      await beginEncounter(
        actor,
        'forced-meet',
        '布自游结识',
        '你在御膳房连着闲逛到第四次，终于在灶后见到了布自游。',
      );
      return;
    }

    showActionResult(
      buildLocationActionNarrative({
        locationId: 'kitchen',
        actionId: 'stroll',
        actionLabel: '闲逛',
        resultText: '御膳房炊烟袅袅，各处动静仍由你自行留意。',
      }),
      actionOutcome,
    );
  };

  const handleOpenBuZiyou = async () => {
    if (busy) {
      return;
    }

    const actor = buildBuZiyouActor(kitchenProgress.buZiyouFavor, kitchenProgress.buZiyouAffinity);
    patchKitchenProgress({ lastEncounterNpcId: actor.id });
    await beginEncounter(
      actor,
      'meet-buziyou',
      '与布自游说话',
      '你绕过灶台，主动朝布自游走了过去。',
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
          sceneType: `御膳房·${activeEncounterLabel}`,
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
            buildConsortPublicEncounterSendOffNarrativeEntry(`${nextActor.identity} ${nextActor.name}`, '御膳房'),
          );
        }

        const capNotice =
          summary.actionLimitHit
            ? '本旬与她的互动回合已用尽，关系不再变化。'
            : summary.favorCapHit || summary.affectionCapHit
              ? '本旬该方向关系波动已到上限。'
              : '本地关系结算已落地。';

        await runNarrativeTurn(nextActor, 'follow-up', 'stroll-follow-up', activeEncounterLabel, {
          actionResult: `${judgement.reason} ${capNotice}`,
          selectedOptionId: option.id,
          selectedOptionLabel: option.label,
          historyOverride: nextHistory,
        });
      } else {
        const nextFavor = clampToRange(kitchenProgress.buZiyouFavor + judgement.favorDelta, -100, 100);
        const nextAffinity = clampToRange(kitchenProgress.buZiyouAffinity + judgement.affectionDelta, 0, 100);
        patchKitchenProgress({
          buZiyouFavor: nextFavor,
          buZiyouAffinity: nextAffinity,
          lastToneTag: judgement.toneTag,
          lastEncounterNpcId: activeActor.id,
        });
        const nextActor = {
          ...activeActor,
          currentGoodwill: nextFavor,
          currentAffection: nextAffinity,
        };
        setActiveActor(nextActor);
        await runNarrativeTurn(nextActor, 'follow-up', 'buziyou-follow-up', activeEncounterLabel, {
          actionResult: `${judgement.reason} 系统已把这句反应记进你与布自游的往来里。`,
          selectedOptionId: option.id,
          selectedOptionLabel: option.label,
          historyOverride: nextHistory,
        });
      }
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
          speakerName: pendingEncounterSendOff.speakerName || pendingEncounterSendOff.narrationName || '御膳房偶遇',
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

    if (kitchenProgress.buZiyouUnlocked) {
      entries.push({
        id: 'fixed:buziyou',
        kind: 'fixed',
        name: '布自游',
        identityLabel: '御厨',
        portraitSrc: BU_ZIYOU_PORTRAIT_SRC,
        onClick: () => {
          void handleOpenBuZiyou();
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
                '御膳房偶遇',
                `${entry.summary}你看见${getConcubineDisplayRankText(consort)} ${consort.name}正在膳房一侧停留，便主动上前搭话。`,
              );
            },
      });
    }

    return entries;
  }, [beginEncounter, handleOpenBuZiyou, kitchenProgress.buZiyouUnlocked, resolveNpcActivityEntry, scheduledConsortActivity]);

  const subsceneActions = useMemo<SubsceneActionEntry[]>(
    () => [
      {
        id: 'stroll',
        label: '闲逛',
        onClick: () => {
          void handleStroll();
        },
      },
      {
        id: 'buy-food',
        label: '购买美食',
        onClick: () => setShopOpen(true),
      },
    ],
    [handleStroll],
  );

  return (
    <section className="kitchen-view" aria-label="御膳房场景">
      {!activeActor ? (
        <MapSubsceneView
          locationId="御膳房"
          npcs={subsceneNpcEntries}
          actions={subsceneActions}
          busy={busy}
          onLeave={enterMapMain}
        />
      ) : (
        <section className="kitchen-view__encounter" aria-label={`${activeActor.name} 御膳房对话`}>
          <aside className="kitchen-view__actions" aria-label="御膳房对话操作">
            <button type="button" onClick={closeEncounter} disabled={busy}>
              返回御膳房
            </button>
            <p>{sceneHint || '此处人来人往，轻一句重一句，都可能被膳房的人记进心里。'}</p>
          </aside>

          <GlobalDialogueStage
            sceneLabel={`${activeActor.name} 御膳房对话场景`}
            portraitLabel={`${activeActor.name} 立绘`}
            portrait={<img src={activeActor.portraitSrc} alt={activeActor.name} className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--kitchen" />}
            ariaLabel="御膳房对话框"
            className="global-dialogue-stage--kitchen global-dialogue-stage--with-side-panel"
            dialogueClassName="palace-dialogue-box--kitchen-encounter"
            characterIdentity={dialogueTurn?.speakerIdentity ?? activeActor.identity}
            characterName={dialogueTurn?.speakerName ?? activeActor.name}
            content={dialogueTurn?.text ?? '炊火声里，对方像是在等你先开口。'}
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
          locationName="御膳房"
          className="global-dialogue-stage--kitchen"
          dialogueClassName="palace-dialogue-box--kitchen-encounter"
          content={actionResultText}
          onNextAction={closeActionResult}
          busy={busy}
        />
      ) : null}

      {shopOpen ? (
        <section className="kitchen-view__shop-modal" role="dialog" aria-label="御膳房购买美食弹窗">
          <header className="kitchen-view__shop-header">
            <div>
              <strong>膳房食单</strong>
              <span>{`当前银两：${state.silver}`}</span>
            </div>
            <button type="button" onClick={() => setShopOpen(false)}>
              收起
            </button>
          </header>
          <div className="kitchen-view__shop-list">
            {kitchenCatalog.map((item) => (
              <article key={item.itemId} className="kitchen-view__shop-card">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <span>{`售价：${item.price}两`}</span>
                </div>
                <button
                  type="button"
                  aria-label={`购买 ${item.name}`}
                  disabled={state.silver < item.price}
                  onClick={() => handleBuyFood(item)}
                >
                  购买
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
