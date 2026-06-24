import { describe, expect, it } from 'vitest';
import type { GameNumericsState, PalaceTimeState } from '../types';
import {
  applyYingluoyetingStoryChoice,
  resolveYingluoyetingMapEvent,
  YINGLUOYETING_EVIDENCE_ITEM_IDS,
  YINGLUOYETING_STORY_FLAGS,
} from './yingluoyetingStoryRuntime';

const buildState = (overrides: Partial<GameNumericsState> = {}): GameNumericsState => ({
  name: '沉璧',
  age: 18,
  family: '沈氏',
  residenceName: '储秀宫西偏殿',
  pointsTotal: 20,
  pointsLeft: 0,
  routeId: 'yingluoyeting',
  stamina: 10,
  silver: 50,
  prestige: 50,
  stress: 30,
  favor: 10,
  trueHeart: 0,
  stats: {
    health: 400,
    fortune: 30,
    intrigue: 400,
    appearance: 400,
    temperament: 400,
    poetry: 0,
    talent: 60,
    painting: 60,
    embroidery: 10,
    medicine: 50,
    politics: 0,
  },
  flags: {
    attributeStatsFinalized: true,
  },
  ...overrides,
});

const buildTime = (overrides: Partial<PalaceTimeState> = {}): PalaceTimeState => ({
  year: 1,
  month: 2,
  xun: 1,
  slotIndex: 0,
  slot: '清晨',
  slotProgress: 0,
  ...overrides,
});

describe('yingluoyetingStoryRuntime', () => {
  it('resolves Chen Wanning first meet from the harem entry until the first meet itself has played', () => {
    const event = resolveYingluoyetingMapEvent({
      state: buildState(),
      time: buildTime({ month: 1 }),
      locationId: '后宫',
      inventory: [],
    });

    expect(event?.eventId).toBe('yingluo_02_chen_first_meet');
    expect(event?.locationId).toBe('后宫');
    expect(event?.options.map((option) => option.id)).toEqual(['thank-chen', 'probe-chen', 'ask-old-case']);

    expect(
      resolveYingluoyetingMapEvent({
        state: buildState({
          flags: {
            [YINGLUOYETING_STORY_FLAGS.chenWanningMet]: true,
            [YINGLUOYETING_STORY_FLAGS.evidenceBoxDone]: true,
            [YINGLUOYETING_STORY_FLAGS.chenWanningWatching]: true,
          },
        }),
        time: buildTime({ month: 5 }),
        locationId: '后宫',
        inventory: [],
      })?.eventId,
    ).toBe('yingluo_02_chen_first_meet');

    expect(
      resolveYingluoyetingMapEvent({
        state: buildState({
          flags: {
            [YINGLUOYETING_STORY_FLAGS.chenFirstMeetDone]: true,
          },
        }),
        time: buildTime({ month: 1 }),
        locationId: '后宫',
        inventory: [],
      })?.eventId,
    ).toBe('yingluo_02_chen_first_meet');

    expect(
      resolveYingluoyetingMapEvent({
        state: buildState({
          flags: {
            [YINGLUOYETING_STORY_FLAGS.chenFirstMeetPlayed]: true,
          },
        }),
        time: buildTime({ month: 1 }),
        locationId: '后宫',
        inventory: [],
      }),
    ).toBeUndefined();
  });

  it('uses the current player name in direct story-event address', () => {
    const event = resolveYingluoyetingMapEvent({
      state: buildState({ name: '林晚照' }),
      time: buildTime({ month: 1 }),
      locationId: '后宫',
      inventory: [],
    });

    expect(event?.text).toContain('你就是林晚照');
    expect(event?.text).not.toContain('你就是沉璧');
  });

  it('applies Chen Wanning first meet choices by closing the first-meet lifecycle', () => {
    const result = applyYingluoyetingStoryChoice({
      eventId: 'yingluo_02_chen_first_meet',
      choiceId: 'ask-old-case',
      state: buildState(),
    });

    expect(result.statePatch.stress).toBe(33);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.chenFirstMeetPlayed]).toBe(true);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.chenFirstMeetDone]).toBe(true);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.chenWanningMet]).toBe(true);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.chenFirstMeetPressed]).toBe(true);
    expect(result.concubineRelationDeltas).toEqual([
      {
        consortName: '陈婉宁',
        relationToPlayerDelta: -8,
      },
    ]);
    expect(result.resultText).toContain('她仍旧笑着');
  });

  it('resolves the cold palace clue event from existing route, time, location, flags, and inventory state', () => {
    const event = resolveYingluoyetingMapEvent({
      state: buildState(),
      time: buildTime(),
      locationId: '冷宫',
      inventory: [],
    });

    expect(event?.eventId).toBe('yingluo_03_cold_palace_clue');
    expect(event?.locationId).toBe('冷宫');
    expect(event?.options.map((option) => option.id)).toEqual(['shelter', 'press', 'take']);
  });

  it('does not resolve the cold palace clue before month two or after the testimony item is held', () => {
    expect(
      resolveYingluoyetingMapEvent({
        state: buildState(),
        time: buildTime({ month: 1 }),
        locationId: '冷宫',
        inventory: [],
      }),
    ).toBeUndefined();

    expect(
      resolveYingluoyetingMapEvent({
        state: buildState(),
        time: buildTime(),
        locationId: '冷宫',
        inventory: [
          {
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
            description: '冷宫老宫人偷藏的半页口供残抄。',
            canSell: false,
            canRecycle: false,
          },
        ],
      }),
    ).toBeUndefined();
  });

  it('applies the shelter choice by setting existing flags, granting the testimony item, and increasing stress', () => {
    const result = applyYingluoyetingStoryChoice({
      eventId: 'yingluo_03_cold_palace_clue',
      choiceId: 'shelter',
      state: buildState(),
    });

    expect(result.statePatch.stress).toBe(31);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.coldPalaceClueDone]).toBe(true);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.hasOldTestimony]).toBe(true);
    expect(result.grantedItem?.itemId).toBe(YINGLUOYETING_EVIDENCE_ITEM_IDS.oldTestimony);
    expect(result.resultHint).toBe('获得证物：老宫人口供残抄');
    expect(result.resultText).toContain('这半页残抄不能替沈家翻案');
  });

  it('resolves the Tai Hospital old prescription event only after the cold palace clue is established', () => {
    expect(
      resolveYingluoyetingMapEvent({
        state: buildState(),
        time: buildTime({ month: 3 }),
        locationId: '太医院',
        inventory: [],
      }),
    ).toBeUndefined();

    const event = resolveYingluoyetingMapEvent({
      state: buildState({
        flags: {
          [YINGLUOYETING_STORY_FLAGS.coldPalaceClueDone]: true,
          [YINGLUOYETING_STORY_FLAGS.hasOldTestimony]: true,
        },
      }),
      time: buildTime({ month: 3 }),
      locationId: '太医院',
      inventory: [],
    });

    expect(event?.eventId).toBe('yingluo_05_taiyi_old_prescription');
    expect(event?.options.map((option) => option.id)).toEqual(['copy', 'witness', 'memorize']);
  });

  it('applies the copy prescription choice by granting the original prescription and increasing medicine and stress', () => {
    const result = applyYingluoyetingStoryChoice({
      eventId: 'yingluo_05_taiyi_old_prescription',
      choiceId: 'copy',
      state: buildState(),
    });

    expect(result.statePatch.stress).toBe(31);
    expect(result.statePatch.stats?.medicine).toBe(51);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.taiyiPrescriptionDone]).toBe(true);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.hasOriginalPrescription]).toBe(true);
    expect(result.grantedItem?.itemId).toBe(YINGLUOYETING_EVIDENCE_ITEM_IDS.originalPrescription);
    expect(result.resultText).toContain('沈氏旧案里至少有一页纸说了假话');
  });

  it('resolves the storage transfer list event after the prescription mismatch is established', () => {
    expect(
      resolveYingluoyetingMapEvent({
        state: buildState({
          flags: {
            [YINGLUOYETING_STORY_FLAGS.taiyiPrescriptionDone]: true,
          },
        }),
        time: buildTime({ month: 3 }),
        locationId: '御膳房',
        inventory: [],
      }),
    ).toBeUndefined();

    const event = resolveYingluoyetingMapEvent({
      state: buildState({
        flags: {
          [YINGLUOYETING_STORY_FLAGS.taiyiPrescriptionDone]: true,
          [YINGLUOYETING_STORY_FLAGS.prescriptionMismatchNoted]: true,
        },
      }),
      time: buildTime({ month: 4 }),
      locationId: '御膳房',
      inventory: [],
    });

    expect(event?.eventId).toBe('yingluo_06_storage_transfer_list');
    expect(event?.speakerIdentity).toBe('管库宫人');
    expect(event?.options.map((option) => option.id)).toEqual(['copy-date', 'ask-order', 'protect-clerk']);
  });

  it('applies the copy transfer date choice by granting the storage transfer list evidence', () => {
    const result = applyYingluoyetingStoryChoice({
      eventId: 'yingluo_06_storage_transfer_list',
      choiceId: 'copy-date',
      state: buildState(),
    });

    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.storageTransferDone]).toBe(true);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.hasStorageTransferList]).toBe(true);
    expect(result.grantedItem?.itemId).toBe(YINGLUOYETING_EVIDENCE_ITEM_IDS.storageTransferList);
    expect(result.resultText).toContain('沈氏案卷并非结案后再无人碰过');
  });

  it('resolves the Zhaoyang Palace evidence box only after the three prior evidence links exist', () => {
    expect(
      resolveYingluoyetingMapEvent({
        state: buildState({
          flags: {
            [YINGLUOYETING_STORY_FLAGS.hasOldTestimony]: true,
            [YINGLUOYETING_STORY_FLAGS.hasOriginalPrescription]: true,
          },
        }),
        time: buildTime({ month: 5 }),
        locationId: '昭阳宫',
        inventory: [],
      }),
    ).toBeUndefined();

    const event = resolveYingluoyetingMapEvent({
      state: buildState({
        flags: {
          [YINGLUOYETING_STORY_FLAGS.hasOldTestimony]: true,
          [YINGLUOYETING_STORY_FLAGS.hasOriginalPrescription]: true,
          [YINGLUOYETING_STORY_FLAGS.storageTransferDone]: true,
          [YINGLUOYETING_STORY_FLAGS.hasStorageTransferList]: true,
        },
      }),
      time: buildTime({ month: 5 }),
      locationId: '昭阳宫',
      inventory: [],
    });

    expect(event?.eventId).toBe('yingluo_07_evidence_box');
    expect(event?.locationId).toBe('昭阳宫');
    expect(event?.text).toContain('昭阳宫旧年封存的杂物');
    expect(event?.text).not.toContain('长春宫');
    expect(event?.options.map((option) => option.id)).toEqual([
      'take-evidence',
      'question-chen',
      'trade-evidence',
      'destroy-copy',
    ]);
  });

  it('uses the current player name when Chen Wanning catches the evidence-box action', () => {
    const event = resolveYingluoyetingMapEvent({
      state: buildState({
        name: '林晚照',
        flags: {
          [YINGLUOYETING_STORY_FLAGS.hasOldTestimony]: true,
          [YINGLUOYETING_STORY_FLAGS.hasOriginalPrescription]: true,
          [YINGLUOYETING_STORY_FLAGS.storageTransferDone]: true,
          [YINGLUOYETING_STORY_FLAGS.hasStorageTransferList]: true,
        },
      }),
      time: buildTime({ month: 5 }),
      locationId: '昭阳宫',
      inventory: [],
    });

    expect(event?.text).toContain('林晚照，你不该碰这个');
    expect(event?.text).not.toContain('沈璧，你不该碰这个');
  });

  it('applies the evidence trade choice by granting the forged testimony page and reducing stress', () => {
    const result = applyYingluoyetingStoryChoice({
      eventId: 'yingluo_07_evidence_box',
      choiceId: 'trade-evidence',
      state: buildState(),
    });

    expect(result.statePatch.stress).toBe(27);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.evidenceBoxDone]).toBe(true);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.hasForgedTestimonyPage]).toBe(true);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.chenWanningMet]).toBe(true);
    expect(result.statePatch.flags?.[YINGLUOYETING_STORY_FLAGS.chenWanningWatching]).toBe(true);
    expect(result.grantedItem?.itemId).toBe(YINGLUOYETING_EVIDENCE_ITEM_IDS.forgedTestimonyPage);
    expect(result.resultText).toContain('若沈家的印是假的');
  });
});
