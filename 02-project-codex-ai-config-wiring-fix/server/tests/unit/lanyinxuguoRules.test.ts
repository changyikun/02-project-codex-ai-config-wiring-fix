import { describe, expect, it } from 'vitest';
import {
  applyGlobalStressLifeListener,
  applyNpcMadnessCheck,
  createLanyinStartState,
  endingValidationTable,
  validateLanyinEndings,
} from '../../src/modules/foundation/lanyinxuguo';

describe('lanyinxuguo stress/life listener', () => {
  it('压力=80 不扣寿，压力>80 每旬扣0.2', () => {
    const at80 = applyGlobalStressLifeListener({ stress: 80, life: 100 }, 1);
    expect(at80.life).toBe(100);

    const over80 = applyGlobalStressLifeListener({ stress: 81, life: 100 }, 1);
    expect(over80.life).toBe(99.8);

    const multiXun = applyGlobalStressLifeListener({ stress: 99, life: 100 }, 3);
    expect(multiXun.life).toBe(99.4);
  });
});

describe('lanyinxuguo npc madness', () => {
  it('NPC疯癫后永久失去侍寝资格', () => {
    const triggered = applyNpcMadnessCheck(
      { npcId: 'n1', stress: 90, isMad: false, canServeEmperor: true },
      0.5,
      0.1,
    );
    expect(triggered.isMad).toBe(true);
    expect(triggered.canServeEmperor).toBe(false);

    const persisted = applyNpcMadnessCheck(triggered, 0.0, 1.0);
    expect(persisted.isMad).toBe(true);
    expect(persisted.canServeEmperor).toBe(false);
  });
});

describe('lanyinxuguo start template', () => {
  it('开局模板固定资源且随机区间正确', () => {
    const start = createLanyinStartState({ aptitudePoints: 50, age: 18, emperorFavor: 45, emperorTrueHeart: 30 });
    expect(start.name).toBe('谢令仪');
    expect(start.prestige).toBe(2500);
    expect(start.silver).toBe(1000);
    expect(start.stress).toBe(30);
    expect(start.aptitudePoints).toBe(50);
  });
});

describe('lanyinxuguo ending validation table', () => {
  it('结局校验表含5个结局，独占帝心与后宫共主可继续游玩', () => {
    expect(endingValidationTable).toHaveLength(5);
    const exclusive = endingValidationTable.find((item) => item.endingId === 'exclusive-heart');
    const sovereign = endingValidationTable.find((item) => item.endingId === 'harem-sovereign');
    expect(exclusive?.continueFreePlay).toBe(true);
    expect(sovereign?.continueFreePlay).toBe(true);
  });

  it('唯我独尊：虎符缺失时不得触发', () => {
    const result = validateLanyinEndings({
      emperorAlive: false,
      emperorDeposed: true,
      emperorDead: false,
      selfEnthroned: true,
      hasCrownPrince: false,
      prestige: 4000,
      politics: 95,
      ambition: 81,
      emperorFavor: 80,
      trueHeart: 81,
      fatherOfficialRank: '正三品',
      courtLoyalty: 80,
      hasTigerTally: false,
      heirAge: undefined,
      intrigue: 900,
      eventFlags: {
        trueHeartHardToGet: true,
        emperorDismissedHarem: true,
        fakeDeathTriggered: true,
        fakeDeathFlowCompleted: true,
        escapedPalace: true,
      },
      haremCount: 9,
      allConsortsFavorAbove70: true,
      medicine: 90,
      physique: 800,
      craftedFakeDeathMedicine: true,
      taiyiFavor: 90,
      taiyiWillingAssist: true,
      foziFavor: 10,
      foziWillingAssist: false,
    });
    const onlyMe = result.find((item) => item.endingId === 'only-me-supreme');
    expect(onlyMe?.achieved).toBe(false);
    expect(onlyMe?.failedReasons).toContain('TIGER_TALLY_MISSING');
  });

  it('权力巅峰：幼子边界<10，10岁不触发', () => {
    const result = validateLanyinEndings({
      emperorAlive: false,
      emperorDeposed: false,
      emperorDead: true,
      selfEnthroned: false,
      hasCrownPrince: true,
      prestige: 1000,
      politics: 85,
      ambition: 90,
      emperorFavor: 40,
      trueHeart: 40,
      fatherOfficialRank: '从三品',
      courtLoyalty: 20,
      hasTigerTally: false,
      heirAge: 10,
      intrigue: 850,
      eventFlags: {
        trueHeartHardToGet: false,
        emperorDismissedHarem: false,
        fakeDeathTriggered: false,
        fakeDeathFlowCompleted: false,
        escapedPalace: false,
      },
      haremCount: 0,
      allConsortsFavorAbove70: false,
      medicine: 0,
      physique: 0,
      craftedFakeDeathMedicine: false,
      taiyiFavor: 0,
      taiyiWillingAssist: false,
      foziFavor: 0,
      foziWillingAssist: false,
    });
    const regent = result.find((item) => item.endingId === 'regent-pinnacle');
    expect(regent?.achieved).toBe(false);
    expect(regent?.failedReasons).toContain('HEIR_NOT_UNDER_10');
  });

  it('独占帝心：真心值必须>90，等于90不触发', () => {
    const result = validateLanyinEndings({
      emperorAlive: true,
      emperorDeposed: false,
      emperorDead: false,
      selfEnthroned: false,
      hasCrownPrince: false,
      prestige: 0,
      politics: 0,
      ambition: 0,
      emperorFavor: 91,
      trueHeart: 90,
      fatherOfficialRank: '从五品',
      courtLoyalty: 0,
      hasTigerTally: false,
      heirAge: undefined,
      intrigue: 0,
      eventFlags: {
        trueHeartHardToGet: true,
        emperorDismissedHarem: true,
        fakeDeathTriggered: false,
        fakeDeathFlowCompleted: false,
        escapedPalace: false,
      },
      haremCount: 0,
      allConsortsFavorAbove70: false,
      medicine: 0,
      physique: 0,
      craftedFakeDeathMedicine: false,
      taiyiFavor: 0,
      taiyiWillingAssist: false,
      foziFavor: 0,
      foziWillingAssist: false,
    });
    const exclusive = result.find((item) => item.endingId === 'exclusive-heart');
    expect(exclusive?.achieved).toBe(false);
    expect(exclusive?.failedReasons).toContain('TRUE_HEART_NOT_GT_90');
  });

  it('后宫共主：野心<=40可触发，>40失败', () => {
    const ok = validateLanyinEndings({
      emperorAlive: true,
      emperorDeposed: false,
      emperorDead: false,
      selfEnthroned: false,
      hasCrownPrince: false,
      prestige: 0,
      politics: 0,
      ambition: 40,
      emperorFavor: 0,
      trueHeart: 0,
      fatherOfficialRank: '从五品',
      courtLoyalty: 0,
      hasTigerTally: false,
      heirAge: undefined,
      intrigue: 0,
      eventFlags: {
        trueHeartHardToGet: false,
        emperorDismissedHarem: false,
        fakeDeathTriggered: false,
        fakeDeathFlowCompleted: false,
        escapedPalace: false,
      },
      haremCount: 8,
      allConsortsFavorAbove70: true,
      medicine: 0,
      physique: 0,
      craftedFakeDeathMedicine: false,
      taiyiFavor: 0,
      taiyiWillingAssist: false,
      foziFavor: 0,
      foziWillingAssist: false,
    });
    const okEnding = ok.find((item) => item.endingId === 'harem-sovereign');
    expect(okEnding?.achieved).toBe(true);

    const fail = validateLanyinEndings({
      ...{
        emperorAlive: true,
        emperorDeposed: false,
        emperorDead: false,
        selfEnthroned: false,
        hasCrownPrince: false,
        prestige: 0,
        politics: 0,
        ambition: 41,
        emperorFavor: 0,
        trueHeart: 0,
        fatherOfficialRank: '从五品' as const,
        courtLoyalty: 0,
        hasTigerTally: false,
        heirAge: undefined,
        intrigue: 0,
        eventFlags: {
          trueHeartHardToGet: false,
          emperorDismissedHarem: false,
          fakeDeathTriggered: false,
          fakeDeathFlowCompleted: false,
          escapedPalace: false,
        },
        haremCount: 8,
        allConsortsFavorAbove70: true,
        medicine: 0,
        physique: 0,
        craftedFakeDeathMedicine: false,
        taiyiFavor: 0,
        taiyiWillingAssist: false,
        foziFavor: 0,
        foziWillingAssist: false,
      },
    });
    const failEnding = fail.find((item) => item.endingId === 'harem-sovereign');
    expect(failEnding?.achieved).toBe(false);
    expect(failEnding?.failedReasons).toContain('AMBITION_GT_40');
  });

  it('归隐山林：辅助NPC缺失时失败，条件完整时成功', () => {
    const fail = validateLanyinEndings({
      emperorAlive: true,
      emperorDeposed: false,
      emperorDead: false,
      selfEnthroned: false,
      hasCrownPrince: false,
      prestige: 0,
      politics: 0,
      ambition: 0,
      emperorFavor: 0,
      trueHeart: 0,
      fatherOfficialRank: '从五品',
      courtLoyalty: 0,
      hasTigerTally: false,
      heirAge: undefined,
      intrigue: 0,
      eventFlags: {
        trueHeartHardToGet: false,
        emperorDismissedHarem: false,
        fakeDeathTriggered: true,
        fakeDeathFlowCompleted: true,
        escapedPalace: true,
      },
      haremCount: 0,
      allConsortsFavorAbove70: false,
      medicine: 81,
      physique: 701,
      craftedFakeDeathMedicine: true,
      taiyiFavor: 80,
      taiyiWillingAssist: true,
      foziFavor: 80,
      foziWillingAssist: true,
    });
    const failEnding = fail.find((item) => item.endingId === 'retire-mountains');
    expect(failEnding?.achieved).toBe(false);
    expect(failEnding?.failedReasons).toContain('NO_VALID_HELPER');

    const ok = validateLanyinEndings({
      emperorAlive: true,
      emperorDeposed: false,
      emperorDead: false,
      selfEnthroned: false,
      hasCrownPrince: false,
      prestige: 0,
      politics: 0,
      ambition: 0,
      emperorFavor: 0,
      trueHeart: 0,
      fatherOfficialRank: '从五品',
      courtLoyalty: 0,
      hasTigerTally: false,
      heirAge: undefined,
      intrigue: 0,
      eventFlags: {
        trueHeartHardToGet: false,
        emperorDismissedHarem: false,
        fakeDeathTriggered: true,
        fakeDeathFlowCompleted: true,
        escapedPalace: true,
      },
      haremCount: 0,
      allConsortsFavorAbove70: false,
      medicine: 90,
      physique: 800,
      craftedFakeDeathMedicine: true,
      taiyiFavor: 81,
      taiyiWillingAssist: true,
      foziFavor: 0,
      foziWillingAssist: false,
    });
    const okEnding = ok.find((item) => item.endingId === 'retire-mountains');
    expect(okEnding?.achieved).toBe(true);
  });
});
