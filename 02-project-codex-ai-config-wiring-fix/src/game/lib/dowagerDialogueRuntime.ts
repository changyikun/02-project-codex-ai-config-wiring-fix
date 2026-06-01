import {
  requestConsortDialogue,
  type ConsortDialogueRequestPayload,
  type ConsortDialogueResponsePayload,
} from '../../ai/consortDialogueAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';
import type { ConsortDialogueTurn, RelationshipToneTag } from '../types';

const selectByXun = <T,>(payload: ConsortDialogueRequestPayload, variants: T[]): T =>
  variants[(payload.timeContext.month + payload.timeContext.xun + payload.history.length) % variants.length];

const buildFallbackOptionsByPayload = (payload: ConsortDialogueRequestPayload): ConsortDialogueResponsePayload['options'] => {
  if (payload.actionId === 'farewell') {
    return [];
  }

  if (payload.actionId === 'gift-greet') {
    return selectByXun(payload, [
      [
        { id: 'tribute', label: '依礼进上薄礼', effectHint: '先把礼数与敬意做足。', fallbackToneTag: 'friendly' as const },
        { id: 'humble', label: '谦声问安自省', effectHint: '以低姿态听她敲打。', fallbackToneTag: 'neutral' as const },
        { id: 'seek-advice', label: '顺势请教宫规', effectHint: '借她的话摸清这一旬风向。', fallbackToneTag: 'friendly' as const },
      ],
      [
        { id: 'tribute', label: '先谢太后抬举', effectHint: '把自己放在受教的位置。', fallbackToneTag: 'friendly' as const },
        { id: 'humble', label: '只陈问安之意', effectHint: '不急着把心思露得太满。', fallbackToneTag: 'neutral' as const },
        { id: 'seek-advice', label: '请太后示下规矩', effectHint: '让她来定谈话轻重。', fallbackToneTag: 'friendly' as const },
      ],
      [
        { id: 'tribute', label: '奉礼后静候发落', effectHint: '把主动权先交到她手里。', fallbackToneTag: 'neutral' as const },
        { id: 'humble', label: '低声认自己见识浅', effectHint: '先让她看见你的分寸。', fallbackToneTag: 'friendly' as const },
        { id: 'seek-advice', label: '借请安探她心意', effectHint: '顺势摸清她今日真正想说什么。', fallbackToneTag: 'cold' as const },
      ],
    ]);
  }

  return selectByXun(payload, [
    [
      { id: 'kneel', label: '先行叩安陈礼', effectHint: '守礼为先，听太后先开口。', fallbackToneTag: 'neutral' as const },
      { id: 'listen', label: '只低头静听', effectHint: '先看她今日是松是紧。', fallbackToneTag: 'friendly' as const },
      { id: 'observe', label: '顺着话意试探', effectHint: '看她会不会给出更多暗示。', fallbackToneTag: 'cold' as const },
    ],
    [
      { id: 'kneel', label: '恭声回一句规矩在前', effectHint: '先把体统摆正。', fallbackToneTag: 'neutral' as const },
      { id: 'listen', label: '认下太后提点', effectHint: '让她看到你愿意受教。', fallbackToneTag: 'friendly' as const },
      { id: 'observe', label: '借旧例探她口风', effectHint: '试着摸清她的裁量方向。', fallbackToneTag: 'cold' as const },
    ],
    [
      { id: 'kneel', label: '先请太后示下', effectHint: '让她决定这一场谈话的规矩。', fallbackToneTag: 'neutral' as const },
      { id: 'listen', label: '压住锋芒应答', effectHint: '保留余地，不争一时机巧。', fallbackToneTag: 'friendly' as const },
      { id: 'observe', label: '顺着话锋再问半句', effectHint: '看她会不会多露一点真意。', fallbackToneTag: 'cold' as const },
    ],
  ]);
};

const buildFallbackText = (
  payload: ConsortDialogueRequestPayload,
): { mode: 'line' | 'branch'; phase: 'continue' | 'finish'; text: string; nextActionLabel: string; sceneHint?: string } => {
  const openingTag =
    payload.playerOpeningTendency === '节衣缩食'
      ? '她看得出你惯会收锋藏势，因此话里更多两分试探。'
      : payload.playerOpeningTendency === '锦衣玉食'
        ? '她知道你不是肯轻易低头的人，因此每一句都压着规矩来敲打。'
        : '她尚在看你究竟是可用之人，还是只会逞一时聪明。';

  if (payload.actionId === 'farewell') {
    return {
      mode: 'line',
      phase: 'finish',
      text: `太后将茶盏轻轻一搁，目光只在你身上停了一瞬，便温声道：“礼已尽，话也说到这里。你既知道建章宫不是纵口任性的地方，往后行事，便把今日这点分寸一直守下去。去罢。” 她没有再多看你，像是该给的提点已经给完，不必再把话说透。`,
      nextActionLabel: '离开建章宫',
      sceneHint: '太后已准你告退。',
    };
  }

  if (payload.topic === 'follow-up') {
    const optionLabel = payload.selectedOptionLabel ?? '回话';
    return {
      mode: 'line',
      phase: 'finish',
      text: `太后听完你这一句“${optionLabel}”，眉眼间并无明显喜怒，只把声线放得更缓：“会说话，不算本事；知道什么时候该收，才算真明白。” 她指尖轻轻敲了一下茶盏，又淡淡添道：“哀家今日肯同你说这些，不是叫你回去自鸣得意，而是要你记得，宫里最难守的，从来不是体面，是得了体面之后仍不失规矩。” ${openingTag}`,
      nextActionLabel: '收礼告退',
      sceneHint: '这一轮话已经收束，可以离殿了。',
    };
  }

  if (payload.actionId === 'gift-greet') {
    return {
      mode: 'branch',
      phase: 'continue',
      text: `你上前奉礼问安后，太后并未急着去看那份礼，只先把你从头到脚缓缓打量了一遍，才道：“肯记得来建章宫尽礼，是好事。只是哀家见得多了，知道有人送的是心，有人送的是局。” 她指尖轻轻按在案边，语气仍平稳得近乎温和：“你若只是来做个样子，哀家一眼便看得出；你若当真有话，就说一句担得起后果的。” ${openingTag}`,
      nextActionLabel: '收起',
      sceneHint: '太后愿意继续听下去，但她更在意你的分寸。',
    };
  }

  return {
    mode: 'branch',
    phase: 'continue',
    text: `你入建章宫时，太后已端坐在上首。她并不急着发话，只等你把礼数一项项做全，才缓缓开口：“今日肯过来见哀家，想来不是一时兴起。后宫不是养天真的地方，谁都要学着先看局势，再看人心，最后才轮到自己的委屈与喜恶。” 她说到这里，目光不轻不重地落在你身上：“你若是个明白人，就该听得懂这话里几层意思。” ${openingTag}`,
    nextActionLabel: '收起',
    sceneHint: '先听太后的话意，再决定如何应对。',
  };
};

const isToneTag = (value: unknown): value is RelationshipToneTag =>
  value === 'friendly' || value === 'flirt' || value === 'cold' || value === 'reject' || value === 'neutral';

const buildFallbackTurn = (payload: ConsortDialogueRequestPayload): ConsortDialogueTurn => {
  const fallback = buildFallbackText(payload);

  return {
    mode: fallback.mode,
    phase: fallback.phase,
    speakerIdentity: '太后',
    speakerName: '太后',
    text: fallback.text,
    nextActionLabel: fallback.nextActionLabel,
    sceneHint: fallback.sceneHint,
    options: fallback.mode === 'branch' ? buildFallbackOptionsByPayload(payload) : [],
  };
};

const normalizeDowagerDialogueResponse = (
  response: ConsortDialogueResponsePayload,
  payload: ConsortDialogueRequestPayload,
): ConsortDialogueTurn => {
  const fallback = buildFallbackTurn(payload);
  const text = String(response.text ?? '').trim();

  if (!text) {
    return fallback;
  }

  if (response.mode === 'line') {
    return {
      mode: 'line',
      phase: response.phase === 'finish' ? 'finish' : 'continue',
      speakerIdentity: String(response.speakerIdentity ?? '').trim() || fallback.speakerIdentity,
      speakerName: String(response.speakerName ?? '').trim() || fallback.speakerName,
      text,
      nextActionLabel: String(response.nextActionLabel ?? '').trim() || fallback.nextActionLabel,
      sceneHint: String(response.sceneHint ?? '').trim() || fallback.sceneHint,
      options: [],
    };
  }

  const options = response.options
    .filter((option) => option && isToneTag(option.fallbackToneTag))
    .slice(0, 3)
    .map((option, index) => ({
      id: String(option.id ?? `dowager-option-${index + 1}`),
      label: String(option.label ?? '').trim() || fallback.options[index]?.label || `选项${index + 1}`,
      effectHint: String(option.effectHint ?? '').trim() || fallback.options[index]?.effectHint || '继续顺着太后的话意应答。',
      fallbackToneTag: option.fallbackToneTag,
      nextTopic: option.nextTopic,
    }));

  if (options.length === 0) {
    return fallback;
  }

  return {
    mode: 'branch',
    phase: response.phase === 'finish' ? 'finish' : 'continue',
    speakerIdentity: String(response.speakerIdentity ?? '').trim() || fallback.speakerIdentity,
    speakerName: String(response.speakerName ?? '').trim() || fallback.speakerName,
    text,
    nextActionLabel: String(response.nextActionLabel ?? '').trim() || fallback.nextActionLabel,
    sceneHint: String(response.sceneHint ?? '').trim() || fallback.sceneHint,
    options,
  };
};

export const requestDowagerDialogueWithFallback = async (
  payload: ConsortDialogueRequestPayload,
): Promise<ConsortDialogueTurn> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildFallbackTurn(payload);
  }

  try {
    const response = await requestConsortDialogue(payload);
    return normalizeDowagerDialogueResponse(response, payload);
  } catch {
    return buildFallbackTurn(payload);
  }
};
