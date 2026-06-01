import {
  requestConsortDialogue,
  type ConsortDialogueRequestPayload,
  type ConsortDialogueResponsePayload,
} from '../../ai/consortDialogueAgent';
import { shouldUseRealtimeAiGameplay } from '../../config/gameplayMode';
import type { ConcubineProfile, ConsortDialogueTurn } from '../types';

const buildSpeakerIdentity = (consort: ConcubineProfile): string => consort.rankLabel || '宫妃';

const buildVoiceTag = (consort: ConcubineProfile): string => {
  const personality = consort.personality;
  if (personality.includes('骄矜') || personality.includes('好胜')) {
    return '话里仍带两分体面与锋芒';
  }
  if (personality.includes('温顺') || personality.includes('体贴')) {
    return '语气温柔，却总带着细微试探';
  }
  if (personality.includes('清醒') || personality.includes('守密')) {
    return '言辞克制，像是每一句都先在心里过了一遍';
  }
  if (personality.includes('清冷') || personality.includes('寡言')) {
    return '她先敛了眸色，话并不多';
  }
  if (personality.includes('端方') || personality.includes('克制')) {
    return '她礼数周全，叫人一时看不透心底偏向';
  }
  if (personality.includes('娇气') || personality.includes('病弱')) {
    return '她声音轻软，像是稍重些的话都会叫人心里一颤';
  }
  return '她依着自己的性子答话，语气并不肯全然交底';
};

const buildFallbackText = (
  payload: ConsortDialogueRequestPayload,
  consort: ConcubineProfile,
): { text: string; sceneHint: string } => {
  const { actionId, actionResult } = payload;
  const speakerLead = buildVoiceTag(consort);

  if (actionId === 'gift') {
    const itemName = payload.giftItemName ?? '礼物';
    return {
      text: `${speakerLead} ${consort.name}接过${itemName}时，眼尾先轻轻一动，随后才按住情绪向你行礼：“娘娘这份心，妾记下了。只是宫里人情最难还，妾不敢轻慢。”`,
      sceneHint: `${itemName}已送出，接下来可顺势探她心意，或只把场面留在礼数之内。`,
    };
  }

  if (actionId === 'greet') {
    return {
      text: `${speakerLead} ${consort.name}先向你敛衽请安，低声道：“娘娘今日肯亲来${payload.playerResidence === consort.residence ? '殿中' : '看我'}，妾自当好生应答。”`,
      sceneHint: '先从寒暄切入，对方的防备最容易在这种时候露出端倪。',
    };
  }

  if (actionId === 'quarrel') {
    return {
      text: `${speakerLead} 你话锋略重，她也不再一味退让，只把袖口压稳了些：“娘娘若只是来问罪，妾自然不敢顶撞；可若要把话说透，妾也未必全无分寸。”`,
      sceneHint: '口角已经起了火气，后续一句话就可能把关系推得更冷，或硬生生拉回来。',
    };
  }

  if (actionId === 'punish') {
    return {
      text: `${speakerLead} ${consort.name}被你压住声势后，仍强撑着把礼数做足：“规矩既是娘娘定下的，妾自会领罚。只是这笔账，妾也会记得是谁在此刻落了锤。”`,
      sceneHint: '责罚已落地，对方表面不敢违逆，心里却未必肯就此服气。',
    };
  }

  if (actionId === 'win-over') {
    const result = actionResult ?? '';
    return {
      text:
        result.includes('愿与您交好')
          ? `${speakerLead} 她抬眼看了你一瞬，终究还是把那点戒心收了回去：“若娘娘当真肯把妾当自己人，妾也愿把这一份情记在心上。”`
          : result.includes('不会答应')
            ? `${speakerLead} 她静了静，终究还是避开了你的目光：“娘娘的好意，妾不敢领。眼下彼此都还看不透，再近一步，只怕更难收场。”`
            : `${speakerLead} 她没有立刻应下，只轻声道：“娘娘若真想结个善缘，妾也愿慢慢看着。只是宫里话说得太满，反而伤人。”`,
      sceneHint: '拉拢的结果已经摆在面前，接下来更适合顺着她的心门试探，而不是再硬逼一步。',
    };
  }

  if (actionId === 'smear') {
    const targetName = payload.smearTargetName ?? '旁人';
    return {
      text: `${speakerLead} 你把话头引到${targetName}身上时，她指尖明显顿了一顿，随即压低了声线：“宫里流言最会要命。娘娘既肯提这一句，妾自会记着，只是往后还得细看真假。”`,
      sceneHint: `${targetName}已经被你带进这场谈话，对方是否真肯站到你这边，还得看后续这几句怎么说。`,
    };
  }

  if (actionId === 'farewell') {
    return {
      text: `${speakerLead} ${consort.name}闻言便把手中衣袖理平，向你低身一礼：“娘娘既要先行告退，妾不敢多留。今日这一席话，妾会记在心上。”`,
      sceneHint: '道别已经说出口，这一轮妃嫔对话可以收束离开。',
    };
  }

  return {
    text: `${speakerLead} ${consort.name}在殿中迎了你一礼，目光却没有立刻垂下：“娘娘今日亲来，想必不是只为看一眼宫灯与茶案。妾听着，娘娘尽可以开口。”`,
    sceneHint: '先看她肯不肯把话摊开，再决定是示好、试探还是压她一头。',
  };
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

const buildFallbackTurn = (
  payload: ConsortDialogueRequestPayload,
  consort: ConcubineProfile,
): ConsortDialogueTurn => {
  const fallback = buildFallbackText(payload, consort);
  if (payload.topic === 'follow-up') {
    const optionLabel = payload.selectedOptionLabel ?? '这句话';
    return {
      mode: 'line',
      phase: 'finish',
      speakerIdentity: buildSpeakerIdentity(consort),
      speakerName: consort.name,
      text: `${buildVoiceTag(consort)} ${consort.name}把你这句“${optionLabel}”听了进去，指尖轻轻压平袖口，才低声道：“娘娘既把话说到这里，妾自然会记着。今日这一轮，便先收在这里。”`,
      nextActionLabel: '收起',
      sceneHint: '这一轮回应已经收束，可以离开她的寝殿了。',
      options: [],
      usedFallback: true,
    };
  }

  if (payload.actionId === 'farewell') {
    return {
      mode: 'line',
      phase: 'finish',
      speakerIdentity: buildSpeakerIdentity(consort),
      speakerName: consort.name,
      text: fallback.text,
      nextActionLabel: '收起',
      sceneHint: fallback.sceneHint,
      options: [],
      usedFallback: true,
    };
  }

  return {
    mode: 'line',
    phase: 'finish',
    speakerIdentity: buildSpeakerIdentity(consort),
    speakerName: consort.name,
    text: fallback.text,
    nextActionLabel: '收起',
    sceneHint: fallback.sceneHint,
    options: [],
    usedFallback: true,
  };
};

export const buildConsortDialogueFallbackTurn = (
  payload: ConsortDialogueRequestPayload,
  consort: ConcubineProfile,
): ConsortDialogueTurn => buildFallbackTurn(payload, consort);

const normalizeConsortDialogueResponse = (
  response: ConsortDialogueResponsePayload,
  payload: ConsortDialogueRequestPayload,
  consort: ConcubineProfile,
): ConsortDialogueTurn => {
  const fallback = buildFallbackTurn(payload, consort);
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

  if (response.phase === 'finish') {
    return {
      mode: 'line',
      phase: 'finish',
      speakerIdentity: String(response.speakerIdentity ?? '').trim() || fallback.speakerIdentity,
      speakerName: String(response.speakerName ?? '').trim() || consort.name,
      text,
      nextActionLabel: '收起',
      sceneHint: String(response.sceneHint ?? '').trim() || fallback.sceneHint || '这一轮话题已经收束。',
      options: [],
      memoryCandidates,
      relationCandidates,
      affectHints,
      sessionMemory,
      relationMemory,
      usedFallback: false,
    };
  }

  if (mode === 'line') {
    if (asksForPlayerResponse(text)) {
      return {
        mode: 'branch',
        phase: 'continue',
        speakerIdentity: String(response.speakerIdentity ?? '').trim() || fallback.speakerIdentity,
        speakerName: String(response.speakerName ?? '').trim() || consort.name,
        text,
        nextActionLabel: '收起',
        sceneHint: String(response.sceneHint ?? '').trim() || '她把话递到你面前，等你给出回应。',
        options: [],
        memoryCandidates,
        relationCandidates,
        affectHints,
        sessionMemory,
        relationMemory,
        usedFallback: false,
      };
    }

    return {
      mode: 'line',
      phase: 'continue',
      speakerIdentity: String(response.speakerIdentity ?? '').trim() || fallback.speakerIdentity,
      speakerName: String(response.speakerName ?? '').trim() || consort.name,
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

  return {
    mode: 'line',
    phase: 'finish',
    speakerIdentity: String(response.speakerIdentity ?? '').trim() || fallback.speakerIdentity,
    speakerName: String(response.speakerName ?? '').trim() || consort.name,
    text,
    nextActionLabel: '收起',
    sceneHint: String(response.sceneHint ?? '').trim() || fallback.sceneHint,
    options: [],
    memoryCandidates,
    relationCandidates,
    affectHints,
    sessionMemory,
    relationMemory,
    usedFallback: false,
  };
};

export const requestConsortDialogueWithFallback = async (
  payload: ConsortDialogueRequestPayload,
  consort: ConcubineProfile,
): Promise<ConsortDialogueTurn> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildFallbackTurn(payload, consort);
  }

  try {
    const response = await requestConsortDialogue(payload);
    return normalizeConsortDialogueResponse(response, payload, consort);
  } catch {
    return buildFallbackTurn(payload, consort);
  }
};

export const requestConsortDialogueStrict = async (
  payload: ConsortDialogueRequestPayload,
  consort: ConcubineProfile,
): Promise<ConsortDialogueTurn> => {
  if (!shouldUseRealtimeAiGameplay()) {
    return buildFallbackTurn(payload, consort);
  }

  const response = await requestConsortDialogue(payload, { timeoutMs: null });
  return normalizeConsortDialogueResponse(response, payload, consort);
};
