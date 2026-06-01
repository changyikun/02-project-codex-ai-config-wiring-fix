import {
  requestConsortDialogue,
  type ConsortDialogueRequestPayload,
  type ConsortDialogueResponsePayload,
} from '../../ai/consortDialogueAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';
import type { ConsortDialogueTurn, RelationshipToneTag } from '../types';

const KITCHEN_DIALOGUE_TIMEOUT_MS = 900;

export interface KitchenDialogueActor {
  id: string;
  name: string;
  identity: string;
  residence: string;
  personality: string;
  summary: string;
  currentGoodwill: number;
  currentAffection: number;
  actorKind: 'consort' | 'buziyou';
}

const buildVoiceTag = (actor: KitchenDialogueActor): string => {
  if (actor.actorKind === 'buziyou') {
    return '他抬眼时先看锅灶后的火候，像是连说话都带着掌勺人收火时的稳当。';
  }
  if (actor.personality.includes('骄矜') || actor.personality.includes('好胜')) {
    return '她嘴上仍端着体面，眼神里却不肯先让半寸。';
  }
  if (actor.personality.includes('温顺') || actor.personality.includes('体贴')) {
    return '她先把语气放柔了，像是生怕一句话说得太重。';
  }
  if (actor.personality.includes('清醒') || actor.personality.includes('守密')) {
    return '她说话前先停了一停，像是在衡量这句值不值得落下。';
  }
  return '她把话说得不急不缓，叫人一时看不透心里究竟偏向哪边。';
};

const buildFallbackText = (
  payload: ConsortDialogueRequestPayload,
  actor: KitchenDialogueActor,
): { text: string; sceneHint: string } => {
  const voiceTag = buildVoiceTag(actor);
  const firstMeetBuZiyou = actor.actorKind === 'buziyou' && payload.actionId === 'forced-meet';

  if (firstMeetBuZiyou) {
    return {
      text: `${voiceTag} 布自游拎着刚起锅的食盒从灶后转出来，先把你从头到尾看了一遍，才低声笑道：“娘娘倒是不避烟火气。御膳房人来人往，若只想寻口热食，我还能替娘娘挑一份清爽的；若想借这地方看人，也未必来错。”`,
      sceneHint: '这是你与布自游在御膳房的第一次照面。此后主界面会留下他的入口。',
    };
  }

  if (actor.actorKind === 'buziyou') {
    return {
      text: `${voiceTag} 布自游抬手把木匙搁在案边，朝你略略颔首：“膳房里最不缺的就是耳目，娘娘若来找我，想必也不是只为了问这锅汤熬得如何。话可以说，只是说到哪一步，得看娘娘先给我几分真心。”`,
      sceneHint: '布自游惯会留半句余地。你说得越直，他越会借机试你的分寸。',
    };
  }

  if (payload.actionId === 'stroll-encounter') {
    return {
      text: `${voiceTag} 你在御膳房廊下与${actor.identity} ${actor.name}撞了个正着。炊烟尚暖，她却已经先按住袖口，低声道：“娘娘今日会来这里，倒叫人意外。御膳房人杂口杂，若娘娘有话，不妨说得轻些。”`,
      sceneHint: '这里比寝宫更近人间烟火，也更容易把一句随口的话放大成流言。',
    };
  }

  return {
    text: `${voiceTag} ${actor.name}站在灶间暖光里望向你，像是已经猜到你不会只为一盘点心驻足。`,
    sceneHint: '先看她愿不愿意把这场偶遇当成一段能继续的话。'
  };
};

const buildFallbackOptions = (actor: KitchenDialogueActor): ConsortDialogueResponsePayload['options'] => {
  if (actor.actorKind === 'buziyou') {
    return [
      { id: 'probe', label: '借食单试探他', effectHint: '顺着闲话探一探他真正站哪边。', fallbackToneTag: 'neutral' },
      { id: 'warm', label: '放软语气示好', effectHint: '更容易稳稳攒一点好感。', fallbackToneTag: 'friendly' },
      { id: 'tease', label: '故意留半句玩笑', effectHint: '若他愿接，最容易牵出暧昧余地。', fallbackToneTag: 'flirt' },
    ];
  }

  return [
    { id: 'warm', label: '顺着烟火气寒暄', effectHint: '先把场面放软，最适合慢慢加好感。', fallbackToneTag: 'friendly' },
    { id: 'probe', label: '借御膳房试探心思', effectHint: '容易摸清她的站位与防备。', fallbackToneTag: 'neutral' },
    { id: 'cold', label: '只把礼数做足', effectHint: '维持分寸，不急着把心思露出来。', fallbackToneTag: 'cold' },
  ];
};

const buildFallbackTurn = (
  payload: ConsortDialogueRequestPayload,
  actor: KitchenDialogueActor,
): ConsortDialogueTurn => {
  const fallback = buildFallbackText(payload, actor);
  if (payload.topic === 'follow-up') {
    const optionLabel = payload.selectedOptionLabel ?? '这句话';
    return {
      mode: 'line',
      phase: 'finish',
      speakerIdentity: actor.identity,
      speakerName: actor.name,
      text:
        actor.actorKind === 'buziyou'
          ? `布自游听完你这句“${optionLabel}”，先把灶边木匙搁稳，才低声笑道：“娘娘既把话递到这里，我自然听明白了。御膳房里不宜久留，这一轮先收着，往后再说。”`
          : `${actor.identity} ${actor.name}把你这句“${optionLabel}”听了进去，略略压住袖口，才轻声道：“娘娘既肯把话说到这里，我也记下了。御膳房人多耳杂，这一轮便先收住。”`,
      nextActionLabel: '收起',
      sceneHint: '这一轮回应已经收束，可以回到御膳房主界面了。',
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
  };
};

const isToneTag = (value: unknown): value is RelationshipToneTag =>
  value === 'friendly' || value === 'flirt' || value === 'cold' || value === 'reject' || value === 'neutral';

const normalizeKitchenDialogueResponse = (
  response: ConsortDialogueResponsePayload,
  payload: ConsortDialogueRequestPayload,
  actor: KitchenDialogueActor,
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
        String(option.effectHint ?? '').trim() || fallbackOptions[index]?.effectHint || '继续试探这一场偶遇的走向。',
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

export const requestKitchenDialogueWithFallback = async (
  payload: ConsortDialogueRequestPayload,
  actor: KitchenDialogueActor,
): Promise<ConsortDialogueTurn> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildFallbackTurn(payload, actor);
  }

  try {
    const response = await requestConsortDialogue(payload, { timeoutMs: KITCHEN_DIALOGUE_TIMEOUT_MS });
    return normalizeKitchenDialogueResponse(response, payload, actor);
  } catch {
    return buildFallbackTurn(payload, actor);
  }
};
