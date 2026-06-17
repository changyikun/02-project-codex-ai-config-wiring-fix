import { openingDialogueResponseSchema } from '../../types/schemas';
import type { ServerEnv } from '../../config/env';
import type { EponeClient } from '../../clients/eponeClient';
import type { OpeningDialogueRequest, OpeningDialogueResponse } from '../../types/contracts';
import { buildPalaceDialoguePrompt } from './dialogueSystemPrompt';

const titleByFamily = (family: string): string => {
  if (family.includes('皇后') || family.includes('镇国公')) return '娘娘';
  if (family.includes('和亲公主')) return '公主';
  if (family.includes('罪臣')) return '姑娘';
  return '小主';
};

const emptyEffects = () => ({
  silver: 0,
  stamina: 0,
  favor: 0,
  prestige: 0,
  stress: 0,
  trueHeart: 0,
  stats: {},
});

const resolveSpeakerIdentity = (payload: OpeningDialogueRequest): string =>
  payload.npcContext?.identity?.trim() || '贴身宫女';

const resolveRouteSummary = (payload: OpeningDialogueRequest): string =>
  payload.routeContext?.playerRoleSummary?.trim() || '您如今已在宫中，这一步先得把自己的处境看明白。';

const resolveRoutePressure = (payload: OpeningDialogueRequest): string =>
  payload.routeContext?.routePressure?.trim() || '宫里人人看规矩，也看人心，行事总得留些余地。';

const resolveMapFeatureSummary = (payload: OpeningDialogueRequest): string =>
  payload.routeContext?.mapFeatureSummary?.trim() ||
  '御书房、宝华殿与后宫入口最常用，先把这些地方认熟，后头才好安排行程。';

const resolveChoiceFocus = (payload: OpeningDialogueRequest): string =>
  payload.routeContext?.choiceFocus?.trim() || '眼下最紧要的，是先定下待人行事的起手章法。';

const buildBranchOptions = () => [
  {
    id: 'steady',
    label: '韬光养晦',
    effectHint: '先藏锋芒，稳住脚跟。',
    nextTopic: 'opening-guide-finish',
    hiddenEffects: emptyEffects(),
    timeCost: 0,
  },
  {
    id: 'radiant',
    label: '清辉照影',
    effectHint: '微露风华，自教人难忘。',
    nextTopic: 'opening-guide-finish',
    hiddenEffects: emptyEffects(),
    timeCost: 0,
  },
  {
    id: 'balanced',
    label: '左右逢源',
    effectHint: '先探虚实，再慢慢铺路。',
    nextTopic: 'opening-guide-finish',
    hiddenEffects: emptyEffects(),
    timeCost: 0,
  },
] as const;

const buildFallbackOpening = (payload: OpeningDialogueRequest): OpeningDialogueResponse => {
  const title = payload.playerTitle || titleByFamily(payload.family);
  const speakerIdentity = resolveSpeakerIdentity(payload);
  const routeSummary = resolveRouteSummary(payload);
  const routePressure = resolveRoutePressure(payload);
  const mapFeatureSummary = resolveMapFeatureSummary(payload);
  const choiceFocus = resolveChoiceFocus(payload);

  if (payload.turn <= 1) {
    return {
      mode: 'line',
      phase: 'continue',
      speakerIdentity,
      speakerName: payload.npcName,
      text: `${title}，奴婢${payload.npcName}先陪您把眼下局面捋清。${routeSummary}${routePressure}右上角记着时辰、银两与体力，往后每做一件事，都得先看分寸与余力。`,
      timeCost: 0,
      dataEffects: emptyEffects(),
      options: [],
    };
  }

  if (payload.turn === 2) {
    return {
      mode: 'line',
      phase: 'continue',
      speakerIdentity,
      speakerName: payload.npcName,
      text: `待会儿奴婢先陪您认一认宫里的大地图。${mapFeatureSummary}认过这些地方，再回${payload.residenceName}安排行程，您之后要走哪一步，心里才不至于乱。`,
      timeCost: 0,
      dataEffects: emptyEffects(),
      options: [],
    };
  }

  return {
    mode: 'branch',
    phase: 'finish',
    speakerIdentity,
    speakerName: payload.npcName,
    text: `${title}，如今最要紧的不是多走一步，而是先定起手章法。${choiceFocus}您先拿个主意，后头奴婢也好照着替您铺路。`,
    timeCost: 0,
    dataEffects: emptyEffects(),
    options: [...buildBranchOptions()],
  };
};

const normalizeOpeningResponse = (
  response: OpeningDialogueResponse,
  payload: OpeningDialogueRequest,
): OpeningDialogueResponse => {
  const fallback = buildFallbackOpening(payload);
  const expectedMode = payload.turn >= 3 ? 'branch' : 'line';
  const text = String(response.text ?? '').trim();

  if (!text || response.mode !== expectedMode) {
    return fallback;
  }

  return {
    ...response,
    phase: expectedMode === 'branch' ? 'finish' : 'continue',
    speakerIdentity: String(response.speakerIdentity ?? '').trim() || fallback.speakerIdentity,
    speakerName: String(response.speakerName ?? '').trim() || fallback.speakerName,
    timeCost: 0,
    dataEffects: emptyEffects(),
    options: expectedMode === 'branch' ? [...buildBranchOptions()] : [],
  };
};

export class OpeningDialogueService {
  constructor(private readonly env: ServerEnv, private readonly textAiClient: EponeClient) {}

  async generate(payload: OpeningDialogueRequest): Promise<OpeningDialogueResponse> {
    try {
      const draft = openingDialogueResponseSchema.parse(
        await this.textAiClient.completeJson<OpeningDialogueResponse>(
          this.env.narrativeModel,
          buildPalaceDialoguePrompt(
            '你是宫廷养成剧情游戏的 narrative-text-ai，负责输出开场对白 JSON。',
            '你只负责文本包装，不得决定任何真实数值结果。',
            `当前陪伴 NPC 为 ${payload.npcContext.identity} ${payload.npcName}。她的明面设定是：${payload.npcContext.publicFace}`,
            `她的隐性写法重点是：${payload.npcContext.hiddenCore}`,
            `她说话时要体现这些口吻关键词：${payload.npcContext.speechStyle.join('、')}。她当前承担的场景职责是：${payload.npcContext.sceneDuty.join('、')}。`,
            `当前玩家开局定位：${payload.routeContext.playerRoleSummary}`,
            `当前路线压力：${payload.routeContext.routePressure}`,
            `当前地图引导重点：${payload.routeContext.mapFeatureSummary}`,
            `当前第三步抉择焦点：${payload.routeContext.choiceFocus}`,
            '你必须让这条开场对白明显带出当前玩家所处路线与身份压力，不能把四条开局线写成同一种模板腔。',
            '娇娇对玩家的称呼要稳妥得体，既亲近又不越礼，不可抢玩家的话，也不可替玩家作主。',
            '开场引导属于半公开到私下之间的教学场景，重点是用宫中人的口吻解释规则、处境与下一步，而不是抒情或空泛设定介绍。',
            '文风需简洁、古典、带一点宿命感，但不能故作堆砌。',
            '你必须输出严格 JSON，不得输出任何 JSON 之外的说明。',
            '字段固定为 mode、phase、speakerIdentity、speakerName、text、timeCost、dataEffects、options。',
            '当前开场只允许三步：turn=1 与 turn=2 必须输出 mode=line、phase=continue；turn>=3 必须输出 mode=branch、phase=finish。',
            'turn>=3 时，options 必须固定为三项：steady/韬光养晦、radiant/清辉照影、balanced/左右逢源。',
            'effectHint 可简洁润色，但不得改变这三项的方向含义。',
            'dataEffects 与 options.hiddenEffects 必须全部为 0 和空 stats，因为系统会在前端本地处理真实数值。',
            'timeCost 固定为 0。',
            'turn=1 应聚焦时辰、银两、体力与宫规；turn=2 应聚焦地图、常驻入口与回宫安排；turn>=3 应聚焦“先定起手章法”。',
            'text 长度控制在 70-150 字，聚焦当前处境、宫规、人情与下一步抉择。',
          ),
          payload,
        ),
      );
      return normalizeOpeningResponse(draft, payload);
    } catch {
      return buildFallbackOpening(payload);
    }
  }
}
