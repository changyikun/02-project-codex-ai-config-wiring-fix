import {
  requestConsortDialogue,
  type ConsortDialogueRequestPayload,
  type ConsortDialogueResponsePayload,
} from '../../ai/consortDialogueAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';
import type { ConsortDialogueTurn, RelationshipToneTag } from '../types';

export interface BaohuaDialogueActor {
  id: string;
  name: string;
  identity: string;
  residence: string;
  personality: string;
  summary: string;
  currentGoodwill: number;
  currentAffection: number;
  actorKind: 'consort' | 'dowager' | 'dangyi';
}

const buildDangYiFallbackOptions = (): ConsortDialogueResponsePayload['options'] => [
  { id: 'humble', label: '先按礼回话', effectHint: '把分寸守住，再看他愿不愿意多说。', fallbackToneTag: 'neutral' },
  { id: 'sincere', label: '直陈敬意求教', effectHint: '更容易换来一句真提点。', fallbackToneTag: 'friendly' },
  { id: 'observe', label: '借佛殿旧例试探', effectHint: '看看他究竟把话留到哪一层。', fallbackToneTag: 'cold' },
];

const buildDowagerFallbackOptions = (): ConsortDialogueResponsePayload['options'] => [
  { id: 'kneel', label: '先依礼问安', effectHint: '不抢话头，先看太后今日的态度。', fallbackToneTag: 'neutral' },
  { id: 'listen', label: '低声认下提点', effectHint: '让她看见你肯受教。', fallbackToneTag: 'friendly' },
  { id: 'observe', label: '顺着话意试探', effectHint: '试着摸清她这一回为何出现在宝华殿。', fallbackToneTag: 'cold' },
];

const buildConsortFallbackOptions = (): ConsortDialogueResponsePayload['options'] => [
  { id: 'warm', label: '先顺势寒暄', effectHint: '把气氛放软，更适合慢慢探话。', fallbackToneTag: 'friendly' },
  { id: 'probe', label: '借香火试探', effectHint: '看她究竟是真清净，还是另有所想。', fallbackToneTag: 'neutral' },
  { id: 'hold', label: '只把礼数做满', effectHint: '不急着露心思，先稳住场面。', fallbackToneTag: 'cold' },
];

const buildFallbackOptions = (actor: BaohuaDialogueActor): ConsortDialogueResponsePayload['options'] => {
  if (actor.actorKind === 'dangyi') {
    return buildDangYiFallbackOptions();
  }
  if (actor.actorKind === 'dowager') {
    return buildDowagerFallbackOptions();
  }
  return buildConsortFallbackOptions();
};

const buildFallbackText = (
  payload: ConsortDialogueRequestPayload,
  actor: BaohuaDialogueActor,
): { text: string; sceneHint: string } => {
  if (actor.actorKind === 'dangyi' && payload.actionId === 'forced-meet') {
    return {
      text:
        '当一立在供灯之后，先将手里经卷合起，才朝你微微一礼：“娘娘连着来宝华殿三回，想来不是只为走个过场。佛前最忌口是心非，可宫里的人偏偏最难避开的，也是这四个字。娘娘若愿意，往后到殿里来，不妨把心放稳些，再看该问什么、该信什么。”',
      sceneHint: '这是你与当一在宝华殿的第一次照面。此后主界面会留下他的入口。',
    };
  }

  if (actor.actorKind === 'dangyi') {
    return {
      text:
        '当一将案前残香拨正，语气极缓：“宝华殿里看似最静，其实来的人各有心事。娘娘若只想求一句宽心话，我能回；若想借这地方看人心，也未必来错。只是有些话，知道得太早，不见得是福。”',
      sceneHint: '他看得透，却不肯把话一次说满。',
    };
  }

  if (actor.actorKind === 'dowager') {
    return {
      text:
        '太后立在佛前，并未回身，只淡淡开口：“肯来宝华殿的人，不一定真信佛，也未必不信因果。你既在这里撞见哀家，就别只拿场面上的话来搪塞。今日这殿里清净，你若要回话，便回一句担得起后果的。”',
      sceneHint: '太后在佛前依旧看重分寸，你一句轻重都藏不住。',
    };
  }

  return {
    text: `你在宝华殿回廊下与${actor.identity} ${actor.name}撞见，对方先按住袖口，目光在你身上轻轻停了一瞬，才低声道：“娘娘今日会来这里，倒比旁处更叫人意外。佛前清净，话也不宜说得太满，您若真有心事，不妨先看我愿不愿意接。”`,
    sceneHint: '宝华殿比别处更静，越静，越显得一句话轻重分明。',
  };
};

const buildFallbackTurn = (
  payload: ConsortDialogueRequestPayload,
  actor: BaohuaDialogueActor,
): ConsortDialogueTurn => {
  const fallback = buildFallbackText(payload, actor);
  if (actor.actorKind === 'dangyi' && payload.topic === 'follow-up') {
    return {
      mode: 'line',
      phase: 'finish',
      speakerIdentity: actor.identity,
      speakerName: actor.name,
      text: '当一听完你这句回话，只将目光在香火间停了一停，才低声道：“娘娘心里有数，往后再来宝华殿，便不会白来。今日先把这句话记下，余下的，不必急在一时。”',
      nextActionLabel: '收起',
      sceneHint: '这一回话头已经收住，可以回到殿中主界面了。',
      options: [],
    };
  }

  if (actor.actorKind === 'dowager' && payload.topic === 'follow-up') {
    return {
      mode: 'line',
      phase: 'finish',
      speakerIdentity: actor.identity,
      speakerName: actor.name,
      text: '太后听罢并未再追问，只把佛珠慢慢一捻：“记得住分寸，比会说漂亮话更要紧。宝华殿不是争一时口舌的地方，今日这句，到这里便够了。”',
      nextActionLabel: '收起',
      sceneHint: '太后已把话收住，不宜再在殿前逗留。',
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
    options: buildFallbackOptions(actor),
  };
};

const isToneTag = (value: unknown): value is RelationshipToneTag =>
  value === 'friendly' || value === 'flirt' || value === 'cold' || value === 'reject' || value === 'neutral';

const normalizeBaohuaDialogueResponse = (
  response: ConsortDialogueResponsePayload,
  payload: ConsortDialogueRequestPayload,
  actor: BaohuaDialogueActor,
): ConsortDialogueTurn => {
  const fallback = buildFallbackTurn(payload, actor);
  const text = String(response.text ?? '').trim();
  const mode = response.mode === 'line' ? 'line' : 'branch';
  const memoryCandidates = Array.isArray(response.memoryCandidates) ? response.memoryCandidates.slice(0, 5) : [];
  const relationCandidates = Array.isArray(response.relationCandidates) ? response.relationCandidates.slice(0, 6) : [];
  const affectHints = Array.isArray(response.affectHints) ? response.affectHints.slice(0, 3) : [];
  const sessionMemory = response.sessionMemory;
  const relationMemory = response.relationMemory;

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
      memoryCandidates,
      relationCandidates,
      affectHints,
      sessionMemory,
      relationMemory,
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
    memoryCandidates,
    relationCandidates,
    affectHints,
    sessionMemory,
    relationMemory,
  };
};

export const requestBaohuaDialogueWithFallback = async (
  payload: ConsortDialogueRequestPayload,
  actor: BaohuaDialogueActor,
): Promise<ConsortDialogueTurn> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildFallbackTurn(payload, actor);
  }

  try {
    const response = await requestConsortDialogue(payload);
    return normalizeBaohuaDialogueResponse(response, payload, actor);
  } catch {
    return buildFallbackTurn(payload, actor);
  }
};
