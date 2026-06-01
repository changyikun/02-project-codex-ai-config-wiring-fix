import {
  requestOpeningDialogue,
  type OpeningDialogueRequestPayload,
  type OpeningDialogueResponsePayload,
} from '../../ai/openingDialogueAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';
import { MONTHLY_EXPENSE_STRATEGIES } from '../../config/monthlyExpenseStrategy';

const emptyEffects = () => ({
  silver: 0,
  stamina: 0,
  favor: 0,
  prestige: 0,
  stress: 0,
  trueHeart: 0,
  stats: {},
});

const buildFixedGuideOptions = (): OpeningDialogueResponsePayload['options'] =>
  MONTHLY_EXPENSE_STRATEGIES.map((strategy) => ({
    id: strategy.id,
    label: strategy.label,
    effectHint: `每月用度约为月俸${Math.round(strategy.expenseRate * 100)}%，声望${strategy.prestigeDelta >= 0 ? '+' : ''}${strategy.prestigeDelta}，健康${strategy.healthDelta >= 0 ? '+' : ''}${strategy.healthDelta}。`,
    nextTopic: 'opening-guide-finish',
    hiddenEffects: emptyEffects(),
    timeCost: 0,
  }));

const resolveSpeakerIdentity = (payload: OpeningDialogueRequestPayload): string =>
  payload.npcContext?.identity?.trim() || '贴身宫女';

const resolveRouteSummary = (payload: OpeningDialogueRequestPayload): string =>
  payload.routeContext?.playerRoleSummary?.trim() || '您如今已入宫墙，这一步先得把自己的处境看明白。';

const resolveRoutePressure = (payload: OpeningDialogueRequestPayload): string =>
  payload.routeContext?.routePressure?.trim() || '宫中人人看规矩，也看人心，行事总得留些余地。';

const resolveMapFeatureSummary = (payload: OpeningDialogueRequestPayload): string =>
  payload.routeContext?.mapFeatureSummary?.trim() ||
  '御书房、宝华殿与后宫入口最常用，先把这些地方认熟，后头才好安排行程。';

const resolveChoiceFocus = (payload: OpeningDialogueRequestPayload): string =>
  payload.routeContext?.choiceFocus?.trim() || '眼下最紧要的，是先定下待人行事的起手章法。';

const buildYingluoyetingOpeningDialogue = (payload: OpeningDialogueRequestPayload): OpeningDialogueResponsePayload => {
  if (payload.turn <= 1) {
    return {
      mode: 'line',
      phase: 'continue',
      speakerIdentity: '场景旁白',
      speakerName: payload.residenceName,
      text:
        '掖庭掌事把名册合上时，屋中只剩纸页摩擦的轻响。\n“沉氏，字写得不错，规矩也还算稳。”\n她没有抬眼，只把一卷旧册推到你面前。\n“内廷缺人整理旧档，原本轮不到你。可你既识字，又是罪臣之后，若真出了差错，也没人替你说话。”\n这话说得难听，却也是机会。\n你接过旧册，指尖触到封皮上陈旧的灰。\n三日后，你免了最粗重的杂役，被拨去内廷听用。\n那时你仍不是小主，只是一个能抄字、能听差、也更容易被看住的罪臣女眷。\n真正改命的，是一份宫宴前夜的祝词。\n原稿堆在案角，辞藻浮艳，错漏处却无人肯担。你借着誊抄，把它改得清稳合礼，又故意留下一个不显眼的笔锋：不冒进，不邀功，却足够让看惯奉承的人多停一眼。',
      nextActionLabel: '下一句',
      timeCost: 0,
      dataEffects: emptyEffects(),
      options: [],
    };
  }

  if (payload.turn === 2) {
    return {
      mode: 'line',
      phase: 'continue',
      speakerIdentity: '场景旁白',
      speakerName: payload.residenceName,
      text:
        '那份祝词随待呈文书送到御前。\n容安看过后，叫人把改稿的宫人带到殿外问话。\n你隔着屏风行礼，只说自己是内廷听用宫人。皇帝问礼制，你答礼制；问曲名，你答曲名；问为何改那两处错漏，你只说：“旧词不合宫宴礼数，奴婢不敢照错誊上。”\n你没有提沈家，也没有喊冤。你要的不是怜悯，而是让他知道：掖庭里有一个懂规矩、识字、能办事的人。\n问话之后，内侍按例去查你的名籍，才发现你是沈氏旧案余眷。\n于是他只给了你一个最低的位号，把你放进后妃册最末。',
      nextActionLabel: '听明白了',
      timeCost: 0,
      dataEffects: emptyEffects(),
      options: [],
    };
  }

  if (payload.turn === 3) {
    return {
      mode: 'line',
      phase: 'continue',
      speakerIdentity: '掖庭引路宫女',
      speakerName: payload.npcName,
      text: '娇娇也是那日被拨到你身边的。可出掖庭门时，娇娇替你抱着旧匣，小声提醒：“小主，往后人前说话，要比从前更慢些。您如今有了位号，旁人也就有了挑错的由头。”',
      nextActionLabel: '听明白了',
      timeCost: 0,
      dataEffects: emptyEffects(),
      options: [],
    };
  }

  if (payload.turn === 4) {
    return {
      mode: 'line',
      phase: 'continue',
      speakerIdentity: '场景旁白',
      speakerName: payload.residenceName,
      text:
        '回忆像灯花一样轻轻爆开，又很快落回眼前。\n你仍住在掖庭边院，离真正的后宫体面还很远。可从今日起，你有了可以安排的时辰、可以积攒的声望，也有了能一步步往上走的名分。',
      nextActionLabel: '听明白了',
      timeCost: 0,
      dataEffects: emptyEffects(),
      options: [],
    };
  }

  return {
    mode: 'branch',
    phase: 'finish',
    speakerIdentity: '掖庭引路宫女',
    speakerName: payload.npcName,
    text: '娇娇把木匣收进柜中，替你推开窗。\n“小主，今日要先读书、休养，还是出去认认宫路，您拿主意吧。”',
    nextActionLabel: '定下心思',
    timeCost: 0,
    dataEffects: emptyEffects(),
    options: [...buildFixedGuideOptions()],
  };
};

export const buildLocalOpeningDialogue = (payload: OpeningDialogueRequestPayload): OpeningDialogueResponsePayload => {
  if (payload.routeId === 'yingluoyeting') {
    return buildYingluoyetingOpeningDialogue(payload);
  }

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
      text: `${payload.playerTitle}，奴婢${payload.npcName}先陪您把眼下局面捋清。${routeSummary}${routePressure}右上角记着时辰、银两与体力，往后每做一件事，都得先看分寸与余力。`,
      nextActionLabel: '下一句',
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
      nextActionLabel: '听明白了',
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
    text: `${payload.playerTitle}，如今最要紧的不是多走一步，而是先定起手章法。${choiceFocus}您先拿个主意，后头奴婢也好照着替您铺路。`,
    nextActionLabel: '定下心思',
    timeCost: 0,
    dataEffects: emptyEffects(),
    options: [...buildFixedGuideOptions()],
  };
};

const normalizeOpeningDialogue = (
  response: OpeningDialogueResponsePayload,
  payload: OpeningDialogueRequestPayload,
): OpeningDialogueResponsePayload => {
  const fallback = buildLocalOpeningDialogue(payload);
  const branchTurn = payload.routeId === 'yingluoyeting' ? 5 : 3;
  const expectedMode = payload.turn >= branchTurn ? 'branch' : 'line';
  const text = String(response.text ?? '').trim();

  if (!text || response.mode !== expectedMode) {
    return fallback;
  }

  return {
    ...response,
    phase: expectedMode === 'branch' ? 'finish' : 'continue',
    nextActionLabel: expectedMode === 'branch' ? fallback.nextActionLabel : String(response.nextActionLabel ?? fallback.nextActionLabel),
    timeCost: 0,
    dataEffects: emptyEffects(),
    options: expectedMode === 'branch' ? [...buildFixedGuideOptions()] : [],
  };
};

export const requestOpeningDialogueWithFallback = async (
  payload: OpeningDialogueRequestPayload,
): Promise<OpeningDialogueResponsePayload> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildLocalOpeningDialogue(payload);
  }

  try {
    const response = await requestOpeningDialogue(payload);
    return normalizeOpeningDialogue(response, payload);
  } catch {
    return buildLocalOpeningDialogue(payload);
  }
};
