import { useEffect, useState } from 'react';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { AutoCutoutPortrait } from '../visual/AutoCutoutPortrait';
import { trimDialogueHistory } from '../../game/lib/dialogueSceneUtils';
import { requestDowagerLocalDialogue } from '../../game/lib/dowagerDialogueRuntime';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { ConsortDialogueOption, ConsortDialogueTurn } from '../../game/types';

interface DowagerAudiencePanelProps {
  onLeave: () => void;
}

interface HistoryEntry {
  speaker: string;
  text: string;
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

export function DowagerAudiencePanel({ onLeave }: DowagerAudiencePanelProps) {
  const { state, time, hiddenStats } = useGameFlowStore();
  const [dialogueTurn, setDialogueTurn] = useState<ConsortDialogueTurn | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeActionId, setActiveActionId] = useState<'visit' | 'gift-greet' | 'farewell'>('visit');
  const [activeActionLabel, setActiveActionLabel] = useState('静候传话');

  const playerRankLabel = hiddenStats.initialRank ?? '宫妃';
  const options = dialogueTurn?.options ?? [];
  const dialogueActive = busy || Boolean(dialogueTurn);

  const buildPayload = (
    topic: 'visit' | 'action' | 'follow-up',
    actionId: 'visit' | 'gift-greet' | 'farewell',
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
        id: 'npc-dowager',
        name: '太后',
        rank: '太后',
        residence: '建章宫',
        stateLabel: '寻常',
        personality: DOWAGER_PERSONA.personality,
        summary: `${DOWAGER_PERSONA.summary} ${DOWAGER_PERSONA.speechRules} 参考语气：${DOWAGER_PERSONA.speechExamples} 禁区：${DOWAGER_PERSONA.forbiddenTopics}`,
        currentGoodwill: 0,
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
    actionId: 'visit' | 'gift-greet' | 'farewell',
    actionLabel: string,
    overrides?: {
      actionResult?: string;
      selectedOptionId?: string;
      selectedOptionLabel?: string;
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

  useEffect(() => {
    setDialogueTurn(null);
    setHistory([]);
    setBusy(false);
    setActiveActionId('visit');
    setActiveActionLabel('静候传话');
  }, []);

  const handleAction = async (actionId: 'gift-greet' | 'farewell', actionLabel: string) => {
    if (busy) {
      return;
    }

    setBusy(true);
    setDialogueTurn((currentTurn) =>
      currentTurn
        ? {
            ...currentTurn,
            mode: 'line',
            options: [],
          }
        : currentTurn,
    );
    setActiveActionId(actionId);
    setActiveActionLabel(actionLabel);

    try {
      await runNarrativeTurn('action', actionId, actionLabel, {
        actionResult:
          actionId === 'gift-greet'
            ? '你已奉上礼物，并以宫礼向太后问安。'
            : '你起身整顿衣袖，准备向太后辞行。',
      });
    } finally {
      setBusy(false);
    }
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

    if (dialogueTurn.phase === 'finish' || activeActionId === 'farewell') {
      onLeave();
      return;
    }

    setBusy(true);

    try {
      await runNarrativeTurn('action', 'farewell', '起身告辞', {
        actionResult: '你将话收住，准备依礼告退。',
      });
      setActiveActionId('farewell');
      setActiveActionLabel('起身告辞');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="harem-palace-view__audience dowager-audience-view" aria-label="建章宫太后对话场景">
      <header className="harem-palace-view__audience-header">
        <div className="harem-palace-view__heading">
          <span>建章宫 · 拜见太后</span>
        </div>
      </header>

      {!dialogueActive ? (
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
      ) : null}

      {!dialogueActive ? (
        <section className="dowager-audience-view__briefing" aria-label="建章宫场景说明">
          <strong>太后端坐上首，尚未赐话。</strong>
          <p>你需先依礼问安，再看她今日愿意把话放到几分。</p>
        </section>
      ) : null}

      <aside className="harem-palace-view__audience-actions" aria-label="建章宫交互选项">
        <button type="button" onClick={() => void handleAction('gift-greet', '送礼问安')} disabled={dialogueActive}>
          送礼问安
        </button>
        <button type="button" onClick={() => void handleAction('farewell', '起身告辞')} disabled={dialogueActive}>
          起身告辞
        </button>
      </aside>

      {dialogueActive ? (
        <GlobalDialogueStage
          sceneLabel="建章宫太后对话场景"
          portraitLabel="太后立绘"
          portrait={
            <AutoCutoutPortrait
              src={DOWAGER_PORTRAIT_SRC}
              alt="太后"
              threshold={34}
              sampleInset={8}
              className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--dowager"
            />
          }
          ariaLabel="建章宫太后对话框"
          className="global-dialogue-stage--dowager global-dialogue-stage--with-side-panel"
          dialogueClassName="palace-dialogue-box--consort-audience palace-dialogue-box--dowager-audience"
          characterIdentity={dialogueTurn?.speakerIdentity ?? '建章宫宫人'}
          characterName={dialogueTurn?.speakerName ?? '通传'}
          content={dialogueTurn?.text ?? '宫人正往殿内通传，你暂且候在阶前。'}
          options={options as ConsortDialogueOption[]}
          onSelectOption={(optionId) => {
            void handleOptionSelect(optionId);
          }}
          onNextAction={options.length === 0 ? () => void handleNextAction() : undefined}
          busy={busy}
        />
      ) : null}
    </section>
  );
}
