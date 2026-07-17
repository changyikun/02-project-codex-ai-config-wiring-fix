import { describe, expect, it } from 'vitest';

import {
  buildYingluoyetingPrestigeMapGuideSteps,
  YINGLUOYETING_PRESTIGE_MAP_GUIDE_SCRIPT_ID,
} from './yingluoyetingPrestigeMapGuideRuntime';

describe('yingluoyeting prestige map guide runtime', () => {
  it('keeps developer directions out of displayed story text', () => {
    const steps = buildYingluoyetingPrestigeMapGuideSteps({
      playerName: '柳如是',
      rankLabel: '官女子',
      age: 23,
    });

    const allText = steps.map((step) => step.text).join('\n');

    expect(YINGLUOYETING_PRESTIGE_MAP_GUIDE_SCRIPT_ID).toBe('yingluoyeting-prestige-map-guide');
    expect(allText).not.toContain('{');
    expect(allText).not.toContain('}');
    expect(allText).not.toContain('接之前长黑幕');
    expect(allText).not.toContain('娇娇立绘');
  });

  it('personalizes player surname, name, rank, and age fields', () => {
    const allText = buildYingluoyetingPrestigeMapGuideSteps({
      playerName: '柳如是',
      rankLabel: '官女子',
      age: 23,
    })
      .map((step) => step.text)
      .join('\n');

    expect(allText).toContain('柳小主稍候，容奴婢进去通传。');
    expect(allText).toContain('太后娘娘宣柳小主进去。');
    expect(allText).toContain('臣妾柳如是，给太后娘娘请安。太后娘娘万福金安。');
    expect(allText).toContain('回太后娘娘，二十三。');
    expect(allText).toContain('您新封的官女子');
    expect(allText).not.toContain('沉小主');
    expect(allText).not.toContain('臣妾沉璧');
    expect(allText).not.toContain('回太后娘娘，十七。');
  });

  it('preserves stage order and one-time prestige reward cue', () => {
    const steps = buildYingluoyetingPrestigeMapGuideSteps({
      playerName: '柳如是',
      rankLabel: '官女子',
      age: 23,
    });

    expect(steps.map((step) => step.phase)).toEqual([
      'chamber-prestige',
      'chamber-prestige',
      'chamber-prestige',
      'force-map-exit',
      'map-jiaojiao',
      'force-jianzhanggong',
      'dowager-first-meet',
      'dowager-first-meet',
      'dowager-first-meet',
    ]);
    expect(steps.filter((step) => step.effect?.prestigeDelta === 10)).toHaveLength(1);
    expect(steps[0]?.effect?.prestigeDelta).toBeUndefined();
    expect(steps[1]?.effect?.prestigeDelta).toBe(10);
    expect(steps.map((step) => step.background).filter(Boolean)).toEqual([
      '/assets/routes/home/home_yeting_night%20till%20latenight.png',
      '/assets/routes/home/home_yeting_night%20till%20latenight.png',
      '/assets/routes/home/home_yeting_night%20till%20latenight.png',
      '/assets/map/map_spring_dawn.png',
      '/assets/map/map_spring_dawn.png',
      '/assets/routes/backgrounds/yushufang_outside_daytime.png',
      '/assets/routes/backgrounds/jianzhanggong_daytime.png',
      '/assets/routes/backgrounds/jianzhanggong_daytime.png',
    ]);
    expect(steps.at(-1)).toMatchObject({
      completesStory: true,
    });
    expect(steps.at(-1)?.portraitKey).toBeUndefined();
  });
});
