import { useMemo, useState } from 'react';
import {
  HOT_SPRING_SHARED_AFFECTION_GAIN,
  HOT_SPRING_SHARED_AFFECTION_REQUIREMENT,
  HOT_SPRING_SHARED_FAVORABILITY_GAIN,
  HOT_SPRING_SHARED_STRESS_REDUCE,
  HOT_SPRING_SOLO_STAMINA_RECOVER,
  HOT_SPRING_SOLO_STRESS_REDUCE,
} from '../../config/constants';
import {
  getConcubineDisplayRankText,
  getConcubinePortraitPath,
} from '../../game/data/concubineRoster';
import {
  requestHuaqingDialogueWithFallback,
  type HuaqingDialogueActor,
} from '../../game/lib/huaqingDialogueRuntime';
import { clampToRange, trimDialogueHistory } from '../../game/lib/dialogueSceneUtils';
import { getNpcActivitiesAtLocation } from '../../game/lib/npcActivityRuntime';
import { requestRelationshipJudgementWithFallback } from '../../game/lib/relationshipJudgeRuntime';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type {
  ConcubineProfile,
  ConsortDialogueOption,
  ConsortDialogueTurn,
} from '../../game/types';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { AutoCutoutPortrait } from '../visual/AutoCutoutPortrait';
import { LocationActionResultStage } from './LocationActionResultStage';
import { useLocationActionFlow, type TimedLocationActionOutcome } from './useLocationActionFlow';

interface HuaQingPoolViewProps {
  concubines: ConcubineProfile[];
}

interface HistoryEntry {
  speaker: string;
  text: string;
}

interface HotSpringInviteOption {
  id: string;
  name: string;
  identity: string;
  portraitSrc: string;
  actorKind: 'consort' | 'lianqiao';
  consortId?: string;
  personality: string;
  summary: string;
  currentGoodwill: number;
  currentAffection: number;
  scheduledEntryId?: string;
}

interface HuaqingSceneActor extends HuaqingDialogueActor {
  portraitSrc: string;
  consortId?: string;
}

const LIANQIAO_PORTRAIT_SRC = '/assets/characters/women/lianqiao.jpg';

const isSpecialSlot = (slot: string): boolean => slot === '深夜';

const buildLianQiaoActor = (favor: number, affection: number): HuaqingSceneActor => ({
  id: 'lianqiao',
  name: '连翘',
  identity: '妙音堂伶人',
  residence: '妙音堂',
  personality: '她最懂收音与留白，越是近处相见，越会把一句话里真正的停顿听得清清楚楚。',
  summary: '妙音堂伶人。对曲意与人心都极敏感，愿意赴你的深夜之约，已不是寻常分寸。',
  currentGoodwill: favor,
  currentAffection: affection,
  actorKind: 'lianqiao',
  portraitSrc: LIANQIAO_PORTRAIT_SRC,
});

const buildConsortActor = (consort: ConcubineProfile): HuaqingSceneActor => ({
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

export function HuaQingPoolView({ concubines }: HuaQingPoolViewProps) {
  const {
    state,
    hiddenStats,
    time,
    musicHallProgress,
    applyStoryEffects,
    patchConcubineById,
    patchMusicHallProgress,
    applyConsortRelationshipJudgement,
    npcActivity,
    resolveNpcActivityEntry,
  } = useGameFlowStore();
  const { beginTimedLocationAction, finishTimedLocationAction } = useLocationActionFlow();
  const [activeActor, setActiveActor] = useState<HuaqingSceneActor | null>(null);
  const [dialogueTurn, setDialogueTurn] = useState<ConsortDialogueTurn | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sceneHint, setSceneHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [showInvitePicker, setShowInvitePicker] = useState(false);
  const [systemMessage, setSystemMessage] = useState('池上水雾缭绕，石阶与灯影都被暖意泡软了，越近的距离，越难把一句话说得全无波澜。');
  const [actionResultText, setActionResultText] = useState('');
  const [pendingTimedActionOutcome, setPendingTimedActionOutcome] = useState<TimedLocationActionOutcome | null>(null);

  const playerRankLabel = hiddenStats.initialRank ?? '宫妃';
  const dialogueOptions = dialogueTurn?.options ?? [];
  const deepNightActive = isSpecialSlot(time.slot);

  const inviteOptions = useMemo<HotSpringInviteOption[]>(() => {
    const eligibleConsorts: HotSpringInviteOption[] = concubines
      .filter(
        (consort) =>
          consort.status === 'live' &&
          consort.residence !== '冷宫' &&
          !consort.name.includes('太后') &&
          Number(consort.stats.affection ?? 0) >= HOT_SPRING_SHARED_AFFECTION_REQUIREMENT,
      )
      .map((consort) => ({
        id: consort.id,
        name: consort.name,
        identity: getConcubineDisplayRankText(consort),
        portraitSrc: getConcubinePortraitPath(consort.portraitId),
        actorKind: 'consort' as const,
        consortId: consort.id,
        personality: consort.personality,
        summary: consort.summary,
        currentGoodwill: consort.stats.relationToPlayer,
        currentAffection: consort.stats.affection,
      }));

    if (deepNightActive && state.flags.isLianQiaoMet && musicHallProgress.lianQiaoAffection >= HOT_SPRING_SHARED_AFFECTION_REQUIREMENT) {
      eligibleConsorts.push({
        id: 'lianqiao',
        name: '连翘',
        identity: '妙音堂伶人',
        portraitSrc: LIANQIAO_PORTRAIT_SRC,
        actorKind: 'lianqiao',
        personality: '她最会在近处听出人声里的轻重，越是深夜，越不肯轻易把真心说满。',
        summary: '妙音堂伶人。若肯应你的深夜之约，已是把许多平日不肯交出的分寸往前递了一步。',
        currentGoodwill: musicHallProgress.lianQiaoFavor,
        currentAffection: musicHallProgress.lianQiaoAffection,
      });
    }

    return eligibleConsorts;
  }, [
    concubines,
    deepNightActive,
    musicHallProgress.lianQiaoAffection,
    musicHallProgress.lianQiaoFavor,
    state.flags.isLianQiaoMet,
  ]);

  const buildPayload = (
    actor: HuaqingSceneActor,
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
    actor: HuaqingSceneActor,
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
    const nextTurn = await requestHuaqingDialogueWithFallback(payload, actor);
    const speakerLabel = `${nextTurn.speakerIdentity} · ${nextTurn.speakerName}`;

    setDialogueTurn(nextTurn);
    setSceneHint(nextTurn.sceneHint ?? '');
    setHistory((currentHistory) =>
      trimDialogueHistory([...(overrides?.historyOverride ?? currentHistory), { speaker: speakerLabel, text: nextTurn.text }]),
    );
  };

  const beginEncounter = async (
    actor: HuaqingSceneActor,
    actionId: string,
    actionLabel: string,
    actionResult: string,
  ) => {
    setBusy(true);
    setShowInvitePicker(false);
    setActiveActor(actor);
    setDialogueTurn(null);
    setHistory([]);
    setSceneHint('');

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
    finishTimedLocationAction(outcome);
  };

  const handleSoloBath = () => {
    if (busy) {
      return;
    }

    const actionOutcome = beginTimedLocationAction();
    applyStoryEffects({
      stamina: HOT_SPRING_SOLO_STAMINA_RECOVER,
      stress: -HOT_SPRING_SOLO_STRESS_REDUCE,
    });
    showActionResult(
      `你独自在华清池里泡了一回，热气把肩背间的疲意慢慢化开。体力+${HOT_SPRING_SOLO_STAMINA_RECOVER}，压力-${HOT_SPRING_SOLO_STRESS_REDUCE}。`,
      actionOutcome,
    );
  };

  const handleOpenSharedBath = () => {
    if (busy) {
      return;
    }

    if (inviteOptions.length === 0) {
      setSystemMessage(
        deepNightActive
          ? `眼下能赴华清池之约的人还没有。至少要有一位倾情达到${HOT_SPRING_SHARED_AFFECTION_REQUIREMENT}的对象，深夜时连翘才可能出现在名单里。`
          : `眼下还没有谁与你亲近到能同入华清池。至少要有一位倾情达到${HOT_SPRING_SHARED_AFFECTION_REQUIREMENT}。`,
      );
      return;
    }

    setShowInvitePicker(true);
  };

  const handleInviteNpc = async (invite: HotSpringInviteOption) => {
    if (busy) {
      return;
    }

    const actionOutcome = beginTimedLocationAction();
    applyStoryEffects({ stress: -HOT_SPRING_SHARED_STRESS_REDUCE });
    if (invite.actorKind === 'lianqiao') {
      const nextFavor = clampToRange(musicHallProgress.lianQiaoFavor + HOT_SPRING_SHARED_FAVORABILITY_GAIN, -100, 100);
      const nextAffection = clampToRange(musicHallProgress.lianQiaoAffection + HOT_SPRING_SHARED_AFFECTION_GAIN, 0, 100);
      patchMusicHallProgress({
        lianQiaoFavor: nextFavor,
        lianQiaoAffection: nextAffection,
        lastEncounterNpcId: 'lianqiao',
      });
      holdTimedActionOutcome(actionOutcome);
      await beginEncounter(
        buildLianQiaoActor(nextFavor, nextAffection),
        deepNightActive ? 'late-night-shared-bath' : 'shared-bath',
        deepNightActive ? '深夜共浴' : '双人沐浴',
        deepNightActive
          ? '你在深夜的华清池里等到了连翘，她隔着水雾与你相对而立。'
          : '你邀连翘同入华清池，池边灯影与水雾把距离都压得更近了。',
      );
      return;
    }

    patchConcubineById(invite.consortId!, (consort) => ({
      ...consort,
      stats: {
        ...consort.stats,
        relationToPlayer: clampToRange(consort.stats.relationToPlayer + HOT_SPRING_SHARED_FAVORABILITY_GAIN, -100, 100),
        affection: clampToRange(consort.stats.affection + HOT_SPRING_SHARED_AFFECTION_GAIN, 0, 100),
      },
    }));

    const sourceConsort = concubines.find((consort) => consort.id === invite.consortId);
    if (!sourceConsort) {
      showActionResult('这位妃嫔眼下不在华清池可邀请名单里。', actionOutcome);
      return;
    }

    holdTimedActionOutcome(actionOutcome);
    await beginEncounter(
      {
        ...buildConsortActor(sourceConsort),
        id: invite.id,
        name: invite.name,
        identity: invite.identity,
        portraitSrc: invite.portraitSrc,
        personality: invite.personality,
        summary: invite.summary,
        currentGoodwill: clampToRange(invite.currentGoodwill + HOT_SPRING_SHARED_FAVORABILITY_GAIN, -100, 100),
        currentAffection: clampToRange(invite.currentAffection + HOT_SPRING_SHARED_AFFECTION_GAIN, 0, 100),
      },
      'shared-bath',
      '双人沐浴',
      `你邀${invite.identity} ${invite.name}同入华清池，池边的暖雾很快把彼此间的分寸都逼近了些。`,
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
      const judgement = await requestRelationshipJudgementWithFallback(
        {
          routeId: state.routeId,
          npcId: activeActor.id,
          sceneType: `华清池·${activeActor.name}`,
          optionText: option.label,
          npcProfile: `${activeActor.identity} ${activeActor.name}。${activeActor.summary}。性格：${activeActor.personality}`,
          currentFavor: activeActor.currentGoodwill,
          currentAffection: activeActor.currentAffection,
          recentContext: nextHistory.map((entry) => `${entry.speaker}：${entry.text}`),
        },
        option.fallbackToneTag,
      );

      if (activeActor.actorKind === 'lianqiao') {
        const nextFavor = clampToRange(musicHallProgress.lianQiaoFavor + judgement.favorDelta, -100, 100);
        const nextAffection = clampToRange(musicHallProgress.lianQiaoAffection + judgement.affectionDelta, 0, 100);
        patchMusicHallProgress({
          lianQiaoFavor: nextFavor,
          lianQiaoAffection: nextAffection,
          lastToneTag: judgement.toneTag,
          lastEncounterNpcId: activeActor.id,
        });
        const nextActor = {
          ...activeActor,
          currentGoodwill: nextFavor,
          currentAffection: nextAffection,
        };
        setActiveActor(nextActor);

        await runNarrativeTurn(nextActor, 'follow-up', 'shared-bath-follow-up', '双人沐浴', {
          actionResult: `${judgement.reason} 连翘把你这一句收进了水雾里。`,
          selectedOptionId: option.id,
          selectedOptionLabel: option.label,
          historyOverride: nextHistory,
        });
        return;
      }

      if (activeActor.consortId) {
        const summary = applyConsortRelationshipJudgement(activeActor.consortId, 'greet', judgement);
        const nextActor = {
          ...activeActor,
          currentGoodwill: clampToRange(activeActor.currentGoodwill + summary.appliedFavorDelta, -100, 100),
          currentAffection: clampToRange(activeActor.currentAffection + summary.appliedAffectionDelta, 0, 100),
        };
        setActiveActor(nextActor);
        await runNarrativeTurn(nextActor, 'follow-up', 'shared-bath-follow-up', '双人沐浴', {
          actionResult: `${judgement.reason} 这一句已经落进她心里了。`,
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

    if (dialogueTurn.phase === 'finish' || dialogueTurn.nextActionLabel !== '下一句') {
      closeEncounter();
      return;
    }

    setBusy(true);
    try {
      await runNarrativeTurn(activeActor, 'follow-up', 'keep-talking', '双人沐浴', {
        actionResult: '你没有急着把话说满，只顺着这一池暖雾把气氛再往前推了半步。',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="huaqing-view" aria-label="华清池场景">
      {!activeActor ? (
        <header className="huaqing-view__header">
          <div className="huaqing-view__heading">
            <span>华清池 · 水暖雾深</span>
            <p>华清池离宫道远，离人心却近。这里最容易把体温与试探一起蒸起来，也最难装作一句都没听见。</p>
          </div>
        </header>
      ) : null}

      {!activeActor ? (
        <section className="huaqing-view__menu" aria-label="华清池主界面">
          <div className="huaqing-view__menu-buttons">
            <button type="button" onClick={handleSoloBath} disabled={busy}>
              单人沐浴
            </button>
            <button type="button" onClick={handleOpenSharedBath} disabled={busy}>
              双人沐浴
            </button>
          </div>
          <div className="huaqing-view__note">
            <strong>{deepNightActive ? '当前时辰：深夜' : `当前时辰：${time.slot}`}</strong>
            <p>{systemMessage}</p>
          </div>
        </section>
      ) : (
        <section className="huaqing-view__encounter" aria-label={`${activeActor.name} 华清池对话`}>
          <aside className="huaqing-view__actions" aria-label="华清池对话操作">
            <button type="button" onClick={closeEncounter} disabled={busy}>
              返回华清池
            </button>
            <p>{sceneHint || '华清池里水声不断，很多轻话都会被热气衬得更像真心。'}</p>
          </aside>

          <GlobalDialogueStage
            sceneLabel={`${activeActor.name} 华清池对话场景`}
            portraitLabel={`${activeActor.name} 立绘`}
            portrait={
              activeActor.actorKind === 'lianqiao' ? (
                <AutoCutoutPortrait
                  src={activeActor.portraitSrc}
                  alt={activeActor.name}
                  threshold={22}
                  sampleInset={18}
                  className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--huaqing global-dialogue-stage__portrait-media--lianqiao"
                />
              ) : (
                <img
                  src={activeActor.portraitSrc}
                  alt={activeActor.name}
                  className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--huaqing"
                />
              )
            }
            ariaLabel="华清池对话框"
            className="global-dialogue-stage--huaqing global-dialogue-stage--with-side-panel"
            dialogueClassName="palace-dialogue-box--huaqing-encounter"
            characterIdentity={dialogueTurn?.speakerIdentity ?? activeActor.identity}
            characterName={dialogueTurn?.speakerName ?? activeActor.name}
            content={dialogueTurn?.text ?? '暖雾铺开，对方像是在等你先把这一句递过去。'}
            options={dialogueOptions as ConsortDialogueOption[]}
            onSelectOption={(optionId) => {
              void handleOptionSelect(optionId);
            }}
            nextActionLabel={dialogueOptions.length === 0 ? dialogueTurn?.nextActionLabel : undefined}
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
          locationName="华清池"
          className="global-dialogue-stage--huaqing"
          dialogueClassName="palace-dialogue-box--huaqing-encounter"
          content={actionResultText}
          nextActionLabel={pendingTimedActionOutcome?.shouldSleep ? '回宫歇下' : '收起'}
          onNextAction={closeActionResult}
          busy={busy}
        />
      ) : null}

      {showInvitePicker ? (
        <div className="huaqing-view__picker-backdrop" role="dialog" aria-label="华清池邀请列表">
          <div className="huaqing-view__picker">
            <h3>选择同浴对象</h3>
            <p>
              {deepNightActive
                ? `当前为深夜，可邀请倾情达到${HOT_SPRING_SHARED_AFFECTION_REQUIREMENT}的妃嫔；若已结识连翘且她的倾情达标，她也会出现在名单里。`
                : `仅可邀请倾情达到${HOT_SPRING_SHARED_AFFECTION_REQUIREMENT}的对象。`}
            </p>
            <div className="huaqing-view__picker-list">
              {inviteOptions.map((invite) => (
                <button key={invite.id} type="button" onClick={() => void handleInviteNpc(invite)} disabled={busy}>
                  {`${invite.identity} · ${invite.name}｜倾情 ${invite.currentAffection}`}
                </button>
              ))}
            </div>
            <button type="button" className="huaqing-view__picker-cancel" onClick={() => setShowInvitePicker(false)} disabled={busy}>
              暂不邀请
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
