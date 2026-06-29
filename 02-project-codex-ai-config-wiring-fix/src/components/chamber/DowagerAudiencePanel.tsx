import { useEffect, useMemo, useState } from 'react';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { AudienceInteractionShell, type AudienceExitResult, type AudienceMetaRow } from '../consorts/AudienceInteractionShell';
import { AutoCutoutPortrait } from '../visual/AutoCutoutPortrait';
import { isConsortGiftItem } from '../../game/lib/consortVisitRuntime';
import { trimDialogueHistory } from '../../game/lib/dialogueSceneUtils';
import { requestDowagerLocalDialogue } from '../../game/lib/dowagerDialogueRuntime';
import {
  DOWAGER_GREETING_AFFINITY_DELTA,
  DOWAGER_INTERACTION_LIMIT_PER_XUN,
  DOWAGER_MINOR_AFFINITY_DELTA,
  DOWAGER_NPC_ID,
  DOWAGER_NPC_NAME,
  hasDowagerGreetedThisMonth,
  hasDowagerGreetedThisXun,
} from '../../game/lib/dowagerAudienceRuntime';
import { createPermanentNpcRelationship, normalizePermanentNpcRelationshipForXun } from '../../game/lib/permanentNpcRuntime';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { ConsortDialogueTurn, InventoryItem, PermanentNpcInteractionActionId } from '../../game/types';

interface DowagerAudiencePanelProps {
  onLeave: (result?: AudienceExitResult) => void;
}

interface HistoryEntry {
  speaker: string;
  text: string;
}

type DowagerActionId = 'dowager-greeting' | 'gift-greet' | 'dowager-advice' | 'talk' | 'farewell' | 'limit';

interface DowagerActionConfig {
  actionId: DowagerActionId;
  label: string;
  consumesInteraction: boolean;
  marksMonthlyGreeting?: boolean;
  affinityDelta?: number;
}

const DOWAGER_PORTRAIT_SRC = '/assets/characters/women/taihou.png';

const DOWAGER_PERSONA = {
  personality:
    '清醒强势，极重规矩，擅长观察与驯化，记仇护短，会审时度势，欣赏聪明人，但更欣赏懂分寸的聪明人。',
  summary:
    '她是后宫最高权力长辈角色，看人先看可用性，再看风骨，最后才轮到私心。她会给体面，也会要求旁人配得上这份体面。',
  speechRules:
    '说话必须体现长辈权威、宫规、体统、裁量。温和不等于无压迫感，常以提点、训诫、留白控场。不可写成普通妃嫔腔或现代口吻。',
  speechExamples:
    '“你聪明，这是好事。可在宫里，聪明若没有分寸，便是催命符。” “哀家抬举你，不是因为你可怜，是因为你有用，也配。”',
  forbiddenTopics:
    '不可直接质疑她是否爱过自己的儿子，不可轻提储位之争旧账，不可用轻浮亲昵称呼。',
} as const;

const buildPermanentNpcRelationLabel = (affinity: number): string => {
  if (affinity >= 70) {
    return '看重';
  }
  if (affinity >= 40) {
    return '认可';
  }
  if (affinity > 0) {
    return '记名';
  }
  return '疏淡';
};

export function DowagerAudiencePanel({ onLeave }: DowagerAudiencePanelProps) {
  const {
    state,
    time,
    hiddenStats,
    inventory,
    permanentNpcRelationships,
    ensurePermanentNpcRelationship,
    markPermanentNpcMet,
    recordPermanentNpcInteractionAction,
    markDowagerMonthlyGreeting,
    applyPermanentNpcAffinityDelta,
    consumeInventoryItem,
  } = useGameFlowStore();
  const [dialogueTurn, setDialogueTurn] = useState<ConsortDialogueTurn | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeActionId, setActiveActionId] = useState<DowagerActionId>('dowager-greeting');
  const [activeActionLabel, setActiveActionLabel] = useState('请安');
  const [pickerMode, setPickerMode] = useState<'gift' | null>(null);
  const [closeAfterDialogue, setCloseAfterDialogue] = useState(false);
  const [sendOffQueued, setSendOffQueued] = useState(false);
  const [hasConsumedInteractionThisSession, setHasConsumedInteractionThisSession] = useState(false);

  const currentXunKey = `${time.year}-${time.month}-${time.xun}`;
  const relationship = normalizePermanentNpcRelationshipForXun(
    permanentNpcRelationships[DOWAGER_NPC_ID] ??
      createPermanentNpcRelationship(DOWAGER_NPC_ID, DOWAGER_NPC_NAME, currentXunKey),
    DOWAGER_NPC_ID,
    DOWAGER_NPC_NAME,
    currentXunKey,
  );
  const playerRankLabel = hiddenStats.initialRank ?? '宫妃';
  const options = dialogueTurn?.options ?? [];
  const dialogueActive = busy || Boolean(dialogueTurn);
  const interactionLimitReached = relationship.actionCountThisXun >= DOWAGER_INTERACTION_LIMIT_PER_XUN;
  const remainingInteractionCount = Math.max(0, DOWAGER_INTERACTION_LIMIT_PER_XUN - relationship.actionCountThisXun);
  const greetedThisMonth = hasDowagerGreetedThisMonth(relationship, time);
  const greetedThisXun = hasDowagerGreetedThisXun(relationship, time);
  const giftItems = useMemo(
    () => inventory.filter((item) => isConsortGiftItem(item) && !item.isQuestItem),
    [inventory],
  );

  useEffect(() => {
    ensurePermanentNpcRelationship(DOWAGER_NPC_ID, DOWAGER_NPC_NAME);
    markPermanentNpcMet(DOWAGER_NPC_ID, DOWAGER_NPC_NAME);
  }, [ensurePermanentNpcRelationship, markPermanentNpcMet]);

  const leaveAudience = () => {
    onLeave({ shouldAdvanceTime: hasConsumedInteractionThisSession });
  };

  const buildPayload = (
    topic: 'visit' | 'action' | 'follow-up',
    actionId: DowagerActionId,
    actionLabel: string,
    overrides?: {
      actionResult?: string;
      selectedOptionId?: string;
      selectedOptionLabel?: string;
      giftItemName?: string;
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
      giftItemName: overrides?.giftItemName,
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
        id: DOWAGER_NPC_ID,
        name: DOWAGER_NPC_NAME,
        rank: DOWAGER_NPC_NAME,
        residence: '建章宫',
        stateLabel: '寻常',
        personality: DOWAGER_PERSONA.personality,
        summary: `${DOWAGER_PERSONA.summary} ${DOWAGER_PERSONA.speechRules} 参考语气：${DOWAGER_PERSONA.speechExamples} 禁区：${DOWAGER_PERSONA.forbiddenTopics}`,
        currentGoodwill: relationship.affinity,
        currentAffection: 0,
        emperorFavor: 0,
        stress: 0,
        allies: [] as string[],
        rivals: [] as string[],
      },
      timeContext: time,
    };
  };

  const runNarrativeTurn = async (
    topic: 'visit' | 'action' | 'follow-up',
    actionId: DowagerActionId,
    actionLabel: string,
    overrides?: {
      actionResult?: string;
      selectedOptionId?: string;
      selectedOptionLabel?: string;
      giftItemName?: string;
      historyOverride?: HistoryEntry[];
    },
  ) => {
    const payload = buildPayload(topic, actionId, actionLabel, overrides);
    const nextTurn = await requestDowagerLocalDialogue(payload);
    const speakerLabel = nextTurn.speakerIdentity ? `${nextTurn.speakerIdentity} · ${nextTurn.speakerName}` : nextTurn.speakerName;

    setDialogueTurn(nextTurn);
    setHistory((currentHistory) =>
      trimDialogueHistory([...(overrides?.historyOverride ?? currentHistory), { speaker: speakerLabel, text: nextTurn.text }]),
    );
  };

  const beginEffectiveAction = async (config: DowagerActionConfig, giftItem?: InventoryItem) => {
    if (busy) {
      return;
    }

    if (config.consumesInteraction) {
      const actionResult = recordPermanentNpcInteractionAction(
        DOWAGER_NPC_ID,
        DOWAGER_NPC_NAME,
        (config.actionId === 'gift-greet' ? 'dowager-gift' : config.actionId) as PermanentNpcInteractionActionId,
        DOWAGER_INTERACTION_LIMIT_PER_XUN,
      );
      if (!actionResult.success) {
        setBusy(true);
        setPickerMode(null);
        setCloseAfterDialogue(true);
        setSendOffQueued(false);
        setActiveActionId('limit');
        setActiveActionLabel('宫人回话');
        try {
          await runNarrativeTurn('action', 'limit', '宫人回话');
        } finally {
          setBusy(false);
        }
        return;
      }
      if (config.affinityDelta) {
        applyPermanentNpcAffinityDelta(DOWAGER_NPC_ID, DOWAGER_NPC_NAME, config.affinityDelta);
      }
      if (config.marksMonthlyGreeting) {
        markDowagerMonthlyGreeting();
      }
      setHasConsumedInteractionThisSession(true);
      setCloseAfterDialogue(actionResult.actionCountThisXun >= DOWAGER_INTERACTION_LIMIT_PER_XUN);
      setSendOffQueued(actionResult.actionCountThisXun >= DOWAGER_INTERACTION_LIMIT_PER_XUN);
    } else {
      setCloseAfterDialogue(config.actionId === 'farewell');
      setSendOffQueued(false);
    }

    setBusy(true);
    setPickerMode(null);
    setActiveActionId(config.actionId);
    setActiveActionLabel(config.label);

    try {
      await runNarrativeTurn('action', config.actionId, config.label, {
        giftItemName: giftItem?.name,
        actionResult: giftItem ? `你奉上${giftItem.name}，一并向太后问安。` : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleGift = async (item: InventoryItem) => {
    if (busy || interactionLimitReached) {
      return;
    }
    if (!inventory.some((currentItem) => currentItem.itemId === item.itemId && currentItem.quantity > 0)) {
      setPickerMode(null);
      return;
    }
    const consumed = consumeInventoryItem(item.itemId);
    if (!consumed) {
      setPickerMode(null);
      return;
    }
    await beginEffectiveAction(
      {
        actionId: 'gift-greet',
        label: '送礼问安',
        consumesInteraction: true,
        marksMonthlyGreeting: true,
        affinityDelta: item.favorDelta,
      },
      item,
    );
  };

  const handleAction = async (config: DowagerActionConfig) => {
    if (busy) {
      return;
    }
    if (config.actionId === 'gift-greet') {
      setPickerMode('gift');
      setDialogueTurn(null);
      return;
    }
    await beginEffectiveAction(config);
  };

  const handleOptionSelect = async (optionId: string) => {
    if (busy || !dialogueTurn) {
      return;
    }

    const option = options.find((item) => item.id === optionId);
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
      await runNarrativeTurn('follow-up', activeActionId, activeActionLabel, {
        actionResult: `你顺着太后的话意回了一句“${option.label}”。`,
        selectedOptionId: option.id,
        selectedOptionLabel: option.label,
        historyOverride: nextHistory,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleNextAction = async () => {
    if (busy || !dialogueTurn || options.length > 0) {
      return;
    }

    if (sendOffQueued) {
      setBusy(true);
      setSendOffQueued(false);
      setCloseAfterDialogue(true);
      setActiveActionId('farewell');
      setActiveActionLabel('送客');
      try {
        await runNarrativeTurn('action', 'farewell', '送客');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (closeAfterDialogue || activeActionId === 'farewell') {
      leaveAudience();
      return;
    }

    setDialogueTurn(null);
  };

  const metaRows: AudienceMetaRow[] = [
    { label: '当前状态', value: relationship.met ? '已见过' : '初见' },
    { label: '太后好感', value: relationship.affinity },
    { label: '关系', value: buildPermanentNpcRelationLabel(relationship.affinity) },
    { label: '本月请安', value: greetedThisMonth ? '已请' : '未请' },
  ];

  const actions = (
    <aside className="harem-palace-view__audience-actions" aria-label="建章宫交互选项">
      <span className="harem-palace-view__audience-action-note">
        {`本旬可互动 ${remainingInteractionCount}/${DOWAGER_INTERACTION_LIMIT_PER_XUN}`}
      </span>
      <button
        type="button"
        onClick={() =>
          void handleAction({
            actionId: 'dowager-greeting',
            label: '请安',
            consumesInteraction: true,
            marksMonthlyGreeting: true,
            affinityDelta: DOWAGER_GREETING_AFFINITY_DELTA,
          })
        }
        disabled={dialogueActive || interactionLimitReached || greetedThisXun}
      >
        请安
      </button>
      <button
        type="button"
        className={pickerMode === 'gift' ? 'is-active' : ''}
        onClick={() =>
          void handleAction({
            actionId: 'gift-greet',
            label: '送礼问安',
            consumesInteraction: true,
            marksMonthlyGreeting: true,
          })
        }
        disabled={dialogueActive || interactionLimitReached}
      >
        送礼问安
      </button>
      <button
        type="button"
        onClick={() =>
          void handleAction({
            actionId: 'dowager-advice',
            label: '请教规矩',
            consumesInteraction: true,
            affinityDelta: DOWAGER_MINOR_AFFINITY_DELTA,
          })
        }
        disabled={dialogueActive || interactionLimitReached}
      >
        请教规矩
      </button>
      <button
        type="button"
        onClick={() =>
          void handleAction({
            actionId: 'talk',
            label: '闲谈',
            consumesInteraction: true,
            affinityDelta: DOWAGER_MINOR_AFFINITY_DELTA,
          })
        }
        disabled={dialogueActive || interactionLimitReached}
      >
        闲谈
      </button>
      <button
        type="button"
        onClick={() => void handleAction({ actionId: 'farewell', label: '告退', consumesInteraction: false })}
        disabled={dialogueActive}
      >
        告退
      </button>
    </aside>
  );

  const portrait = (
    <div className="harem-palace-view__audience-portrait-stage" aria-label="太后常驻立绘">
      <div className="harem-palace-view__audience-portrait-frame">
        <AutoCutoutPortrait
          src={DOWAGER_PORTRAIT_SRC}
          alt="太后"
          threshold={34}
          sampleInset={8}
          className="harem-palace-view__audience-portrait dowager-audience-view__portrait"
        />
      </div>
    </div>
  );

  const picker =
    pickerMode === 'gift' ? (
      <section className="harem-palace-view__audience-picker harem-palace-view__audience-picker--gift" aria-label="太后送礼选物">
        <header>
          <strong>可赠礼物</strong>
          <button type="button" onClick={() => setPickerMode(null)}>
            收起
          </button>
        </header>
        <div className="harem-palace-view__audience-picker-list">
          {giftItems.length > 0 ? (
            giftItems.map((item) => (
              <button key={item.itemId} type="button" onClick={() => void handleGift(item)}>
                <strong>{`${item.name} ×${item.quantity}`}</strong>
                <span>{item.description}</span>
              </button>
            ))
          ) : (
            <p>当前背包里没有可送出的礼物。</p>
          )}
        </div>
      </section>
    ) : undefined;

  const dialogue = dialogueActive ? (
    <GlobalDialogueStage
      sceneLabel="建章宫太后对话场景"
      portraitLabel="太后常驻立绘"
      ariaLabel="建章宫太后对话框"
      className="global-dialogue-stage--dowager global-dialogue-stage--with-side-panel"
      dialogueClassName="palace-dialogue-box--consort-audience palace-dialogue-box--dowager-audience"
      suppressPortrait
      characterIdentity={dialogueTurn?.speakerIdentity ?? '建章宫宫人'}
      characterName={dialogueTurn?.speakerName ?? '通传'}
      content={dialogueTurn?.text ?? '宫人正往殿内通传，你暂且候在阶前。'}
      options={options}
      onSelectOption={(optionId) => {
        void handleOptionSelect(optionId);
      }}
      onNextAction={options.length === 0 ? () => void handleNextAction() : undefined}
      busy={busy}
    />
  ) : undefined;

  return (
    <AudienceInteractionShell
      ariaLabel="太后 日常对话"
      heading="建章宫 · 太后"
      className="dowager-audience-view"
      metaRows={metaRows}
      portrait={portrait}
      actions={actions}
      picker={picker}
      dialogue={dialogue}
    />
  );
}
