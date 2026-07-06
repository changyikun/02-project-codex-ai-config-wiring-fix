import type { GameNumericsState, InventoryItem, MapAreaId, PalaceTimeState } from '../types';
import { renderNarrativeEntry } from '../narrative/narrativeCatalog';
import { narrativeEntryToDialogueFields, narrativeEntryToPresentation } from '../narrative/narrativeDialogueAdapter';
import { resolvePlayerDisplayName } from './playerNameRuntime';

export const YINGLUOYETING_EVIDENCE_ITEM_IDS = {
  oldTestimony: 'yingluo-evidence-old-testimony',
  originalPrescription: 'yingluo-evidence-original-prescription',
  storageTransferList: 'yingluo-evidence-storage-transfer-list',
  forgedTestimonyPage: 'yingluo-evidence-forged-testimony-page',
} as const;

export const YINGLUOYETING_STORY_FLAGS = {
  openingHaremFirstMeetPending: 'yingluo_opening_harem_first_meet_pending',
  chenFirstMeetDone: 'yingluo_02_chen_first_meet_done',
  chenFirstMeetPlayed: 'yingluo_02_chen_first_meet_played',
  chenWanningMet: 'yingluo_chen_wanning_met',
  chenFirstMeetProbed: 'yingluo_chen_first_meet_probed',
  chenFirstMeetPressed: 'yingluo_chen_first_meet_pressed',
  coldPalaceClueDone: 'yingluo_03_cold_palace_clue_done',
  hasOldTestimony: 'yingluo_has_old_testimony',
  coldPalacePassageNoted: 'yingluo_cold_palace_passage_noted',
  taiyiPrescriptionDone: 'yingluo_05_taiyi_old_prescription_done',
  hasOriginalPrescription: 'yingluo_has_original_prescription',
  prescriptionMismatchNoted: 'yingluo_prescription_mismatch_noted',
  medicalWitnessNoted: 'yingluo_medical_witness_noted',
  storageTransferDone: 'yingluo_06_storage_transfer_list_done',
  hasStorageTransferList: 'yingluo_has_storage_transfer_list',
  storageReviewOrderNoted: 'yingluo_storage_review_order_noted',
  evidenceBoxDone: 'yingluo_07_evidence_box_done',
  hasForgedTestimonyPage: 'yingluo_has_forged_testimony_page',
  sawForgedTestimonyPage: 'yingluo_saw_forged_testimony_page',
  chenWanningConfronted: 'yingluo_chen_wanning_confronted',
  chenWanningWatching: 'yingluo_chen_wanning_watching',
} as const;

export const YINGLUOYETING_EVENT_IDS = {
  chenFirstMeet: 'yingluo_02_chen_first_meet',
  coldPalaceClue: 'yingluo_03_cold_palace_clue',
  taiyiOldPrescription: 'yingluo_05_taiyi_old_prescription',
  storageTransferList: 'yingluo_06_storage_transfer_list',
  evidenceBox: 'yingluo_07_evidence_box',
} as const;

export interface YingluoyetingMapEventOption {
  id:
    | 'shelter'
    | 'press'
    | 'take'
    | 'copy'
    | 'witness'
    | 'memorize'
    | 'copy-date'
    | 'ask-order'
    | 'protect-clerk'
    | 'take-evidence'
    | 'question-chen'
    | 'trade-evidence'
    | 'destroy-copy'
    | 'thank-chen'
    | 'probe-chen'
    | 'ask-old-case';
  label: string;
  effectHint: string;
}

export interface YingluoyetingMapEvent {
  eventId: string;
  locationId: MapAreaId | '后宫';
  speakerIdentity: string;
  speakerName: string;
  portraitKey: string;
  portraitPlacement: 'stage' | 'dialogue-left';
  text: string;
  options: YingluoyetingMapEventOption[];
}

const resolveMapEventPortraitPlacement = (
  placement: YingluoyetingMapEvent['portraitPlacement'] | '',
): YingluoyetingMapEvent['portraitPlacement'] => placement || 'stage';

const oldTestimonyItem: InventoryItem = {
  itemId: YINGLUOYETING_EVIDENCE_ITEM_IDS.oldTestimony,
  name: '老宫人口供残抄',
  category: 'rare',
  rarity: 'purple',
  quantity: 1,
  price: 0,
  favorDelta: 0,
  healthDelta: 0,
  appearanceDelta: 0,
  temperamentDelta: 0,
  description: '冷宫老宫人偷藏的半页口供残抄，只能证明案发夜有异常宫牌借道。',
  canSell: false,
  canRecycle: false,
  isQuestItem: true,
};

const originalPrescriptionItem: InventoryItem = {
  itemId: YINGLUOYETING_EVIDENCE_ITEM_IDS.originalPrescription,
  name: '太医院原方底簿',
  category: 'rare',
  rarity: 'purple',
  quantity: 1,
  price: 0,
  favorDelta: 0,
  healthDelta: 0,
  appearanceDelta: 0,
  temperamentDelta: 0,
  description: '太医院旧档中留存的原始调理方，可证明沈氏案卷里的毒方并非原方。',
  canSell: false,
  canRecycle: false,
  isQuestItem: true,
};

const storageTransferListItem: InventoryItem = {
  itemId: YINGLUOYETING_EVIDENCE_ITEM_IDS.storageTransferList,
  name: '旧库封存清单',
  category: 'rare',
  rarity: 'purple',
  quantity: 1,
  price: 0,
  favorDelta: 0,
  healthDelta: 0,
  appearanceDelta: 0,
  temperamentDelta: 0,
  description: '御膳房旧库账册中抄出的封存木匣调出记录，可证明沈氏案卷相关木匣结案后曾被复核。',
  canSell: false,
  canRecycle: false,
  isQuestItem: true,
};

const forgedTestimonyPageItem: InventoryItem = {
  itemId: YINGLUOYETING_EVIDENCE_ITEM_IDS.forgedTestimonyPage,
  name: '伪印供状副页',
  category: 'rare',
  rarity: 'purple',
  quantity: 1,
  price: 0,
  favorDelta: 0,
  healthDelta: 0,
  appearanceDelta: 0,
  temperamentDelta: 0,
  description: '长春宫旧年封存物中取出的残缺供状副页，可证明沈氏认罪供状落款朱印存在伪造嫌疑。',
  canSell: false,
  canRecycle: false,
  isQuestItem: true,
};

const hasInventoryItem = (inventory: InventoryItem[], itemId: string): boolean =>
  inventory.some((item) => item.itemId === itemId && item.quantity > 0);

const hasFlag = (state: GameNumericsState, flag: string): boolean => Boolean(state.flags?.[flag]);
const resolveNarrativeLocationId = (entryLocationId: string, fallback: MapAreaId): MapAreaId =>
  (entryLocationId || fallback) as MapAreaId;

const isAfterFirstMonth = (time: PalaceTimeState): boolean => time.year > 1 || time.month >= 2;
const isAfterSecondMonth = (time: PalaceTimeState): boolean => time.year > 1 || time.month >= 3;
const isAfterThirdMonth = (time: PalaceTimeState): boolean => time.year > 1 || time.month >= 4;
const hasCompletedChenFirstMeet = (state: GameNumericsState): boolean =>
  hasFlag(state, YINGLUOYETING_STORY_FLAGS.chenFirstMeetPlayed);

const buildChenFirstMeetEvent = (playerName: string): YingluoyetingMapEvent => {
  const entry = renderNarrativeEntry('route.yingluoyeting.harem-first-meet', {
    playerDisplayName: resolvePlayerDisplayName(playerName, '沉璧'),
  });
  const eventFields = narrativeEntryToPresentation(entry);
  return {
    eventId: YINGLUOYETING_EVENT_IDS.chenFirstMeet,
    locationId: resolveNarrativeLocationId(entry.locationId, '后宫'),
    speakerIdentity: eventFields.speakerIdentity,
    speakerName: eventFields.speakerName,
    portraitKey: eventFields.portraitKey,
    portraitPlacement: resolveMapEventPortraitPlacement(eventFields.portraitPlacement),
    text: eventFields.text,
    options: [
    {
      id: 'thank-chen',
      label: '谢她照拂，只字不提旧案',
      effectHint: '记下陈婉宁初见，态度暂稳。',
    },
    {
      id: 'probe-chen',
      label: '试探她为何知道自己',
      effectHint: '记下你试探过陈婉宁，压力略升。',
    },
    {
      id: 'ask-old-case',
      label: '直问她是否知道旧案',
      effectHint: '记下你逼问过陈婉宁，压力上升。',
    },
    ],
  };
};

const coldPalaceNarrative = renderNarrativeEntry('route.yingluoyeting.cold-palace');
const coldPalaceNarrativeFields = narrativeEntryToDialogueFields(coldPalaceNarrative);
const coldPalaceEvent: YingluoyetingMapEvent = {
  eventId: YINGLUOYETING_EVENT_IDS.coldPalaceClue,
  locationId: resolveNarrativeLocationId(coldPalaceNarrative.locationId, '冷宫'),
  ...coldPalaceNarrativeFields,
  portraitKey: coldPalaceNarrative.portraitKey,
  portraitPlacement: resolveMapEventPortraitPlacement(coldPalaceNarrative.portraitPlacement),
  options: [
    {
      id: 'shelter',
      label: '承诺替她遮掩此事',
      effectHint: '获得老宫人口供残抄，压力略升。',
    },
    {
      id: 'press',
      label: '追问宫牌来处',
      effectHint: '以心计压问，成功可多记一条宫牌方向。',
    },
    {
      id: 'take',
      label: '只收下残抄，不再追问',
      effectHint: '获得老宫人口供残抄，风险最低。',
    },
  ],
};

const taiyiOldPrescriptionNarrative = renderNarrativeEntry('route.yingluoyeting.tai-hospital');
const taiyiOldPrescriptionNarrativeFields = narrativeEntryToDialogueFields(taiyiOldPrescriptionNarrative);
const taiyiOldPrescriptionEvent: YingluoyetingMapEvent = {
  eventId: YINGLUOYETING_EVENT_IDS.taiyiOldPrescription,
  locationId: resolveNarrativeLocationId(taiyiOldPrescriptionNarrative.locationId, '太医院'),
  ...taiyiOldPrescriptionNarrativeFields,
  portraitKey: taiyiOldPrescriptionNarrative.portraitKey,
  portraitPlacement: resolveMapEventPortraitPlacement(taiyiOldPrescriptionNarrative.portraitPlacement),
  options: [
    {
      id: 'copy',
      label: '抄录原方',
      effectHint: '获得太医院原方底簿，药理略升，压力略升。',
    },
    {
      id: 'witness',
      label: '请医官作证',
      effectHint: '记录医官可作证，但会增加风险。',
    },
    {
      id: 'memorize',
      label: '只记药名，不带走纸页',
      effectHint: '记录药方不一致，不获得硬证物。',
    },
  ],
};

const storageTransferListNarrative = renderNarrativeEntry('route.yingluoyeting.storehouse');
const storageTransferListNarrativeFields = narrativeEntryToDialogueFields(storageTransferListNarrative);
const storageTransferListEvent: YingluoyetingMapEvent = {
  eventId: YINGLUOYETING_EVENT_IDS.storageTransferList,
  locationId: resolveNarrativeLocationId(storageTransferListNarrative.locationId, '御膳房'),
  ...storageTransferListNarrativeFields,
  portraitKey: storageTransferListNarrative.portraitKey,
  portraitPlacement: resolveMapEventPortraitPlacement(storageTransferListNarrative.portraitPlacement),
  options: [
    {
      id: 'copy-date',
      label: '抄下调出日期',
      effectHint: '获得旧库封存清单。',
    },
    {
      id: 'ask-order',
      label: '追问奉谁的命',
      effectHint: '打探复核命令，失败会增加压力。',
    },
    {
      id: 'protect-clerk',
      label: '不牵连管库宫人',
      effectHint: '获得旧库封存清单，压力略降。',
    },
  ],
};

const buildEvidenceBoxEvent = (playerName: string): YingluoyetingMapEvent => {
  const entry = renderNarrativeEntry('route.yingluoyeting.box', {
    playerDisplayName: resolvePlayerDisplayName(playerName, '沉璧'),
  });
  const eventFields = narrativeEntryToPresentation(entry);
  return {
    eventId: YINGLUOYETING_EVENT_IDS.evidenceBox,
    locationId: resolveNarrativeLocationId(entry.locationId, '昭阳宫'),
    speakerIdentity: eventFields.speakerIdentity,
    speakerName: eventFields.speakerName,
    portraitKey: eventFields.portraitKey,
    portraitPlacement: resolveMapEventPortraitPlacement(eventFields.portraitPlacement),
    text: eventFields.text,
    options: [
    {
      id: 'take-evidence',
      label: '带走证物',
      effectHint: '获得伪印供状副页，但压力上升。',
    },
    {
      id: 'question-chen',
      label: '当面质问陈婉宁',
      effectHint: '记录陈婉宁被质问，只确认供状伪印疑点。',
    },
    {
      id: 'trade-evidence',
      label: '以证物与她交易',
      effectHint: '获得伪印供状副页，记录陈婉宁观望，压力下降。',
    },
    {
      id: 'destroy-copy',
      label: '毁掉副本，只记内容',
      effectHint: '记录见过伪印供状副页，不获得硬证物，压力下降。',
    },
    ],
  };
};

export const resolveYingluoyetingMapEvent = (_input: {
  state: GameNumericsState;
  time: PalaceTimeState;
  locationId: MapAreaId | '后宫';
  inventory: InventoryItem[];
}): YingluoyetingMapEvent | undefined => {
  const { state, time, locationId, inventory } = _input;
  if (state.routeId !== 'yingluoyeting') {
    return undefined;
  }
  if (locationId === '后宫') {
    if (hasCompletedChenFirstMeet(state)) {
      return undefined;
    }

    return buildChenFirstMeetEvent(state.name);
  }

  if (locationId === '冷宫' && isAfterFirstMonth(time)) {
    if (
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.coldPalaceClueDone) ||
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.hasOldTestimony) ||
      hasInventoryItem(inventory, YINGLUOYETING_EVIDENCE_ITEM_IDS.oldTestimony)
    ) {
      return undefined;
    }

    return coldPalaceEvent;
  }

  if (locationId === '太医院' && isAfterSecondMonth(time)) {
    const hasColdPalaceLead =
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.hasOldTestimony) ||
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.coldPalacePassageNoted) ||
      hasInventoryItem(inventory, YINGLUOYETING_EVIDENCE_ITEM_IDS.oldTestimony);
    if (!hasColdPalaceLead) {
      return undefined;
    }
    if (
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.taiyiPrescriptionDone) ||
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.hasOriginalPrescription) ||
      hasInventoryItem(inventory, YINGLUOYETING_EVIDENCE_ITEM_IDS.originalPrescription)
    ) {
      return undefined;
    }

    return taiyiOldPrescriptionEvent;
  }

  if (locationId === '御膳房' && isAfterThirdMonth(time)) {
    const hasPrescriptionLead =
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.prescriptionMismatchNoted) ||
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.hasOriginalPrescription) ||
      hasInventoryItem(inventory, YINGLUOYETING_EVIDENCE_ITEM_IDS.originalPrescription);
    if (!hasPrescriptionLead) {
      return undefined;
    }
    if (
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.storageTransferDone) ||
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.hasStorageTransferList) ||
      hasInventoryItem(inventory, YINGLUOYETING_EVIDENCE_ITEM_IDS.storageTransferList)
    ) {
      return undefined;
    }

    return storageTransferListEvent;
  }

  if (locationId === '昭阳宫') {
    const hasOldTestimonyLead =
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.hasOldTestimony) ||
      hasInventoryItem(inventory, YINGLUOYETING_EVIDENCE_ITEM_IDS.oldTestimony);
    const hasPrescriptionLead =
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.hasOriginalPrescription) ||
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.prescriptionMismatchNoted) ||
      hasInventoryItem(inventory, YINGLUOYETING_EVIDENCE_ITEM_IDS.originalPrescription);
    const hasStorageLead =
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.storageTransferDone) ||
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.hasStorageTransferList) ||
      hasInventoryItem(inventory, YINGLUOYETING_EVIDENCE_ITEM_IDS.storageTransferList);
    if (!hasOldTestimonyLead || !hasPrescriptionLead || !hasStorageLead) {
      return undefined;
    }
    if (
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.evidenceBoxDone) ||
      hasFlag(state, YINGLUOYETING_STORY_FLAGS.hasForgedTestimonyPage) ||
      hasInventoryItem(inventory, YINGLUOYETING_EVIDENCE_ITEM_IDS.forgedTestimonyPage)
    ) {
      return undefined;
    }

    return buildEvidenceBoxEvent(state.name);
  }

  return undefined;
};

export const applyYingluoyetingStoryChoice = (input: {
  eventId: string;
  choiceId: string;
  state: GameNumericsState;
}): {
  statePatch: Partial<GameNumericsState> & { flags?: Record<string, boolean> };
  concubineRelationDeltas?: Array<{ consortName: string; relationToPlayerDelta: number }>;
  grantedItem?: InventoryItem;
  resultHint?: string;
  resultText: string;
} => {
  if (input.eventId === YINGLUOYETING_EVENT_IDS.chenFirstMeet) {
    const nextFlags = {
      ...input.state.flags,
      [YINGLUOYETING_STORY_FLAGS.chenFirstMeetPlayed]: true,
      [YINGLUOYETING_STORY_FLAGS.chenFirstMeetDone]: true,
      [YINGLUOYETING_STORY_FLAGS.chenWanningMet]: true,
      ...(input.choiceId === 'probe-chen' ? { [YINGLUOYETING_STORY_FLAGS.chenFirstMeetProbed]: true } : {}),
      ...(input.choiceId === 'ask-old-case' ? { [YINGLUOYETING_STORY_FLAGS.chenFirstMeetPressed]: true } : {}),
    };
    const stressDelta = input.choiceId === 'ask-old-case' ? 3 : input.choiceId === 'probe-chen' ? 1 : 0;
    const relationToPlayerDelta =
      input.choiceId === 'thank-chen' ? 5 : input.choiceId === 'probe-chen' ? -3 : -8;

    return {
      statePatch: {
        stress: Math.max(0, input.state.stress + stressDelta),
        flags: nextFlags,
      },
      concubineRelationDeltas: [
        {
          consortName: '陈婉宁',
          relationToPlayerDelta,
        },
      ],
      resultText:
        input.choiceId === 'thank-chen'
          ? '陈婉宁笑意未改，只说长春宫门路清净，若有难处递话便是。你没有接她那句旧事，她也没有再逼近。'
          : input.choiceId === 'probe-chen'
            ? '她仍旧笑着，只把话轻轻带过：“宫里人多，谁从何处来，总有人会知道。”你听得出，这不是答案，只是提醒。'
            : '她仍旧笑着，眼底却冷了一分：“小主刚有位号，先学会站稳，才好问从前。”这句话像劝诫，也像警告。',
    };
  }

  if (input.eventId === YINGLUOYETING_EVENT_IDS.coldPalaceClue) {
    const baseFlags = {
      ...input.state.flags,
      [YINGLUOYETING_STORY_FLAGS.coldPalaceClueDone]: true,
      [YINGLUOYETING_STORY_FLAGS.hasOldTestimony]: true,
    };
    const nextFlags =
      input.choiceId === 'press'
        ? {
            ...baseFlags,
            [YINGLUOYETING_STORY_FLAGS.coldPalacePassageNoted]: true,
          }
        : baseFlags;
    const stressDelta = input.choiceId === 'shelter' ? 1 : 0;

    return {
      statePatch: {
        stress: Math.max(0, input.state.stress + stressDelta),
        flags: nextFlags,
      },
      grantedItem: oldTestimonyItem,
      resultHint: `获得证物：${oldTestimonyItem.name}`,
      resultText: `这半页残抄不能替沈家翻案。
它只能证明，案发那夜，有人走过一条不该走的路。
可一桩死案若有第一处缝，后头便未必全是铁板。`,
    };
  }

  if (input.eventId === YINGLUOYETING_EVENT_IDS.taiyiOldPrescription) {
    const grantsHardEvidence = input.choiceId !== 'memorize';
    const nextFlags = {
      ...input.state.flags,
      [YINGLUOYETING_STORY_FLAGS.taiyiPrescriptionDone]: true,
      [YINGLUOYETING_STORY_FLAGS.prescriptionMismatchNoted]: true,
      ...(grantsHardEvidence ? { [YINGLUOYETING_STORY_FLAGS.hasOriginalPrescription]: true } : {}),
      ...(input.choiceId === 'witness' ? { [YINGLUOYETING_STORY_FLAGS.medicalWitnessNoted]: true } : {}),
    };
    const medicineDelta = input.choiceId === 'copy' ? 1 : 0;
    const stressDelta = input.choiceId === 'memorize' ? 0 : input.choiceId === 'witness' ? 2 : 1;

    return {
      statePatch: {
        stress: Math.max(0, input.state.stress + stressDelta),
        stats: {
          medicine: Number(((input.state.stats.medicine ?? 0) + medicineDelta).toFixed(2)),
        },
        flags: nextFlags,
      },
      grantedItem: grantsHardEvidence ? originalPrescriptionItem : undefined,
      resultHint: grantsHardEvidence ? `获得证物：${originalPrescriptionItem.name}` : undefined,
      resultText: `药方上的墨迹很淡。
它不能告诉你是谁动了案卷。
但它已经足够说明，沈氏旧案里至少有一页纸说了假话。`,
    };
  }

  if (input.eventId === YINGLUOYETING_EVENT_IDS.storageTransferList) {
    const nextFlags = {
      ...input.state.flags,
      [YINGLUOYETING_STORY_FLAGS.storageTransferDone]: true,
      [YINGLUOYETING_STORY_FLAGS.hasStorageTransferList]: true,
      ...(input.choiceId === 'ask-order' ? { [YINGLUOYETING_STORY_FLAGS.storageReviewOrderNoted]: true } : {}),
    };
    const stressDelta = input.choiceId === 'protect-clerk' ? -1 : input.choiceId === 'ask-order' ? 1 : 0;

    return {
      statePatch: {
        stress: Math.max(0, input.state.stress + stressDelta),
        flags: nextFlags,
      },
      grantedItem: storageTransferListItem,
      resultHint: `获得证物：${storageTransferListItem.name}`,
      resultText: `一张清单不能证明谁换了供状。
可它证明了最要紧的一件事：沈氏案卷并非结案后再无人碰过。`,
    };
  }

  if (input.eventId === YINGLUOYETING_EVENT_IDS.evidenceBox) {
    const grantsHardEvidence = input.choiceId === 'take-evidence' || input.choiceId === 'trade-evidence';
    const nextFlags = {
      ...input.state.flags,
      [YINGLUOYETING_STORY_FLAGS.evidenceBoxDone]: true,
      [YINGLUOYETING_STORY_FLAGS.chenWanningMet]: true,
      [YINGLUOYETING_STORY_FLAGS.sawForgedTestimonyPage]: true,
      ...(grantsHardEvidence ? { [YINGLUOYETING_STORY_FLAGS.hasForgedTestimonyPage]: true } : {}),
      ...(input.choiceId === 'question-chen' ? { [YINGLUOYETING_STORY_FLAGS.chenWanningConfronted]: true } : {}),
      ...(input.choiceId === 'trade-evidence' ? { [YINGLUOYETING_STORY_FLAGS.chenWanningWatching]: true } : {}),
    };
    const stressDelta = input.choiceId === 'trade-evidence' ? -3 : input.choiceId === 'destroy-copy' ? -1 : input.choiceId === 'take-evidence' ? 3 : 1;

    return {
      statePatch: {
        stress: Math.max(0, input.state.stress + stressDelta),
        flags: nextFlags,
      },
      grantedItem: grantsHardEvidence ? forgedTestimonyPageItem : undefined,
      resultHint: grantsHardEvidence ? `获得证物：${forgedTestimonyPageItem.name}` : undefined,
      resultText: `匣盖合上的一瞬，你忽然明白。
这页纸不是终点。
它只把一个更危险的问题推到你面前：若沈家的印是假的，真的伪印，又出自谁手？`,
    };
  }

  return {
    statePatch: {},
    resultText: '',
  };
};
