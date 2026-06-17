import { consortDialogueResponseSchema } from '../../types/schemas';
import type { ServerEnv } from '../../config/env';
import type { EponeClient } from '../../clients/eponeClient';
import type {
  ConsortDialogueRequest,
  ConsortDialogueResponse,
  RelationshipToneTag,
} from '../../types/contracts';
import { SessionMemoryService } from '../memory/sessionMemoryService';
import { RelationMemoryService, buildRelationMemoryKey } from '../memory/relationMemoryService';
import type { SessionMemoryTurn } from '../memory/sessionMemoryTypes';
import { buildPalaceDialoguePrompt, buildSceneIdentityRules } from './dialogueSystemPrompt';
import {
  buildConsortDialogueAiPayload,
  buildConsortDialogueContext,
  buildConsortDialoguePromptRules,
  buildSessionMemoryDebugInfo,
  buildSessionMemoryKey,
  mergeDialogueMetadata,
} from './dialogueOrchestrator';
import { reviewRelationCandidatesForPromotion } from './relationPromotion';

type FallbackDialogueDraft = Pick<
  ConsortDialogueResponse,
  'mode' | 'phase' | 'text' | 'sceneHint' | 'options'
>;
type ConsortDialogueAiDraft = Omit<
  ConsortDialogueResponse,
  'memoryCandidates' | 'relationCandidates' | 'affectHints' | 'relationMemory'
> & {
  memoryCandidates?: unknown[];
  affectHints?: unknown[];
};

const isToneTag = (value: unknown): value is RelationshipToneTag =>
  value === 'friendly' || value === 'flirt' || value === 'cold' || value === 'reject' || value === 'neutral';

const isDowagerContext = (payload: ConsortDialogueRequest): boolean =>
  payload.consortContext.name === '太后' || payload.consortContext.rank === '太后';

const isBuZiyouContext = (payload: ConsortDialogueRequest): boolean =>
  payload.consortContext.name === '布自游' || payload.consortContext.rank.includes('御厨');

const isAlingContext = (payload: ConsortDialogueRequest): boolean => payload.consortContext.name === '阿翎';

const isDangYiContext = (payload: ConsortDialogueRequest): boolean => payload.consortContext.name === '当一';

const isLianQiaoContext = (payload: ConsortDialogueRequest): boolean => payload.consortContext.name === '连翘';

const isEmperorContext = (payload: ConsortDialogueRequest): boolean =>
  payload.consortContext.name === '容安' || payload.consortContext.rank === '皇帝';

const MAX_DIALOGUE_EXCHANGES_PER_SESSION = 20;

const selectByXun = <T,>(payload: ConsortDialogueRequest, variants: T[]): T =>
  variants[(payload.timeContext.month + payload.timeContext.xun + payload.history.length) % variants.length];

const buildDefaultFallbackOptions = (actionId: string): ConsortDialogueResponse['options'] => {
  if (actionId === 'quarrel' || actionId === 'punish' || actionId === 'smear') {
    return [
      { id: 'soften', label: '缓一缓语气', effectHint: '先把锋芒收回半寸。', localToneTag: 'friendly' },
      { id: 'probe', label: '借势再试探', effectHint: '趁她露口风时探她心底。', localToneTag: 'flirt' },
      { id: 'press', label: '照规矩压下', effectHint: '继续把局势扣在礼法上。', localToneTag: 'cold' },
    ];
  }

  return [
    { id: 'warm', label: '温声再问一句', effectHint: '稳稳地加深她的好感。', localToneTag: 'friendly' },
    { id: 'tease', label: '借话轻试深浅', effectHint: '若她心动，最容易露出破绽。', localToneTag: 'flirt' },
    { id: 'hold', label: '只把礼数做满', effectHint: '不急着把话说透，先稳住场面。', localToneTag: 'neutral' },
  ];
};

const buildQuestionFallbackOptions = (payload: ConsortDialogueRequest): ConsortDialogueResponse['options'] => {
  if (payload.consortContext.name === '杜娘' || payload.consortContext.id.startsWith('tool_')) {
    return [
      { id: 'ask-shop', label: '顺着货色问一句', effectHint: '只聊买卖见闻，不触发交易。', localToneTag: 'neutral' },
      { id: 'ask-news', label: '问问宫门近况', effectHint: '听她说公开风声，不探秘密。', localToneTag: 'friendly' },
      { id: 'hold-boundary', label: '只笑着带过', effectHint: '守住分寸，不把话说深。', localToneTag: 'neutral' },
    ];
  }

  if (payload.consortContext.name === '太后' || payload.consortContext.rank === '太后') {
    return [
      { id: 'humble-answer', label: '低声应下教诲', effectHint: '守礼回应，不抢话头。', localToneTag: 'friendly' },
      { id: 'ask-guidance', label: '顺势请太后示下', effectHint: '把主动权交还给太后。', localToneTag: 'neutral' },
      { id: 'careful-hold', label: '只按规矩回话', effectHint: '先保住分寸，不露锋芒。', localToneTag: 'cold' },
    ];
  }

  return [
    { id: 'answer-softly', label: '顺着她的话回应', effectHint: '先把语气放稳，接住这一问。', localToneTag: 'friendly' },
    { id: 'probe-back', label: '借机反问试探', effectHint: '看她愿不愿意多露半句。', localToneTag: 'neutral' },
    { id: 'hold-distance', label: '只按礼数带过', effectHint: '保留距离，不急着交底。', localToneTag: 'cold' },
  ];
};

const asksForPlayerResponse = (text: string): boolean => {
  const normalized = text.replace(/\s+/gu, '');
  if (/[?？]$/u.test(normalized) || /[?？]/u.test(normalized.slice(-16))) {
    return true;
  }

  return [
    /(娘娘|小主|公主|陛下|你|您).{0,14}(可愿|愿不愿|要不要|想不想|可要|是否|打算|觉得|以为|如何|怎样|何不|怎么想|怎么看|怎么说|可否|能否|作何打算)/u,
    /(回|答|说|给).{0,6}(我|朕|本宫|哀家|妾)?(?:一)?(句|声|个)(准话|明话|明白|说法|答复)/u,
    /(你|您|娘娘|小主).{0,8}(呢|如何回|如何答|怎么选|怎么定)/u,
  ].some((pattern) => pattern.test(normalized));
};

const buildSessionClosingDialogue = (payload: ConsortDialogueRequest): ConsortDialogueResponse => {
  const identity = payload.consortContext.rank;
  const name = payload.consortContext.name;

  return {
    mode: 'line',
    phase: 'finish',
    speakerIdentity: identity,
    speakerName: name,
    text: `${name}将这一场话慢慢收住，神色仍留着分寸：“今日说到这里，便已经够了。再往深处去，反倒容易叫旁人听出不该听的意思。娘娘先回吧，余下的话，待来日局面更稳时再说。”`,
    sceneHint: '这一轮话题已自然收束，继续交谈需重新开启场景。',
    options: [],
  };
};

const buildDowagerFallbackOptions = (payload: ConsortDialogueRequest): ConsortDialogueResponse['options'] => {
  if (payload.actionId === 'farewell') {
    return [];
  }

  if (payload.actionId === 'gift-greet') {
    return selectByXun(payload, [
      [
        { id: 'tribute', label: '依礼进上薄礼', effectHint: '先把礼数与敬意做足。', localToneTag: 'friendly' as const },
        { id: 'humble', label: '谦声问安自省', effectHint: '以低姿态听她敲打。', localToneTag: 'neutral' as const },
        { id: 'seek-advice', label: '顺势请教宫规', effectHint: '借她的话摸清这一旬风向。', localToneTag: 'friendly' as const },
      ],
      [
        { id: 'tribute', label: '先谢太后抬举', effectHint: '把自己放在受教的位置。', localToneTag: 'friendly' as const },
        { id: 'humble', label: '只陈问安之意', effectHint: '不急着把心思露得太满。', localToneTag: 'neutral' as const },
        { id: 'seek-advice', label: '请太后示下规矩', effectHint: '让她来定谈话轻重。', localToneTag: 'friendly' as const },
      ],
      [
        { id: 'tribute', label: '奉礼后静候发落', effectHint: '把主动权先交到她手里。', localToneTag: 'neutral' as const },
        { id: 'humble', label: '低声认自己见识浅', effectHint: '先让她看见你的分寸。', localToneTag: 'friendly' as const },
        { id: 'seek-advice', label: '借请安探她心意', effectHint: '顺势摸清她今日真正想说什么。', localToneTag: 'cold' as const },
      ],
    ]);
  }

  return selectByXun(payload, [
    [
      { id: 'kneel', label: '先行叩安陈礼', effectHint: '守礼为先，听太后先开口。', localToneTag: 'neutral' as const },
      { id: 'listen', label: '只低头静听', effectHint: '先看她今日是松是紧。', localToneTag: 'friendly' as const },
      { id: 'observe', label: '顺着话意试探', effectHint: '看她会不会给出更多暗示。', localToneTag: 'cold' as const },
    ],
    [
      { id: 'kneel', label: '恭声回一句规矩在前', effectHint: '先把体统摆正。', localToneTag: 'neutral' as const },
      { id: 'listen', label: '认下太后提点', effectHint: '让她看到你愿意受教。', localToneTag: 'friendly' as const },
      { id: 'observe', label: '借旧例探她口风', effectHint: '试着摸清她的裁量方向。', localToneTag: 'cold' as const },
    ],
    [
      { id: 'kneel', label: '先请太后示下', effectHint: '让她决定这一场谈话的规矩。', localToneTag: 'neutral' as const },
      { id: 'listen', label: '压住锋芒应答', effectHint: '保留余地，不争一时机巧。', localToneTag: 'friendly' as const },
      { id: 'observe', label: '顺着话锋再问半句', effectHint: '看她会不会多露一点真意。', localToneTag: 'cold' as const },
    ],
  ]);
};

const buildBuZiyouFallbackOptions = (): ConsortDialogueResponse['options'] => [
  { id: 'probe', label: '借食单试探他', effectHint: '顺着闲话探一探他真正站哪边。', localToneTag: 'neutral' },
  { id: 'warm', label: '放软语气示好', effectHint: '更容易稳稳攒一点好感。', localToneTag: 'friendly' },
  { id: 'tease', label: '故意留半句玩笑', effectHint: '若他愿接，最容易牵出暧昧余地。', localToneTag: 'flirt' },
];

const buildAlingFallbackOptions = (): ConsortDialogueResponse['options'] => [
  { id: 'old-days', label: '先问故国旧事', effectHint: '顺着旧时记忆，把话慢慢引开。', localToneTag: 'friendly' },
  { id: 'probe', label: '试探她的打算', effectHint: '看看她是否另有安排与退路。', localToneTag: 'neutral' },
  { id: 'hold', label: '只留一句平安', effectHint: '先把情绪收住，不把话说得太满。', localToneTag: 'cold' },
];

const buildDefaultVoiceHint = (payload: ConsortDialogueRequest): string => {
  const personality = payload.consortContext.personality;
  if (personality.includes('骄矜') || personality.includes('好胜')) return '她语气仍重体面，句句都留锋。';
  if (personality.includes('温顺') || personality.includes('体贴')) return '她说话温柔，却不至于全无分寸。';
  if (personality.includes('清醒') || personality.includes('守密')) return '她答得克制，像是任何一句都先在心里量过。';
  if (personality.includes('清冷') || personality.includes('寡言')) return '她并不多话，只把最必要的那几句留下。';
  if (personality.includes('端方') || personality.includes('克制')) return '她礼数极稳，叫人难从表面看透偏向。';
  if (personality.includes('娇气') || personality.includes('病弱')) return '她声音轻软，像是多重一句都会惹人心疼。';
  return '她的语气自有分寸，不肯轻易把心底摊开。';
};

const buildDowagerFallbackDraft = (payload: ConsortDialogueRequest): FallbackDialogueDraft => {
  const openingTag =
    payload.playerOpeningTendency === '韬光养晦'
      ? '她看得出你惯会收锋藏势，因此话里更多两分试探。'
      : payload.playerOpeningTendency === '锋芒毕露'
        ? '她知道你不是肯轻易低头的人，因此每一句都压着规矩来敲打。'
        : '她尚在看你究竟是可用之人，还是只会逞一时聪明。';

  if (payload.actionId === 'farewell') {
    return {
      mode: 'line',
      phase: 'finish',
      text: `太后将茶盏轻轻一搁，目光只在你身上停了一瞬，便温声道：“礼已尽，话也说到这里。你既知道建章宫不是纵口任性的地方，往后行事，便把今日这点分寸一直守下去。去罢。” 她没有再多看你，像是该给的提点已经给完，不必再把话说透。`,
      sceneHint: '太后已准你告退。',
      options: [],
    };
  }

  if (payload.topic === 'follow-up') {
    const optionLabel = payload.selectedOptionLabel ?? '回话';
    return {
      mode: 'line',
      phase: 'finish',
      text: `太后听完你这一句“${optionLabel}”，眉眼间并无明显喜怒，只把声线放得更缓：“会说话，不算本事；知道什么时候该收，才算真明白。” 她指尖轻轻敲了一下茶盏，又淡淡添道：“哀家今日肯同你说这些，不是叫你回去自鸣得意，而是要你记得，宫里最难守的，从来不是体面，是得了体面之后仍不失规矩。” ${openingTag}`,
      sceneHint: '这一轮话已经收束，可以离殿了。',
      options: [],
    };
  }

  if (payload.actionId === 'gift-greet') {
    return {
      mode: 'branch',
      phase: 'continue',
      text: `你上前奉礼问安后，太后并未急着去看那份礼，只先把你从头到脚缓缓打量了一遍，才道：“肯记得来建章宫尽礼，是好事。只是哀家见得多了，知道有人送的是心，有人送的是局。” 她指尖轻轻按在案边，语气仍平稳得近乎温和：“你若只是来做个样子，哀家一眼便看得出；你若当真有话，就说一句担得起后果的。” ${openingTag}`,
      sceneHint: '太后愿意继续听下去，但她更在意你的分寸。',
      options: buildDowagerFallbackOptions(payload),
    };
  }

  return {
    mode: 'branch',
    phase: 'continue',
    text: `你入建章宫时，太后已端坐在上首。她并不急着发话，只等你把礼数一项项做全，才缓缓开口：“今日肯过来见哀家，想来不是一时兴起。后宫不是养天真的地方，谁都要学着先看局势，再看人心，最后才轮到自己的委屈与喜恶。” 她说到这里，目光不轻不重地落在你身上：“你若是个明白人，就该听得懂这话里几层意思。” ${openingTag}`,
    sceneHint: '先听太后的话意，再决定如何应对。',
    options: buildDowagerFallbackOptions(payload),
  };
};

const buildBuZiyouFallbackDraft = (payload: ConsortDialogueRequest): FallbackDialogueDraft => {
  if (payload.actionId === 'forced-meet') {
    return {
      mode: 'branch',
      phase: 'continue',
      text: `他抬眼时先看锅灶后的火候，像是连说话都带着掌勺人收火时的稳当。布自游拎着刚起锅的食盒从灶后转出来，先把你从头到尾看了一遍，才低声笑道：“娘娘倒是不避烟火气。御膳房人来人往，若只想寻口热食，我还能替娘娘挑一份清爽的；若想借这地方看人，也未必来错。”`,
      sceneHint: '这是你与布自游在御膳房的第一次照面。此后主界面会留下他的入口。',
      options: buildBuZiyouFallbackOptions(),
    };
  }

  return {
    mode: 'branch',
    phase: 'continue',
    text: `他抬眼时先看锅灶后的火候，像是连说话都带着掌勺人收火时的稳当。布自游抬手把木匙搁在案边，朝你略略颔首：“膳房里最不缺的就是耳目，娘娘若来找我，想必也不是只为了问这锅汤熬得如何。话可以说，只是说到哪一步，得看娘娘先给我几分真心。”`,
    sceneHint: '布自游惯会留半句余地。你说得越直，他越会借机试你的分寸。',
    options: buildBuZiyouFallbackOptions(),
  };
};

const buildAlingFallbackDraft = (payload: ConsortDialogueRequest): FallbackDialogueDraft => ({
  mode: 'branch',
  phase: 'continue',
  text:
    payload.topic === 'follow-up'
      ? `阿翎把宫门外的风声听了片刻，才重新看向你：“你方才那句话，我听明白了。只是旧路难回，旧人也未必还能像从前那样无所顾忌，所以有些念头，越要紧，越得慢慢说。”`
      : `阿翎立在风口处，神色仍稳，只在你开口后才稍稍松了眉尖：“故国的消息我会替你看着，人也会替你留意。你若想问旧事，我听；你若只想确认还有没有人记得来路，我也仍在这里。”`,
  sceneHint: '她仍把旧情压在分寸里，不肯先把话说满。',
  options: buildAlingFallbackOptions(),
});

const buildDangYiFallbackDraft = (payload: ConsortDialogueRequest): FallbackDialogueDraft => {
  if (payload.topic === 'follow-up') {
    return {
      mode: 'line',
      phase: 'finish',
      text: '当一听完你这句回话，只将目光在香火间停了一停，才低声道：“娘娘心里有数，往后再来宝华殿，便不会白来。今日先把这句话记下，余下的，不必急在一时。”',
      sceneHint: '这一回话头已经收住，可以回到殿中主界面了。',
      options: [],
    };
  }

  return {
    mode: 'branch',
    phase: 'continue',
    text:
      payload.actionId === 'forced-meet'
        ? '当一立在供灯之后，先将手里经卷合起，才朝你微微一礼：“娘娘连着来宝华殿三回，想来不是只为走个过场。佛前最忌口是心非，可宫里的人偏偏最难避开的，也是这四个字。娘娘若愿意，往后到殿里来，不妨把心放稳些，再看该问什么、该信什么。”'
        : '当一将案前残香拨正，语气极缓：“宝华殿里看似最静，其实来的人各有心事。娘娘若只想求一句宽心话，我能回；若想借这地方看人心，也未必来错。只是有些话，知道得太早，不见得是福。”',
    sceneHint:
      payload.actionId === 'forced-meet'
        ? '这是你与当一在宝华殿的第一次照面。此后主界面会留下他的入口。'
        : '他看得透，却不肯把话一次说满。',
    options: [
      { id: 'humble', label: '先按礼回话', effectHint: '把分寸守住，再看他愿不愿意多说。', localToneTag: 'neutral' },
      { id: 'sincere', label: '直陈敬意求教', effectHint: '更容易换来一句真提点。', localToneTag: 'friendly' },
      { id: 'observe', label: '借佛殿旧例试探', effectHint: '看看他究竟把话留到哪一层。', localToneTag: 'cold' },
    ],
  };
};

const buildLianQiaoFallbackDraft = (payload: ConsortDialogueRequest): FallbackDialogueDraft => {
  const options =
    payload.actionId === 'gift-event'
      ? [
          { id: 'receive', label: '收下并谢她记挂', effectHint: '稳稳接住她的这一份心意。', localToneTag: 'friendly' as const },
          { id: 'tease', label: '借曲意轻轻逗她', effectHint: '若她愿接，最容易再往前半步。', localToneTag: 'flirt' as const },
          { id: 'hold', label: '只按礼谢过', effectHint: '把分寸守住，不把话说得太满。', localToneTag: 'neutral' as const },
        ]
      : payload.actionId === 'meet-lianqiao'
        ? [
            { id: 'admire', label: '夸她收音极稳', effectHint: '更合她对真懂曲人的偏好。', localToneTag: 'friendly' as const },
            { id: 'join', label: '借曲意试探更近一步', effectHint: '若她心软，余韵会留得更长。', localToneTag: 'flirt' as const },
            { id: 'observe', label: '只说想再多听几回', effectHint: '把话留住，不急着靠近。', localToneTag: 'neutral' as const },
          ]
        : [
            { id: 'listen', label: '顺着曲理请教', effectHint: '更容易换来一句真回话。', localToneTag: 'friendly' as const },
            { id: 'probe', label: '借琴心试探她', effectHint: '看看她愿不愿意把话说深。', localToneTag: 'neutral' as const },
            { id: 'hold', label: '只按礼留一句称赞', effectHint: '不把心思露得太快。', localToneTag: 'cold' as const },
          ];

  if (payload.topic === 'follow-up') {
    return {
      mode: 'line',
      phase: 'finish',
      text:
        payload.actionId === 'gift-follow-up'
          ? '连翘听完你这句，只把谱卷往你掌中轻轻一推：“娘娘既肯收，我便算没白走这一趟。往后若还有合你心意的，我仍替你留着。”'
          : '连翘把最后一点余音也收进指尖，才低声道：“娘娘既听得明白，往后再来妙音堂，便不会只是过客。今日这一折，到这里就够了。”',
      sceneHint: '这一回话已收住，可以回到妙音堂主界面了。',
      options: [],
    };
  }

  return {
    mode: 'branch',
    phase: 'continue',
    text:
      payload.actionId === 'first-meet'
        ? '一折将尽时，连翘先按住尚在余颤的琴弦，回身看你，语气轻得像怕惊散堂中余音：“娘娘连着来听了几回，想来不是只为散心。妙音堂里最怕的不是错音，是听不出轻重，却偏要装作真懂。”'
        : payload.actionId === 'meet-lianqiao'
          ? '堂中人声渐散，连翘把谱页合起，像是终于肯把视线真正落在你身上：“娘娘前后听到第六回，还肯来，便不是随意消磨。会听曲的人很多，能把一折里的呼吸与收放都听进去的人却少。若娘娘不嫌，我往后也愿替你多留一份好曲。”'
          : payload.actionId === 'gift-event'
            ? '连翘将一卷新谱递到你手边，声音比平日更轻：“前几日试出来一折新意，我想着娘娘也许会喜欢，便先替你留下了。曲子这种东西，若无人肯细听，再好也只像白白落在梁间。”'
            : '连翘将指尖从弦上慢慢收回，先等堂中余音散净，才低声开口：“妙音堂看着热闹，其实人人都在守自己的节拍。娘娘若只是来听一折，我能陪；若想借曲声看人心，就得先看自己肯听到哪一步。”',
    sceneHint:
      payload.actionId === 'meet-lianqiao'
        ? '这一回以后，妙音堂主界面会永久留下连翘的入口。'
        : payload.actionId === 'gift-event'
          ? '这是连翘特意给你送来的曲谱。'
          : payload.actionId === 'first-meet'
            ? '这是你与连翘第一次在妙音堂正式照面。'
            : '她的话像收弦那一下，轻，却分明留着后劲。',
    options,
  };
};

const buildEmperorFallbackDraft = (payload: ConsortDialogueRequest): FallbackDialogueDraft => {
  if (payload.topic === 'follow-up') {
    return {
      mode: 'line',
      phase: 'finish',
      text: '容安听罢并未立刻多说，只把目光略略压低几分：“你这句回得还算有分寸。今夜之邀，朕记下了。至于该不该来，你回去再想一想。”',
      sceneHint: '这一回偶遇已经收束，但圣意并不会就此散去。',
      options: [],
    };
  }

  return {
    mode: 'branch',
    phase: 'continue',
    text: '帘后拍板声刚歇，容安已在阶前站定。他没有立刻发问，只把目光从你眉眼间扫过，才淡淡道：“朕原只当你是来听个热闹，如今看来，你倒真能听出这一堂清音里的轻重。若你愿意，今夜之后可来养心殿，把这一折从头说给朕听。”',
    sceneHint: '圣意来得突然，回话的轻重会被记得很久。',
    options: [
      { id: 'accept', label: '顺势应下邀约', effectHint: '把姿态放柔，顺着圣意往下走。', localToneTag: 'friendly' },
      { id: 'tease', label: '借曲意轻轻回敬', effectHint: '暧昧余地更足，也更考验分寸。', localToneTag: 'flirt' },
      { id: 'cautious', label: '只依礼谢恩', effectHint: '不失体统，却会把距离留得更远。', localToneTag: 'neutral' },
    ],
  };
};

const buildDefaultFallbackDraft = (payload: ConsortDialogueRequest): FallbackDialogueDraft => {
  const voiceHint = buildDefaultVoiceHint(payload);

  switch (payload.actionId) {
    case 'gift':
      return {
        mode: 'branch',
        phase: 'continue',
        text: `${voiceHint}${payload.consortContext.name}接过${payload.giftItemName ?? '礼物'}后，先压了一下神色，才向你低声谢礼：“娘娘这份心意，妾不敢怠慢。只是宫里的人情债，最怕记得太清。”`,
        sceneHint: '礼已经送出去，接下来最适合顺势探她态度。',
        options: buildDefaultFallbackOptions(payload.actionId),
      };
    case 'greet':
      return {
        mode: 'branch',
        phase: 'continue',
        text: `${voiceHint}${payload.consortContext.name}先向你敛衽问安：“娘娘今日肯来，妾自该把话回得周全。只是宫里人多眼杂，许多心思并不宜说得太明。”`,
        sceneHint: '先从寒暄切入，最容易看出她愿不愿意继续开口。',
        options: buildDefaultFallbackOptions(payload.actionId),
      };
    case 'quarrel':
      return {
        mode: 'branch',
        phase: 'continue',
        text: `${voiceHint}你话锋一沉，她便也不再一味退让：“娘娘若只想教训妾，妾自然领着。可若要把旧账翻到今日，妾也未必一句都不能回。”`,
        sceneHint: '火气已经起来了，再往前半步就是僵局，往后半步却也许能逼出真话。',
        options: buildDefaultFallbackOptions(payload.actionId),
      };
    case 'punish':
      return {
        mode: 'branch',
        phase: 'continue',
        text: `${voiceHint}${payload.consortContext.name}被你压住气势之后，仍把礼数做尽：“规矩既是娘娘定下的，妾自会领。只是这份轻重，妾往后也不会忘。”`,
        sceneHint: '责罚已经落地，她表面不敢逆，心底却未必肯服。',
        options: buildDefaultFallbackOptions(payload.actionId),
      };
    case 'win-over':
      return {
        mode: 'branch',
        phase: 'continue',
        text:
          payload.actionResult?.includes('愿与您交好')
            ? `${voiceHint}${payload.consortContext.name}静了片刻，终究还是向你低下眸：“若娘娘当真肯护着妾，妾也愿把这一份情记在心里。”`
            : payload.actionResult?.includes('不会答应')
              ? `${voiceHint}${payload.consortContext.name}避开了你的目光，答得很轻：“娘娘的好意，妾不敢领。眼下再近一步，只怕比先前更难收场。”`
              : `${voiceHint}${payload.consortContext.name}没有立刻点头，只道：“若真想结个善缘，妾愿慢慢看着。宫里的话，总不好一下说满。”`,
        sceneHint: '拉拢的结果已经明了，后面更适合顺着她的心门继续试探。',
        options: buildDefaultFallbackOptions(payload.actionId),
      };
    case 'smear':
      return {
        mode: 'branch',
        phase: 'continue',
        text: `${voiceHint}你把话引到${payload.smearTargetName ?? '旁人'}身上时，她指尖微微一顿：“宫里流言最会要命。娘娘既肯提这一句，妾自会记住，只是还要再看真假。”`,
        sceneHint: '另一个名字已经被拉进这场对话，她会不会真站到你这边，还得看后面几句。',
        options: buildDefaultFallbackOptions(payload.actionId),
      };
    default:
      return {
        mode: 'branch',
        phase: 'continue',
        text: `${voiceHint}${payload.consortContext.name}迎了你一礼，目光却没有立刻垂下：“娘娘今日亲来，想必不是只为看一眼茶案与宫灯。妾听着，娘娘尽可开口。”`,
        sceneHint: '先看她愿不愿意把话摊开，再决定是示好还是施压。',
        options: buildDefaultFallbackOptions(payload.actionId),
      };
  }
};

const buildFallbackDialogue = (payload: ConsortDialogueRequest): ConsortDialogueResponse => {
  let fallback: FallbackDialogueDraft;
  if (isDowagerContext(payload)) {
    fallback = buildDowagerFallbackDraft(payload);
  } else if (isBuZiyouContext(payload)) {
    fallback = buildBuZiyouFallbackDraft(payload);
  } else if (isAlingContext(payload)) {
    fallback = buildAlingFallbackDraft(payload);
  } else if (isDangYiContext(payload)) {
    fallback = buildDangYiFallbackDraft(payload);
  } else if (isLianQiaoContext(payload)) {
    fallback = buildLianQiaoFallbackDraft(payload);
  } else if (isEmperorContext(payload)) {
    fallback = buildEmperorFallbackDraft(payload);
  } else {
    fallback = buildDefaultFallbackDraft(payload);
  }

  return {
    mode: fallback.mode,
    phase: fallback.phase,
    speakerIdentity: payload.consortContext.rank,
    speakerName: payload.consortContext.name,
    text: fallback.text,
    sceneHint: fallback.sceneHint,
    options: fallback.options,
  };
};

const violatesIdentityGuard = (payload: ConsortDialogueRequest, response: ConsortDialogueResponse, text: string): boolean => {
  if (isDowagerContext(payload)) {
    return response.speakerIdentity !== '太后' || response.speakerName !== '太后' || /妾/u.test(text);
  }

  if (isBuZiyouContext(payload)) {
    return response.speakerIdentity !== '御厨' || response.speakerName !== '布自游' || /妾/u.test(text);
  }

  if (isAlingContext(payload)) {
    return response.speakerName !== '阿翎' || /妾/u.test(text);
  }

  if (isDangYiContext(payload)) {
    return response.speakerName !== '当一' || !/佛|香|殿|因果|静/u.test(text) || /妾/u.test(text);
  }

  if (isLianQiaoContext(payload)) {
    return response.speakerName !== '连翘' || !/曲|弦|音|堂|谱/u.test(text) || /妾/u.test(text);
  }

  if (isEmperorContext(payload)) {
    return response.speakerIdentity !== '皇帝' || response.speakerName !== '容安' || /妾/u.test(text);
  }

  return false;
};

const normalizeDialogue = (
  payload: ConsortDialogueRequest,
  response: ConsortDialogueResponse,
): ConsortDialogueResponse => {
  const fallback = buildFallbackDialogue(payload);
  const text = String(response.text ?? '').trim();
  const mode = response.mode === 'line' ? 'line' : 'branch';

  if (!text || violatesIdentityGuard(payload, response, text)) {
    return fallback;
  }

  if (response.phase === 'finish') {
    return {
      mode: 'line',
      phase: 'finish',
      speakerIdentity: String(response.speakerIdentity ?? '').trim() || fallback.speakerIdentity,
      speakerName: String(response.speakerName ?? '').trim() || fallback.speakerName,
      text,
      sceneHint: String(response.sceneHint ?? '').trim() || fallback.sceneHint || '这一轮话题已经收束。',
      options: [],
    };
  }

  if (mode === 'line') {
    if (asksForPlayerResponse(text)) {
      return {
        mode: 'branch',
        phase: 'continue',
        speakerIdentity: String(response.speakerIdentity ?? '').trim() || fallback.speakerIdentity,
        speakerName: String(response.speakerName ?? '').trim() || fallback.speakerName,
        text,
        sceneHint: String(response.sceneHint ?? '').trim() || '她把话递到你面前，等你给出回应。',
        options: buildQuestionFallbackOptions(payload),
      };
    }

    return {
      mode: 'line',
      phase: 'continue',
      speakerIdentity: String(response.speakerIdentity ?? '').trim() || fallback.speakerIdentity,
      speakerName: String(response.speakerName ?? '').trim() || fallback.speakerName,
      text,
      sceneHint: String(response.sceneHint ?? '').trim() || fallback.sceneHint,
      options: [],
    };
  }

  const options = Array.isArray(response.options)
    ? response.options
        .filter((option) => option && isToneTag(option.localToneTag))
        .slice(0, 3)
        .map((option, index) => ({
          id: String(option.id ?? `option-${index + 1}`),
          label: String(option.label ?? '').trim() || fallback.options[index]?.label || `选项${index + 1}`,
          effectHint: String(option.effectHint ?? '').trim() || fallback.options[index]?.effectHint || '继续试探她的态度。',
          localToneTag: option.localToneTag,
          nextTopic: option.nextTopic,
        }))
    : [];

  if (options.length === 0) {
    return fallback;
  }

  return {
    mode: 'branch',
    phase: 'continue',
    speakerIdentity: String(response.speakerIdentity ?? '').trim() || fallback.speakerIdentity,
    speakerName: String(response.speakerName ?? '').trim() || fallback.speakerName,
    text,
    sceneHint: String(response.sceneHint ?? '').trim() || fallback.sceneHint,
    options,
  };
};

const buildSessionMemoryTurns = (
  payload: ConsortDialogueRequest,
  response: ConsortDialogueResponse,
): Array<Omit<SessionMemoryTurn, 'createdAt'>> => {
  const turns: Array<Omit<SessionMemoryTurn, 'createdAt'>> = [];

  if (payload.selectedOptionLabel) {
    turns.push({
      speaker: `${payload.playerRank} · ${payload.playerName}`,
      text: payload.selectedOptionLabel,
      source: 'player',
      requestId: payload.requestId,
    });
  } else if (payload.actionResult) {
    turns.push({
      speaker: '系统动作',
      text: `${payload.actionLabel}：${payload.actionResult}`,
      source: 'system',
      requestId: payload.requestId,
    });
  }

  turns.push({
    speaker: `${response.speakerIdentity} · ${response.speakerName}`,
    text: response.text,
    source: 'npc',
    requestId: payload.requestId,
  });

  return turns;
};

export class ConsortDialogueService {
  constructor(
    private readonly env: ServerEnv,
    private readonly textAiClient: EponeClient,
    private readonly sessionMemoryService = new SessionMemoryService(),
    private readonly relationMemoryService = new RelationMemoryService(),
  ) {}

  async generate(payload: ConsortDialogueRequest): Promise<ConsortDialogueResponse> {
    const sessionMemoryKey = buildSessionMemoryKey(payload);
    const relationMemoryKey = buildRelationMemoryKey(payload);
    const existingSessionMemory = this.sessionMemoryService.read(sessionMemoryKey);
    const existingRelationMemory = this.relationMemoryService.readSnapshot({
      ...relationMemoryKey,
      sceneId: payload.sceneId,
    });
    const dialogueContext = buildConsortDialogueContext(payload, existingSessionMemory, existingRelationMemory);
    let response: ConsortDialogueResponse;

    if ((existingSessionMemory?.totalExchangeCount ?? 0) >= MAX_DIALOGUE_EXCHANGES_PER_SESSION - 1) {
      response = mergeDialogueMetadata(payload, buildSessionClosingDialogue(payload), [], []);
    } else {
      try {
      const draft = consortDialogueResponseSchema.parse(
        await this.textAiClient.completeJson<ConsortDialogueResponse>(
          this.env.narrativeModel,
          buildPalaceDialoguePrompt(
            '你是宫廷养成游戏的 narrative-text-ai，负责生成宫廷场景对白 JSON。',
            '你只负责对白、氛围、分支措辞与角色口吻，不得决定任何真实数值结果。',
            `当前 NPC 为${payload.consortContext.rank} ${payload.consortContext.name}，你必须严格按这个身份、位分、场景来写，不得套错成别的角色或平均模板腔。`,
            '角色台词必须紧扣她或他的身份、人设、关系阶段、当前动作与最近对话史，不能写成模板化的平均口吻。',
            '输出必须是严格 JSON，不得输出 JSON 之外的任何说明。',
            'speakerIdentity 必须是当前 NPC 在此场景下应使用的身份称谓，speakerName 必须是当前 NPC 的姓名。',
            'text 长度控制在 90 到 180 字，必须带有人物动作、停顿、神情或潜台词，像活人在说话，不要客服腔、总结腔，也不要空泛抒情。',
            '口吻要像宫廷中人自然说话，避免“哟”“啦”“这不就”“你可真会”等明显现代、油滑或网感过强的口头禅，除非人物设定本就轻佻。',
            '若 currentGoodwill <= 0、rivals 里含玩家，或动作本身带有试探和压迫，NPC 必须保留防备、端着体面、夹着轻刺，不能无缘无故温柔示好或主动献媚。',
            '若 currentGoodwill >= 60 或 allies 里含玩家，才可以让 NPC 明显软下来、露出亲近或信任。',
            '每句对白都必须回应当前动作、actionResult 或最近一轮对话，不能忽然转去夸月色、天气、摆设等无关泛话。',
            '只要 text 中直接向玩家发问、索要态度、要求玩家选择、或把话递给玩家回应，就必须输出 mode=branch，并给出 2 到 3 个可选回应；不得输出没有 options 的问句。',
            `当前 session 已进行约 ${dialogueContext.sessionContext.totalExchangeCount} 轮；接近 ${MAX_DIALOGUE_EXCHANGES_PER_SESSION} 轮时必须主动收束话题，phase=finish，options=[]。`,
            '只有当剧情推进到真正需要玩家决断的节点时，才输出 mode=branch，并给出 2 到 3 个关键选项。',
            'branch 模式下每个选项都要有 id、label、effectHint、localToneTag；line 模式不要硬塞选项。',
            'localToneTag 只能是 friendly、flirt、cold、reject、neutral 之一，供系统离线时本地判定使用。',
            '选项文风要符合当前局势：若动作偏和缓，选项应以示好、试探、留白为主；若动作偏冲突，选项应以缓和、试探、压制为主。',
            '你不能改写系统已给出的 actionResult，只能在此基础上延展人物回应。',
            '如角色本身克制、守密、娇气、骄矜、清冷、体贴等特征存在，必须在语气、措辞、停顿和防备感里体现，不可混写成同一种人。',
            'sceneHint 控制在 20 到 40 字，只写玩家此刻应注意的气氛或风险，不要重复大段场景描写。',
            'phase 默认 continue；但话题已完成、NPC 主动送客、或 session 接近轮数上限时，必须允许自然 finish，不要为了续聊强行自说自话。',
            'memoryCandidates 最多 3 条，只能是候选记忆，scope 只能是 session 或 relation，status 固定 candidate，source 固定 ai。',
            '若没有可靠候选记忆，memoryCandidates 必须输出空数组；不得输出字符串、半截对象、世界事实或硬规则结果。',
            'affectHints 最多 3 条，只能提示 trust、affection、tension、suspicion、mood 的 up/down/flat，不得写真实数值变化。',
            '若没有可靠情绪提示，affectHints 必须输出空数组；不得输出缺字段对象。',
            ...buildConsortDialoguePromptRules(dialogueContext),
            ...buildSceneIdentityRules({ name: payload.consortContext.name, rank: payload.consortContext.rank }),
          ),
          buildConsortDialogueAiPayload(payload, dialogueContext),
        ),
      ) as ConsortDialogueAiDraft;
      const dialogueDraft: ConsortDialogueResponse = {
        ...draft,
        memoryCandidates: undefined,
        relationCandidates: undefined,
        affectHints: undefined,
        relationMemory: undefined,
      };

      response = mergeDialogueMetadata(
        payload,
        normalizeDialogue(payload, dialogueDraft),
        draft.memoryCandidates,
        draft.affectHints,
      );
    } catch (error) {
      if (payload.strictAi) {
        throw error;
      }
      if (process.env.AI_DEBUG === 'true') {
        console.warn('[consort-dialogue] falling back after AI generation failed', {
          reason: error instanceof Error ? error.message : String(error),
        });
      }
      response = mergeDialogueMetadata(payload, buildFallbackDialogue(payload), [], []);
      }
    }

    const updatedSessionMemory = this.sessionMemoryService.append({
      ...sessionMemoryKey,
      requestId: payload.requestId,
      turns: buildSessionMemoryTurns(payload, response),
      memoryCandidates: response.memoryCandidates ?? [],
      relationCandidates: response.relationCandidates ?? [],
    });
    const relationMemory = reviewRelationCandidatesForPromotion({
      payload,
      personaGuard: dialogueContext.personaGuard,
      sessionMemory: updatedSessionMemory,
      relationMemoryService: this.relationMemoryService,
    });

    return {
      ...response,
      sessionMemory: buildSessionMemoryDebugInfo(
        existingSessionMemory,
        updatedSessionMemory,
        dialogueContext,
        response.memoryCandidates?.length ?? 0,
        response.relationCandidates?.length ?? 0,
      ),
      relationMemory,
    };
  }
}
