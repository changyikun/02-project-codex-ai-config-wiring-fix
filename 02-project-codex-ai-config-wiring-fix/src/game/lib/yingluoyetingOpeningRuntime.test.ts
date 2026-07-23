import { describe, expect, it } from 'vitest';
import {
  buildYingluoyetingOpeningRewardBundle,
  personalizeYingluoyetingOpeningSteps,
  resolveYingluoyetingOpeningPerformanceTier,
  YINGLUOYETING_OPENING_CHOICE_STEPS,
  YINGLUOYETING_OPENING_PERFORMANCE_STEPS,
  YINGLUOYETING_OPENING_REWARD_ITEM_IDS,
  YINGLUOYETING_OPENING_STORY_STEPS,
} from './yingluoyetingOpeningRuntime';

describe('yingluoyeting opening runtime', () => {
  it('routes score 10 into the middle performance branch', () => {
    expect(resolveYingluoyetingOpeningPerformanceTier({ temperament: 4, talent: 6 })).toBe('middle');
    expect(resolveYingluoyetingOpeningPerformanceTier({ temperament: 400, talent: 60 })).toBe('middle');
    expect(resolveYingluoyetingOpeningPerformanceTier({ temperament: 500, talent: 60 })).toBe('high');
    expect(resolveYingluoyetingOpeningPerformanceTier({ temperament: 200, talent: 30 })).toBe('low');
  });

  it('builds reward bundles as inventory items with prices and no silver grant', () => {
    const middleRewards = buildYingluoyetingOpeningRewardBundle('middle');

    expect(middleRewards.map((reward) => [reward.item.itemId, reward.quantity])).toEqual([
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.jadeHandledWhisk, 1],
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.silverHairpin, 2],
      [YINGLUOYETING_OPENING_REWARD_ITEM_IDS.cottonCloth, 1],
    ]);
    expect(middleRewards.every((reward) => reward.item.price > 0)).toBe(true);
    expect(middleRewards.every((reward) => reward.item.category === 'gift')).toBe(true);
  });

  it('keeps the latest script backgrounds and branch options in order', () => {
    expect(YINGLUOYETING_OPENING_STORY_STEPS[0]).toMatchObject({
      background: '/assets/routes/backgrounds/poetry.png',
    });
    expect(YINGLUOYETING_OPENING_STORY_STEPS[0].text).toContain('墨泼青衫簪折雪，玉堕朱门骨未销。');

    const branchStep = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'li-gonggong-branch');
    expect(branchStep?.background).toBe('/assets/routes/backgrounds/loushi.png');
    expect(branchStep?.options?.map((option) => option.label)).toEqual(['出去看看', '原地等候']);
  });

  it('keeps the latest Guan-nvzi rank wording from the scripts', () => {
    const allTexts = YINGLUOYETING_OPENING_STORY_STEPS.map((step) => step.text).join('\n');

    expect(allTexts).toContain('今册为官女子，赐居储秀宫西偏殿，即日迁入。钦此。');
    expect(allTexts).toContain('恭喜沉姑娘。往后便是在册的主子了。');
    expect(allTexts).toContain('从今日起，你是官女子了。不再是无依无靠的掖庭罪奴。');
    expect(allTexts).toContain('主子如今是新封的官女子，每月都有月俸银子和份例用度。');
    expect(allTexts).toContain('压着“册为官女子”五个字。');
    expect(allTexts).not.toContain('册为选侍');
    expect(allTexts).not.toContain('沉选侍');
    expect(allTexts).not.toContain('选侍沉氏');
    expect(allTexts).not.toContain('新封的选侍');
  });

  it('personalizes hard-coded player name references in the opening script', () => {
    const personalizedText = personalizeYingluoyetingOpeningSteps(
      [
        ...YINGLUOYETING_OPENING_STORY_STEPS,
        ...YINGLUOYETING_OPENING_PERFORMANCE_STEPS.high,
        ...YINGLUOYETING_OPENING_PERFORMANCE_STEPS.middle,
        ...YINGLUOYETING_OPENING_PERFORMANCE_STEPS.low,
      ],
      { playerName: '柳如是' },
    )
      .map((step) => step.text)
      .join('\n');

    expect(personalizedText).toContain('乐人柳如是，献舞');
    expect(personalizedText).toContain('柳氏女柳如是，念在其温婉知礼');
    expect(personalizedText).toContain('柳如是这孩子');
    expect(personalizedText).not.toContain('乐人沉璧');
    expect(personalizedText).not.toContain('沉氏女沉璧');
    expect(personalizedText).not.toContain('沉璧这孩子');
  });

  it('uses eye.png as a full scene and returns to the banquet scene afterward', () => {
    const eyeStep = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'eye-scene');
    const eyeRemovedStep = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'eye-scene-removed');

    expect(eyeStep?.background).toBe('/assets/routes/backgrounds/eye.png');
    expect(eyeStep).not.toHaveProperty('overlay');
    expect(eyeStep?.text).toContain('然后撞进了一双眼睛里。');
    expect(eyeRemovedStep?.background).toBe('/assets/routes/backgrounds/gongyan.png');
    expect(eyeRemovedStep?.text).toContain('“倒是个美人胚子。”');
  });

  it('keeps player-focused performance narration in second person', () => {
    const highPerformanceText = YINGLUOYETING_OPENING_PERFORMANCE_STEPS.high.map((step) => step.text).join('\n');
    const openingText = YINGLUOYETING_OPENING_STORY_STEPS.map((step) => step.text).join('\n');

    expect(highPerformanceText).toContain('你每一步都踩在宫商角徵的转折处');
    expect(highPerformanceText).toContain('仿佛不是你在伴乐，而是乐在随你而起');
    expect(highPerformanceText).toContain('几乎要停下演奏来看你');
    expect(highPerformanceText).not.toContain('她每一步都踩在宫商角徵的转折处');
    expect(highPerformanceText).not.toContain('不是她在伴乐');
    expect(highPerformanceText).not.toContain('演奏来看她');
    expect(openingText).toContain('\u4f60\u751a\u81f3\u4e0d\u786e\u5b9a\u81ea\u5df1\u662f\u5426\u771f\u7684\u770b\u5230\u4e86\u90a3\u4e00\u4e1d\u6d9f\u6f2a');
    expect(openingText).not.toContain('\u6211\u751a\u81f3\u4e0d\u786e\u5b9a\u81ea\u5df1\u662f\u5426\u771f\u7684\u770b\u5230\u4e86\u90a3\u4e00\u4e1d\u6d9f\u6f2a');
  });

  it('splits the performance call onto the lamp scene before returning to the banquet scene', () => {
    const performanceCallStep = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'performance-call-lamp');
    const banquetReturnStep = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'banquet-return');

    expect(performanceCallStep?.background).toBe('/assets/routes/backgrounds/liuli_lamp.png');
    expect(performanceCallStep?.text).toContain('乐人沉璧，献舞');
    expect(banquetReturnStep?.background).toBe('/assets/routes/backgrounds/gongyan.png');
    expect(banquetReturnStep?.text).toContain('你睁开眼');
  });

  it('switches performance gaze passages to eye.png and reward passages to the attendant portrait', () => {
    const middleSteps = YINGLUOYETING_OPENING_PERFORMANCE_STEPS.middle;
    const gazeStep = middleSteps.find((step) => step.id === 'performance-middle-eye');
    const rewardStep = middleSteps.find((step) => step.id === 'performance-middle-reward');

    expect(gazeStep?.background).toBe('/assets/routes/backgrounds/eye.png');
    expect(gazeStep?.text).toContain('皇帝的目光落在你身上');
    expect(rewardStep?.background).toBe('/assets/routes/backgrounds/gongyan.png');
    expect(rewardStep?.portraitKey).toBe('taijian');
    expect(rewardStep?.speakerName).toBe('内侍');
  });

  it('inserts timed black transitions before the shabby room, chamber night, and first morning scenes', () => {
    expect(YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'time-passes-before-loushi')).toMatchObject({
      background: '/assets/routes/backgrounds/loushi.png',
      transition: 'black',
      autoAdvanceMs: 2000,
    });
    expect(YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'time-passes-before-chamber')).toMatchObject({
      background: '/assets/routes/home/home_yeting_night%20till%20latenight.png',
      transition: 'black',
      autoAdvanceMs: 3600,
    });
    expect(YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'chapter-end')?.background).toBe(
      '/assets/routes/home/home_yeting_night%20till%20latenight.png',
    );
    expect(YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'chapter-end')?.text).toContain(
      '远处灯火通明，而你站在这头，终于有了往那头走的资格。',
    );
    expect(YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'chapter-end')?.text).not.toContain('第一章·完');
    expect(YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'time-passes-before-first-morning')).toMatchObject({
      background: '/assets/routes/home/home_yeting_dawn%20till%20dask.png',
      transition: 'black',
      autoAdvanceMs: 3600,
    });
    expect(YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-wakeup')?.text).toContain(
      '天光从窗纸的缝隙里透进来',
    );
  });

  it('shows Jiaojiao portrait only from her first spoken morning line and again from the later response', () => {
    const wakeupNarration = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-wakeup');
    const wakeupJiaojiao = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-wakeup-jiaojiao');
    const afterExpenseNarration = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-after-expense');
    const afterExpenseCall = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-after-expense-call');
    const afterExpenseJiaojiao = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-after-expense-jiaojiao');

    expect(wakeupNarration).toMatchObject({
      speakerIdentity: '场景旁白',
      speakerName: '储秀宫西偏殿',
    });
    expect(wakeupNarration).not.toHaveProperty('portraitKey');
    expect(wakeupNarration?.text).toContain('天光从窗纸的缝隙里透进来');
    expect(wakeupNarration?.text).not.toContain('“主子醒了？”');

    expect(wakeupJiaojiao).toMatchObject({
      speakerIdentity: '娇娇',
      speakerName: '娇娇',
      portraitKey: 'jiaojiao',
    });
    expect(wakeupJiaojiao?.text).toContain('“主子醒了？”');

    expect(afterExpenseNarration).toMatchObject({
      speakerIdentity: '场景旁白',
      speakerName: '储秀宫西偏殿',
    });
    expect(afterExpenseNarration).not.toHaveProperty('portraitKey');
    expect(afterExpenseCall).toMatchObject({
      speakerIdentity: '场景旁白',
      speakerName: '储秀宫西偏殿',
    });
    expect(afterExpenseCall).not.toHaveProperty('portraitKey');
    expect(afterExpenseCall?.text).toContain('“娇娇。”');
    expect(afterExpenseCall?.text).not.toContain('“嗳，主子。”');

    expect(afterExpenseJiaojiao).toMatchObject({
      speakerIdentity: '娇娇',
      speakerName: '娇娇',
      portraitKey: 'jiaojiao',
    });
    expect(afterExpenseJiaojiao?.text).toContain('“嗳，主子。”她回过头来。');
  });

  it('keeps the first morning expense explanation as a branch that returns to the choice prompt', () => {
    const choiceStep = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-expense-choice');
    const explanationStep = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-expense-explanation');

    expect(choiceStep?.options?.map((option) => option.label)).toEqual(['节衣缩食', '量入为出', '锦衣玉食', '解释一下']);
    expect(explanationStep?.text).toContain('头一档，每月用月俸四分之一');
    expect(explanationStep?.text).toContain('主子若是拿定了主意，奴婢便照您说的去办。');
    expect(explanationStep).toMatchObject({
      returnToStepId: 'first-morning-expense-choice',
    });
  });

  it('marks the first morning teaching steps that reveal chamber controls', () => {
    expect(YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-show-training-buttons')).toMatchObject({
      hideDialogue: true,
      chamberIntroUi: 'training-buttons',
      autoAdvanceMs: 4600,
    });
    expect(YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-training-explain')?.text).toContain(
      '平日在寝居内：主子可以泼墨作画',
    );
    expect(YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-show-status')).toMatchObject({
      hideDialogue: true,
      chamberIntroUi: 'status',
      autoAdvanceMs: 1400,
    });
    expect(YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-jiaojiao-dismiss')?.text).toContain(
      '有事随时吩咐奴婢便是。',
    );
    expect(YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'first-morning-show-jiaojiao')).toMatchObject({
      hideDialogue: true,
      chamberIntroUi: 'jiaojiao',
      autoAdvanceMs: 3000,
      completesOpening: true,
    });
  });

  it('splits the go-out branch so Li Gonggong appears outside before returning to the shabby room', () => {
    const goOutSteps = YINGLUOYETING_OPENING_CHOICE_STEPS['go-out'];

    expect(goOutSteps.map((step) => step.id)).toEqual([
      'li-gonggong-go-out-open-door',
      'li-gonggong-go-out-outside',
      'li-gonggong-go-out-speech',
    ]);
    expect(goOutSteps.map((step) => step.background)).toEqual([
      '/assets/routes/backgrounds/loushi.png',
      '/assets/routes/backgrounds/chuyu_li.png',
      '/assets/routes/backgrounds/loushi.png',
    ]);
    expect(goOutSteps[0].text).toContain('用力拉开了那扇门');
    expect(goOutSteps[1].text).toContain('来人正要抬手叩门');
    expect(goOutSteps[1].text).not.toContain('“沉姑娘。”他开口了');
    expect(goOutSteps[2]).toMatchObject({
      portraitKey: 'li-gonggong',
      delayPortraitUntilBackgroundSettled: true,
    });
    expect(goOutSteps[2].text).toContain('“沉姑娘。”他开口了');
  });

  it('starts Li Gonggong portrait at the white-hair description in the wait-inside branch', () => {
    const waitInsideSteps = YINGLUOYETING_OPENING_CHOICE_STEPS['wait-inside'];

    expect(waitInsideSteps.map((step) => step.id)).toEqual([
      'li-gonggong-wait-inside-before-entrance',
      'li-gonggong-wait-inside-portrait',
    ]);
    expect(waitInsideSteps[0]).toMatchObject({
      background: '/assets/routes/backgrounds/loushi.png',
      speakerIdentity: '场景旁白',
    });
    expect(waitInsideSteps[0].text).toContain('你抬起眼来。');
    expect(waitInsideSteps[0].text).not.toContain('面前的人白发如雪');
    expect(waitInsideSteps[1]).toMatchObject({
      background: '/assets/routes/backgrounds/loushi.png',
      speakerIdentity: '李公公',
      speakerName: '李公公',
      portraitKey: 'li-gonggong',
    });
    expect(waitInsideSteps[1].text).toContain('面前的人白发如雪');
    expect(waitInsideSteps[1].text).toContain('“沉姑娘。”他开口了');
  });
});
