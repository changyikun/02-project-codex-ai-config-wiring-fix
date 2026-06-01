import {
  requestConsortDialogue,
  type ConsortDialogueRequestPayload,
  type ConsortDialogueResponsePayload,
} from '../../ai/consortDialogueAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';
import type { ConsortDialogueTurn, RelationshipToneTag } from '../types';

export interface TaiyiDialogueActor {
  id: string;
  name: string;
  identity: string;
  residence: string;
  personality: string;
  summary: string;
  currentGoodwill: number;
  currentAffection: number;
  actorKind: 'consort' | 'dowager' | 'jianning';
}

const buildJianNingFallbackOptions = (): ConsortDialogueResponsePayload['options'] => [
  { id: 'steady', label: '先按规矩问诊', effectHint: '把礼数守稳，再看他愿不愿往下说。', fallbackToneTag: 'neutral' },
  { id: 'learn', label: '顺着脉案请教', effectHint: '更容易换来一句真提点。', fallbackToneTag: 'friendly' },
  { id: 'probe', label: '借病症试探他', effectHint: '看看他究竟肯把话留到哪一步。', fallbackToneTag: 'cold' },
];

const buildDowagerFallbackOptions = (): ConsortDialogueResponsePayload['options'] => [
  { id: 'kneel', label: '先依礼问安', effectHint: '不抢话头，先看太后今日为何来太医院。', fallbackToneTag: 'neutral' },
  { id: 'listen', label: '低声认下提点', effectHint: '让她看见你肯受教。', fallbackToneTag: 'friendly' },
  { id: 'observe', label: '顺着话意试探', effectHint: '试着摸清她这一回来看谁、查什么。', fallbackToneTag: 'cold' },
];

const buildConsortFallbackOptions = (): ConsortDialogueResponsePayload['options'] => [
  { id: 'warm', label: '先温声寒暄', effectHint: '把场面放软，再慢慢探她来意。', fallbackToneTag: 'friendly' },
  { id: 'probe', label: '借药香试探', effectHint: '看她究竟是真来问诊，还是另有心事。', fallbackToneTag: 'neutral' },
  { id: 'hold', label: '只把礼数做满', effectHint: '先稳住分寸，不急着露心思。', fallbackToneTag: 'cold' },
];

const buildFallbackOptions = (actor: TaiyiDialogueActor): ConsortDialogueResponsePayload['options'] => {
  if (actor.actorKind === 'jianning') {
    return buildJianNingFallbackOptions();
  }
  if (actor.actorKind === 'dowager') {
    return buildDowagerFallbackOptions();
  }
  return buildConsortFallbackOptions();
};

const buildFallbackText = (
  payload: ConsortDialogueRequestPayload,
  actor: TaiyiDialogueActor,
): { text: string; sceneHint: string } => {
  if (actor.actorKind === 'jianning' && payload.actionId === 'forced-meet') {
    return {
      text:
        '你在回廊尽头撞见简宁正替一名宫人按脉。他将指尖从脉上收回，先低声交代了药童两句，才转向你微微颔首：“娘娘既能走到这里，多半不是来看热闹的。太医院里人命轻重都压在一张方子上，若真想学药理，先学看脉、辨急缓，再谈旁的。”',
      sceneHint: '这是你与简宁在太医院的第一次照面。此后主界面会留下他的入口。',
    };
  }

  if (actor.actorKind === 'jianning') {
    return {
      text:
        '简宁把案上的脉案合拢，语气稳得近乎冷静：“太医院里最怕的不是方子难开，是看错了轻重，还以为自己救得了人。娘娘若只是想问一句药理，我能回；若想借病症去看人心，那就得先想清楚，自己受不受得住后果。”',
      sceneHint: '他说话极稳，像每一句都先在心里过了一遍药性与分寸。',
    };
  }

  if (actor.actorKind === 'dowager') {
    return {
      text:
        '太后立在药柜前，并未立刻回身，只淡淡道：“来太医院的人，不一定都是为问诊，也可能是来查一桩不该病的病。你既在这里撞见哀家，就别只拿场面话来搪塞。若要回话，便回一句担得住轻重的。”',
      sceneHint: '太医院里一句病情、一句口风，都可能另有分量。',
    };
  }

  return {
    text: `你在药廊拐角处与${actor.identity} ${actor.name}撞见，对方先按住袖口闻了一下药香，才低声道：“娘娘今日会来太医院，倒叫人意外。这里最不缺脉案与耳目，若您当真有话，不妨先看我愿不愿意接。”`,
    sceneHint: '药香压不住人心，越是静处，越显得一句话轻重分明。',
  };
};

const buildFallbackTurn = (
  payload: ConsortDialogueRequestPayload,
  actor: TaiyiDialogueActor,
): ConsortDialogueTurn => {
  const fallback = buildFallbackText(payload, actor);
  if (payload.topic === 'follow-up') {
    const optionLabel = payload.selectedOptionLabel ?? '这句话';

    if (actor.actorKind === 'jianning') {
      return {
        mode: 'line',
        phase: 'finish',
        speakerIdentity: actor.identity,
        speakerName: actor.name,
        text: `简宁听完你这句“${optionLabel}”，只把脉案往掌下一压，才缓声道：“娘娘能把话说到这里，已算明白几分。药理这种事，最忌心浮。往后若还想来问，就带着今日这点耐性再来。”`,
        nextActionLabel: '收起',
        sceneHint: '这一回话头已经收住，可以回到太医院主界面了。',
        options: [],
        usedFallback: true,
      };
    }

    if (actor.actorKind === 'dowager') {
      return {
        mode: 'line',
        phase: 'finish',
        speakerIdentity: actor.identity,
        speakerName: actor.name,
        text: '太后听罢并未再追问，只将视线从药柜上缓缓收回：“记得住轻重，比记得住药名更要紧。太医院不是由人逞聪明的地方，今日这句，到这里便够了。”',
        nextActionLabel: '收起',
        sceneHint: '太后已把话收住，不宜再在廊下逗留。',
        options: [],
        usedFallback: true,
      };
    }

    return {
      mode: 'line',
      phase: 'finish',
      speakerIdentity: actor.identity,
      speakerName: actor.name,
      text: `${actor.identity} ${actor.name}把你这句“${optionLabel}”听了进去，略略拢住袖口，才轻声道：“娘娘既肯把话递到这里，我自然记下了。太医院不是久谈之地，这一轮便先收住，改日再续。”`,
      nextActionLabel: '收起',
      sceneHint: '这一轮回应已经收束，可以回到太医院主界面了。',
      options: [],
      usedFallback: true,
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
    usedFallback: true,
  };
};

const isToneTag = (value: unknown): value is RelationshipToneTag =>
  value === 'friendly' || value === 'flirt' || value === 'cold' || value === 'reject' || value === 'neutral';

const normalizeTaiyiDialogueResponse = (
  response: ConsortDialogueResponsePayload,
  payload: ConsortDialogueRequestPayload,
  actor: TaiyiDialogueActor,
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
      usedFallback: false,
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
    usedFallback: false,
  };
};

export const requestTaiyiDialogueWithFallback = async (
  payload: ConsortDialogueRequestPayload,
  actor: TaiyiDialogueActor,
): Promise<ConsortDialogueTurn> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildFallbackTurn(payload, actor);
  }

  try {
    const response = await requestConsortDialogue(payload);
    return normalizeTaiyiDialogueResponse(response, payload, actor);
  } catch {
    return buildFallbackTurn(payload, actor);
  }
};
