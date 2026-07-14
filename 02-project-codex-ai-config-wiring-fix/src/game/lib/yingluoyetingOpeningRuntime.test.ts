import { describe, expect, it } from 'vitest';
import {
  buildYingluoyetingOpeningRewardBundle,
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

  it('uses eye.png as a full scene and returns to the banquet scene afterward', () => {
    const eyeStep = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'eye-scene');
    const eyeRemovedStep = YINGLUOYETING_OPENING_STORY_STEPS.find((step) => step.id === 'eye-scene-removed');

    expect(eyeStep?.background).toBe('/assets/routes/backgrounds/eye.png');
    expect(eyeStep).not.toHaveProperty('overlay');
    expect(eyeStep?.text).toContain('然后撞进了一双眼睛里。');
    expect(eyeRemovedStep?.background).toBe('/assets/routes/backgrounds/gongyan.png');
    expect(eyeRemovedStep?.text).toContain('“倒是个美人胚子。”');
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

  it('inserts timed black transitions before the shabby room and chamber night scenes', () => {
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
