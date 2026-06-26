import { describe, expect, it } from 'vitest';
import { LOCATION_SCENE_BACKGROUNDS } from './locationSceneBackgrounds';

describe('LOCATION_SCENE_BACKGROUNDS', () => {
  it('uses dedicated daytime scene images for public locations', () => {
    expect(LOCATION_SCENE_BACKGROUNDS['宫门']).toBe('/assets/routes/backgrounds/gongmen_daytime.png');
    expect(LOCATION_SCENE_BACKGROUNDS['太医院']).toBe('/assets/routes/backgrounds/taiyiyuan_daytime.png');
    expect(LOCATION_SCENE_BACKGROUNDS['养心殿']).toBe('/assets/routes/backgrounds/yangxindian_outside_daytime.png');
    expect(LOCATION_SCENE_BACKGROUNDS['御膳房']).toBe('/assets/routes/backgrounds/yushanfang_daytime.png');
    expect(LOCATION_SCENE_BACKGROUNDS['正阳门']).toBe('/assets/routes/backgrounds/zhengyangmen_daytime.png');
    expect(LOCATION_SCENE_BACKGROUNDS['妙音堂']).toBe('/assets/routes/backgrounds/miaoyintang_daytime.png');
    expect(LOCATION_SCENE_BACKGROUNDS['御花园']).toBe('/assets/routes/backgrounds/yuhuayuan_daytime.png');
    expect(LOCATION_SCENE_BACKGROUNDS['华清池']).toBe('/assets/routes/backgrounds/huaqingchi_daytime.png');
    expect(LOCATION_SCENE_BACKGROUNDS['宝华殿']).toBe('/assets/routes/backgrounds/baohuadian_outside_daytime.png');
  });
});
