import {
  requestConsortDialogue,
  type ConsortDialogueRequestPayload,
  type ConsortDialogueResponsePayload,
} from '../../ai/consortDialogueAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';
import type { ConsortDialogueTurn, RelationshipToneTag } from '../types';

export interface MiaoYinDialogueActor {
  id: string;
  name: string;
  identity: string;
  residence: string;
  personality: string;
  summary: string;
  currentGoodwill: number;
  currentAffection: number;
  actorKind: 'consort' | 'lianqiao' | 'emperor';
}

const buildLianQiaoFallbackOptions = (phase: 'first' | 'unlock' | 'gift' | 'regular'): ConsortDialogueResponsePayload['options'] => {
  if (phase === 'gift') {
    return [
      { id: 'receive', label: '收下并谢她记挂', effectHint: '把这一份心意稳稳接住。', fallbackToneTag: 'friendly' },
      { id: 'tease', label: '借曲意轻轻逗她', effectHint: '若她愿接，情分更容易往前走。', fallbackToneTag: 'flirt' },
      { id: 'hold', label: '只按礼谢过', effectHint: '把分寸守得更稳。', fallbackToneTag: 'neutral' },
    ];
  }

  if (phase === 'unlock') {
    return [
      { id: 'admire', label: '夸她收音极稳', effectHint: '更合她对真懂曲人的偏好。', fallbackToneTag: 'friendly' },
      { id: 'join', label: '借曲意试探更近一步', effectHint: '若她心软，最容易留下余韵。', fallbackToneTag: 'flirt' },
      { id: 'observe', label: '只说自己想再多听几回', effectHint: '把话留住，不急着靠近。', fallbackToneTag: 'neutral' },
    ];
  }

  if (phase === 'first') {
    return [
      { id: 'listen', label: '先顺着曲理请教', effectHint: '更容易换来她一句真回话。', fallbackToneTag: 'friendly' },
      { id: 'probe', label: '借琴心试探她', effectHint: '看看她愿不愿意把话说深。', fallbackToneTag: 'neutral' },
      { id: 'hold', label: '只按礼留一句称赞', effectHint: '不把心思露得太快。', fallbackToneTag: 'cold' },
    ];
  }

  return [
    { id: 'warm', label: '顺着曲意寒暄', effectHint: '先把场面放软，再慢慢探她心思。', fallbackToneTag: 'friendly' },
    { id: 'tease', label: '借一折旧曲试她', effectHint: '若她肯接，最容易露出情绪。', fallbackToneTag: 'flirt' },
    { id: 'hold', label: '只把礼数做满', effectHint: '先稳住，不急着把话说透。', fallbackToneTag: 'neutral' },
  ];
};

const buildEmperorFallbackOptions = (): ConsortDialogueResponsePayload['options'] => [
  { id: 'accept', label: '顺势应下邀约', effectHint: '把姿态放柔，顺着圣意往下走。', fallbackToneTag: 'friendly' },
  { id: 'tease', label: '借曲意轻轻回敬', effectHint: '暧昧余地更足，也更考验分寸。', fallbackToneTag: 'flirt' },
  { id: 'cautious', label: '只依礼谢恩', effectHint: '不失体统，却会把距离留得更远。', fallbackToneTag: 'neutral' },
];

const buildConsortFallbackOptions = (): ConsortDialogueResponsePayload['options'] => [
  { id: 'warm', label: '先温声问候', effectHint: '把场面放软，再看她愿不愿意多说。', fallbackToneTag: 'friendly' },
  { id: 'probe', label: '借曲声探话', effectHint: '试试她来妙音堂究竟为听曲还是为看人。', fallbackToneTag: 'neutral' },
  { id: 'hold', label: '只把礼数做稳', effectHint: '不急着露心思，先守住分寸。', fallbackToneTag: 'cold' },
];

const buildFallbackOptions = (
  actor: MiaoYinDialogueActor,
  payload: ConsortDialogueRequestPayload,
): ConsortDialogueResponsePayload['options'] => {
  if (actor.actorKind === 'lianqiao') {
    if (payload.actionId === 'gift-event') {
      return buildLianQiaoFallbackOptions('gift');
    }
    if (payload.actionId === 'meet-lianqiao') {
      return buildLianQiaoFallbackOptions('unlock');
    }
    if (payload.actionId === 'first-meet') {
      return buildLianQiaoFallbackOptions('first');
    }
    return buildLianQiaoFallbackOptions('regular');
  }
  if (actor.actorKind === 'emperor') {
    return buildEmperorFallbackOptions();
  }
  return buildConsortFallbackOptions();
};

const buildFallbackText = (
  payload: ConsortDialogueRequestPayload,
  actor: MiaoYinDialogueActor,
): { text: string; sceneHint: string } => {
  if (actor.actorKind === 'lianqiao' && payload.actionId === 'first-meet') {
    return {
      text:
        '一折将尽时，隔着半幅珠帘，有人把最后一个转音收得极轻。连翘回身时先抬手按住尚在余颤的琴弦，目光在你身上停了停，才低声道：“娘娘连着来听了几回，想来不是只为散心。妙音堂里最怕的不是错音，是听不出轻重，却偏要装作真懂。”',
      sceneHint: '这是你与连翘第一次在妙音堂正式照面。',
    };
  }

  if (actor.actorKind === 'lianqiao' && payload.actionId === 'meet-lianqiao') {
    return {
      text:
        '堂中人声渐散，连翘把谱页轻轻合上，像是终于肯把视线真正落在你身上：“娘娘前后听到第六回，还肯来，便不是随意消磨。会听曲的人很多，能把一折里的呼吸与收放都听进去的人却少。若娘娘不嫌，我往后也愿为你多留一份好曲。”',
      sceneHint: '这一回以后，妙音堂主界面会永久留下连翘的入口。',
    };
  }

  if (actor.actorKind === 'lianqiao' && payload.actionId === 'gift-event') {
    return {
      text:
        '寝殿门外的宫灯被风拂得轻轻一晃，连翘将一卷新谱递到你手边，声音比平日更轻：“前几日试出来一折新意，我想着娘娘也许会喜欢，便先替你留下了。曲子这种东西，若无人肯细听，再好也只像白白落在梁间。”',
      sceneHint: '这是连翘特意给你送来的曲谱。',
    };
  }

  if (actor.actorKind === 'lianqiao') {
    return {
      text:
        '连翘将指尖从弦上慢慢收回，先听堂中余音散净，才低声开口：“妙音堂看着热闹，其实人人都在守自己的节拍。娘娘若只是来听一折，我能陪；若想借曲声看人心，那就得先看自己肯听到哪一步。”',
      sceneHint: '她说话像收弦时那一下，轻，却分明留着后劲。',
    };
  }

  if (actor.actorKind === 'emperor') {
    return {
      text:
        '帘后拍板声刚歇，皇帝已在阶前站定。容安没有立刻发问，只把目光从你眉眼间扫过，才淡淡道：“朕原只当你是来听个热闹，如今看来，你倒真能听出这一堂清音里的轻重。若你愿意，今夜之后可来养心殿，把这一折从头说给朕听。”',
      sceneHint: '圣意来得突然，回话的轻重会被记得很久。',
    };
  }

  return {
    text: `你在妙音堂回廊下与${actor.identity} ${actor.name}撞了个正着，对方先停了脚步，像是把堂中余音也一并听完，才低声道：“娘娘今日竟会来此，倒叫人意外。这里人多眼也多，若真有话，总得先看值不值得说。”`,
    sceneHint: '妙音堂看似风雅，真正藏着的仍是人心与分寸。',
  };
};

const buildFallbackTurn = (
  payload: ConsortDialogueRequestPayload,
  actor: MiaoYinDialogueActor,
): ConsortDialogueTurn => {
  const fallback = buildFallbackText(payload, actor);

  if (actor.actorKind === 'lianqiao' && payload.topic === 'follow-up') {
    return {
      mode: 'line',
      phase: 'finish',
      speakerIdentity: actor.identity,
      speakerName: actor.name,
      text:
        payload.actionId === 'gift-follow-up'
          ? '连翘听完你这句，只把谱卷往你掌中轻轻一推：“娘娘既肯收，我便算没白走这一趟。往后若还有合你心意的，我仍替你留着。”'
          : '连翘听完你这一句，指尖在谱页边缘轻轻一点，像是把最后那点余音也收住了：“娘娘既听得明白，往后再来妙音堂，便不会只是过客。今日这折，到这里就够了。”',
      nextActionLabel: '收起',
      sceneHint: '这一回话已经收住，可以回到妙音堂主界面了。',
      options: [],
      usedFallback: true,
    };
  }

  if (actor.actorKind === 'emperor' && payload.topic === 'follow-up') {
    return {
      mode: 'line',
      phase: 'finish',
      speakerIdentity: actor.identity,
      speakerName: actor.name,
      text: '容安听罢并未立刻多说，只把目光略略压低几分：“你这句回得还算有分寸。今夜之邀，朕记下了。至于该不该来，你回去再想一想。”',
      nextActionLabel: '收起',
      sceneHint: '这一回偶遇已经收束，但圣意并不会就此散去。',
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
    options: buildFallbackOptions(actor, payload),
    usedFallback: true,
  };
};

const isToneTag = (value: unknown): value is RelationshipToneTag =>
  value === 'friendly' || value === 'flirt' || value === 'cold' || value === 'reject' || value === 'neutral';

const normalizeMiaoYinDialogueResponse = (
  response: ConsortDialogueResponsePayload,
  payload: ConsortDialogueRequestPayload,
  actor: MiaoYinDialogueActor,
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

export const requestMiaoYinDialogueWithFallback = async (
  payload: ConsortDialogueRequestPayload,
  actor: MiaoYinDialogueActor,
): Promise<ConsortDialogueTurn> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildFallbackTurn(payload, actor);
  }

  try {
    const response = await requestConsortDialogue(payload);
    return normalizeMiaoYinDialogueResponse(response, payload, actor);
  } catch {
    return buildFallbackTurn(payload, actor);
  }
};
