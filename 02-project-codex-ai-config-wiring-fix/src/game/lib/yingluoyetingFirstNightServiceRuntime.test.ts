import { describe, expect, it } from 'vitest';

import {
  buildYingluoyetingFirstNightServiceSteps,
  formatChineseAge,
  YINGLUOYETING_FIRST_NIGHT_SERVICE_SCRIPT_ID,
} from './yingluoyetingFirstNightServiceRuntime';

describe('yingluoyeting first night service runtime', () => {
  it('keeps the scripted CG order from the first-night file', () => {
    const steps = buildYingluoyetingFirstNightServiceSteps({
      playerName: '柳如是',
      rankLabel: '官女子',
      age: 20,
    });

    expect(YINGLUOYETING_FIRST_NIGHT_SERVICE_SCRIPT_ID).toBe('yingluoyeting-first-night-service');
    expect(steps.map((step) => step.background).filter((background, index, all) => all.indexOf(background) === index)).toEqual([
      '/assets/routes/home/home_yeting_night%20till%20latenight.png',
      '/assets/routes/backgrounds/hougong_outside_night.png',
      '/assets/routes/backgrounds/encounter_guard.png',
      '/assets/routes/backgrounds/yangxindian_outside_night.png',
      '/assets/routes/backgrounds/yangxindian_inside_night.png',
      '/assets/routes/backgrounds/shiqin.png',
      '/assets/routes/backgrounds/shiqin_first.png',
    ]);
    expect(steps.at(-1)).toMatchObject({
      transition: 'black',
      completesStory: true,
    });
  });

  it('replaces player name, surname, rank, and age while preserving script wording', () => {
    const allText = buildYingluoyetingFirstNightServiceSteps({
      playerName: '柳如是',
      rankLabel: '官女子',
      age: 20,
    })
      .map((step) => step.text)
      .join('\n');

    expect(allText).toContain('陛下口谕，宣官女子柳如是今夜往养心殿侍寝。');
    expect(allText).toContain('柳小主请');
    expect(allText).toContain('柳小主，到了。');
    expect(allText).toContain('官女子柳如是，觐见——');
    expect(allText).toContain('臣妾柳如是，参见陛下。');
    expect(allText).toContain('回陛下，二十。');
    expect(allText).not.toContain('官女子沉璧');
    expect(allText).not.toContain('沉小主');
    expect(allText).not.toContain('臣妾沉璧');
    expect(allText).not.toContain('回陛下，十七。');
  });

  it('does not display brace-wrapped development directions as story text', () => {
    const allText = buildYingluoyetingFirstNightServiceSteps({
      playerName: '柳如是',
      rankLabel: '官女子',
      age: 20,
    })
      .map((step) => step.text)
      .join('\n');

    expect(allText).not.toContain('{');
    expect(allText).not.toContain('}');
    expect(allText).not.toContain('侍寝剧情开始');
    expect(allText).not.toContain('注意这里年龄');
  });

  it('uses the latest first-night script paragraph splits', () => {
    const allText = buildYingluoyetingFirstNightServiceSteps({
      playerName: '柳如是',
      rankLabel: '官女子',
      age: 20,
    })
      .map((step) => step.text)
      .join('\n');

    expect(allText).toContain('月白色的襦裙垂到脚面，裙摆绣着几枝淡蓝色的忍冬花，随着动作微微摇晃。\n<<PAGE_BREAK>>\n娇娇凑过来，往你衣领边轻轻按了按');
    expect(allText).toContain('一队巡夜的侍卫从拐角转出来。四人成列，步伐整齐，腰间佩刀的刀鞘随步伐轻轻晃动。\n<<PAGE_BREAK>>\n夜色里看不太清面目，但为首那人——你的目光几乎是本能地被牵了过去。\n<<PAGE_BREAK>>\n他比身后的人高出小半个头');
    expect(allText).toContain('回陛下，是……臣妾幼时家中请了舞师，后来又跟着妙音堂的姑姑们练了些日子。');
  });

  it('formats player ages as Chinese numerals', () => {
    expect(formatChineseAge(15)).toBe('十五');
    expect(formatChineseAge(17)).toBe('十七');
    expect(formatChineseAge(20)).toBe('二十');
    expect(formatChineseAge(23)).toBe('二十三');
  });
});
