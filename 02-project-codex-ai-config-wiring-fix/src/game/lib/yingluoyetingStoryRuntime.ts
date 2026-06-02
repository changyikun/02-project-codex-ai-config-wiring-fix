import type { GameNumericsState, InventoryItem, MapAreaId, PalaceTimeState } from '../types';
import { resolvePlayerDisplayName } from './playerNameRuntime';

export const YINGLUOYETING_EVIDENCE_ITEM_IDS = {
  oldTestimony: 'yingluo-evidence-old-testimony',
  originalPrescription: 'yingluo-evidence-original-prescription',
  storageTransferList: 'yingluo-evidence-storage-transfer-list',
  forgedTestimonyPage: 'yingluo-evidence-forged-testimony-page',
} as const;

export const YINGLUOYETING_STORY_FLAGS = {
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
  text: string;
  options: YingluoyetingMapEventOption[];
}

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
};

const hasInventoryItem = (inventory: InventoryItem[], itemId: string): boolean =>
  inventory.some((item) => item.itemId === itemId && item.quantity > 0);

const hasFlag = (state: GameNumericsState, flag: string): boolean => Boolean(state.flags?.[flag]);

const isAfterFirstMonth = (time: PalaceTimeState): boolean => time.year > 1 || time.month >= 2;
const isAfterSecondMonth = (time: PalaceTimeState): boolean => time.year > 1 || time.month >= 3;
const isAfterThirdMonth = (time: PalaceTimeState): boolean => time.year > 1 || time.month >= 4;
const hasCompletedChenFirstMeet = (state: GameNumericsState): boolean =>
  hasFlag(state, YINGLUOYETING_STORY_FLAGS.chenFirstMeetPlayed);

const buildChenFirstMeetEvent = (playerName: string): YingluoyetingMapEvent => ({
  eventId: YINGLUOYETING_EVENT_IDS.chenFirstMeet,
  locationId: '后宫',
  speakerIdentity: '陈婉宁',
  speakerName: '陈婉宁',
  text: `你第一次踏进后宫宫道时，长春宫的宫人先停了步。
陈婉宁立在廊下，衣色很浅，话也很轻。
“你就是${resolvePlayerDisplayName(playerName, '沉璧')}？”
她含笑看你，像只是寻常问候。
“掖庭出来不易。往后若有什么难处，可以来长春宫递话。”
话到这里，她的目光却轻轻一转。
“只是宫里最忌讳旧事。人若总回头看，脚下的路便走不稳了。”`,
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
});

const coldPalaceEvent: YingluoyetingMapEvent = {
  eventId: YINGLUOYETING_EVENT_IDS.coldPalaceClue,
  locationId: '冷宫',
  speakerIdentity: '冷宫旧人',
  speakerName: '老宫人',
  text: `冷宫门前的铜锁早已生锈。
这里没有人高声说话，连落叶被踩碎的声音都显得突兀。
檐下有个老宫人正在扫灰。她看见你，并没有立刻行礼，只把扫帚往身后一收。
“姑娘又来了。”
她的声音很低，像怕惊动这地方多年积下的尘。
你没有逼问，只把早备好的药膏和几枚碎银放在石阶上。
老宫人沉默许久，终于从袖中摸出半页发脆的纸。
“这不是给沈家留的。”她说，“这是给我自己留的。”
“当年案发后，慎刑司问过我们这些夜里值守的人。我怕哪日被推出去顶罪，便偷藏了半页自己的口供残抄。”
纸上墨迹已经淡了，只剩几处还能辨认：
“三更后”“侧门”“外宫宫牌”。
老宫人把纸压在你掌心，指尖发抖。
“我没放人。我只听见门响，看见牌子从灯下晃过去。后来上头让我们闭嘴，我就再没敢提。”`,
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

const taiyiOldPrescriptionEvent: YingluoyetingMapEvent = {
  eventId: YINGLUOYETING_EVENT_IDS.taiyiOldPrescription,
  locationId: '太医院',
  speakerIdentity: '太医院医官',
  speakerName: '值守医官',
  text: `太医院旧档室里药气很沉。
你没有直接问沈氏旧案，只借着学习药理，翻看旧年温补方的底簿。
纸页边缘已经泛黄，墨迹却还清楚。
案卷中的毒方写着乌头、砒霜与烈酒同用，可太医院留底的原方，却只是寻常调理寒症的温补方。
两张方子只差数味药，意思却已天差地别。
值守医官看了一眼，脸色微变。
“太医院按方留底，是为日后复核药性，也为追责。”
他把两页纸隔着案角一比，声音压得更低。
“若这份底簿无误，刑案正卷里的那张，多半不是原方。”
他把声音压低。
“小主，这种旧档，最好不要让太多人知道您看过。”`,
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

const storageTransferListEvent: YingluoyetingMapEvent = {
  eventId: YINGLUOYETING_EVENT_IDS.storageTransferList,
  locationId: '御膳房',
  speakerIdentity: '管库宫人',
  speakerName: '管库宫人',
  text: `旧库的账册压在最底层，纸页被油烟和潮气熏得发黄。
管库宫人起初不肯给你看，直到银两压在册角，她才低声道：“小主只看这一页，看完便当没来过。”
账册上记着沈氏案后一只封存木匣的入库、调出和复入。
入库时写的是“刑案封存物，一匣”。
调出那日，批注却只有四个字：
“奉命复核。”
没有写奉谁的命，也没有写复核何物。
更怪的是，木匣复入时，封蜡记号换过一次。
管库宫人指着那一处，声音发紧。
“库房只认封蜡。封蜡换了，里面有没有换，便不是我们这些人敢问的了。”`,
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

const buildEvidenceBoxEvent = (playerName: string): YingluoyetingMapEvent => ({
  eventId: YINGLUOYETING_EVENT_IDS.evidenceBox,
  locationId: '昭阳宫',
  speakerIdentity: '陈婉宁',
  speakerName: '陈婉宁',
  text: `你终于见到了那只匣子。
匣面没有花纹，封蜡已经旧得发暗。
宫人说，这是昭阳宫旧年封存的杂物，原本该随废纸送出，后来不知为何一直压在侧库底下。
你打开匣盖。
里面是一页残缺供状副页，纸角有反复折过的痕迹。
供状上的名字被墨涂去大半，可落款处的朱印还在。
那不是你父亲的印。
也就是说，当年的认罪供状，至少有一处朱印不对。
门外忽然传来脚步声。
陈婉宁的声音隔着门响起。
“${resolvePlayerDisplayName(playerName, '沉璧')}，你不该碰这个。”`,
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
});

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
    const medicineDelta = input.choiceId === 'copy' ? 0.1 : 0;
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
