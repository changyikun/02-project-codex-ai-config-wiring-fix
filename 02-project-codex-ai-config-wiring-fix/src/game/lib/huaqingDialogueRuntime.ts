import {
  requestConsortDialogue,
  type ConsortDialogueRequestPayload,
  type ConsortDialogueResponsePayload,
} from '../../ai/consortDialogueAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';
import type { ConsortDialogueTurn, RelationshipToneTag } from '../types';

export interface HuaqingDialogueActor {
  id: string;
  name: string;
  identity: string;
  residence: string;
  personality: string;
  summary: string;
  currentGoodwill: number;
  currentAffection: number;
  actorKind: 'consort' | 'lianqiao';
}

const buildLianQiaoOptions = (): ConsortDialogueResponsePayload['options'] => [
  { id: 'soft', label: '顺着水声轻轻应她', effectHint: '更容易把这一场气氛稳稳接住。', fallbackToneTag: 'friendly' },
  { id: 'tease', label: '借雾气试她一句', effectHint: '若她肯接，最容易把话往暧昧处引。', fallbackToneTag: 'flirt' },
  { id: 'hold', label: '只把分寸守住', effectHint: '不急着把心思露得太快。', fallbackToneTag: 'neutral' },
];

const buildConsortOptions = (): ConsortDialogueResponsePayload['options'] => [
  { id: 'warm', label: '先放柔声线寒暄', effectHint: '更适合把池边的气氛放缓。', fallbackToneTag: 'friendly' },
  { id: 'probe', label: '借这一池雾气探她', effectHint: '试试看她愿不愿意把真心话往外递。', fallbackToneTag: 'neutral' },
  { id: 'hold', label: '只把礼数做稳', effectHint: '先守着分寸，不急着表态。', fallbackToneTag: 'cold' },
];

const buildFallbackText = (
  payload: ConsortDialogueRequestPayload,
  actor: HuaqingDialogueActor,
): { text: string; sceneHint: string } => {
  if (actor.actorKind === 'lianqiao') {
    return {
      text:
        payload.topic === 'follow-up'
          ? '连翘把落在水面上的雾气看了片刻，才偏过脸来，声音压得极轻：“娘娘这句回得倒像留了半折尾音，叫人忍不住还想再听下去。华清池里水暖，话却不能说得太满，否则一出这道门，余温就先散了。”'
          : '池边灯影映在水面上，一圈一圈晃开。连翘将湿润的发尾拢到肩后，像是先听完了你呼吸里的停顿，才轻声道：“妙音堂外的连翘会听曲，到了华清池边，便更会听人。娘娘既在深夜把人请到这里，总不会只是想叫这一池水白白起雾吧？”',
      sceneHint: '深夜的华清池比别处更近，也更容易把一句话记得太深。',
    };
  }

  return {
    text:
      payload.topic === 'follow-up'
        ? `${actor.identity} ${actor.name}抬手拂开一点水雾，语气并不高，却比方才更近了几分：“娘娘这句说得巧。华清池这样的地方，最怕的不是水冷，是人心明明动了，却还要装作全无波澜。”`
        : `温泉热气沿着池沿慢慢漫开，${actor.identity} ${actor.name}隔着一层薄雾望向你，先低低行了一礼，才轻声道：“娘娘今夜邀我同来华清池，倒叫人意外。这里离宫墙远，离人心却近，若真要说什么，只怕一句比一句更难装作没听见。”`,
    sceneHint: '池边水声不断，越是轻的一句话，越容易被人听进心里。',
  };
};

const buildFallbackTurn = (
  payload: ConsortDialogueRequestPayload,
  actor: HuaqingDialogueActor,
): ConsortDialogueTurn => {
  const fallback = buildFallbackText(payload, actor);

  if (payload.topic === 'follow-up') {
    return {
      mode: 'line',
      phase: 'finish',
      speakerIdentity: actor.identity,
      speakerName: actor.name,
      text:
        actor.actorKind === 'lianqiao'
          ? '连翘听完你这句，只把目光从水面慢慢收回：“娘娘若还想留住这一夜的余温，往后便别只靠运气来见我。今日到这里，已经够了。”'
          : `${actor.name}听完后没有再往前递话，只把这一池水雾静静看了片刻：“华清池里的话，说到这里也就够了。再往下走，恐怕谁都未必还装得住从容。”`,
      nextActionLabel: '收起',
      sceneHint: '这一轮对话已经收束，可以回到华清池主界面了。',
      options: [],
    };
  }

  return {
    mode: 'branch',
    phase: 'continue',
    speakerIdentity: actor.identity,
    speakerName: actor.name,
    text: fallback.text,
    nextActionLabel: '收起',
    sceneHint: fallback.sceneHint,
    options: actor.actorKind === 'lianqiao' ? buildLianQiaoOptions() : buildConsortOptions(),
  };
};

const isToneTag = (value: unknown): value is RelationshipToneTag =>
  value === 'friendly' || value === 'flirt' || value === 'cold' || value === 'reject' || value === 'neutral';

const normalizeHuaqingDialogueResponse = (
  response: ConsortDialogueResponsePayload,
  payload: ConsortDialogueRequestPayload,
  actor: HuaqingDialogueActor,
): ConsortDialogueTurn => {
  const fallback = buildFallbackTurn(payload, actor);
  const text = String(response.text ?? '').trim();
  const mode = response.mode === 'line' ? 'line' : 'branch';

  if (!text) {
    return fallback;
  }

  if (mode === 'line') {
    return {
      mode: 'line',
      phase: response.phase === 'finish' ? 'finish' : 'continue',
      speakerIdentity: String(response.speakerIdentity ?? '').trim() || actor.identity,
      speakerName: String(response.speakerName ?? '').trim() || actor.name,
      text,
      nextActionLabel: String(response.nextActionLabel ?? '').trim() || '下一句',
      sceneHint: String(response.sceneHint ?? '').trim() || fallback.sceneHint,
      options: [],
    };
  }

  const fallbackOptions = fallback.options;
  const normalizedOptions = response.options
    .filter((option) => option && isToneTag(option.fallbackToneTag))
    .slice(0, 3)
    .map((option, index) => ({
      id: String(option.id ?? `option-${index + 1}`),
      label: String(option.label ?? '').trim() || fallbackOptions[index]?.label || `选项${index + 1}`,
      effectHint:
        String(option.effectHint ?? '').trim() || fallbackOptions[index]?.effectHint || '继续顺着这一轮试探往下走。',
      fallbackToneTag: option.fallbackToneTag,
      nextTopic: option.nextTopic,
    }));

  const options =
    normalizedOptions.length === 3
      ? normalizedOptions
      : fallbackOptions.map((option, index) => normalizedOptions[index] ?? option);

  return {
    mode: 'branch',
    phase: response.phase === 'finish' ? 'finish' : 'continue',
    speakerIdentity: String(response.speakerIdentity ?? '').trim() || actor.identity,
    speakerName: String(response.speakerName ?? '').trim() || actor.name,
    text,
    nextActionLabel: String(response.nextActionLabel ?? '').trim() || fallback.nextActionLabel,
    sceneHint: String(response.sceneHint ?? '').trim() || fallback.sceneHint,
    options,
  };
};

export const requestHuaqingDialogueWithFallback = async (
  payload: ConsortDialogueRequestPayload,
  actor: HuaqingDialogueActor,
): Promise<ConsortDialogueTurn> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildFallbackTurn(payload, actor);
  }

  try {
    const response = await requestConsortDialogue(payload);
    return normalizeHuaqingDialogueResponse(response, payload, actor);
  } catch {
    return buildFallbackTurn(payload, actor);
  }
};
