import { describe, expect, it } from 'vitest';
import {
  HAREM_OUTSIDE_BACKGROUND,
  HAREM_OUTSIDE_NIGHT_BACKGROUND,
  LOCATION_SCENE_BACKGROUNDS,
  LOCATION_SCENE_NIGHT_BACKGROUNDS,
  resolveHaremOutsideBackground,
  resolveLocationSceneBackground,
  resolveYangxinInsideBackground,
} from './locationSceneBackgrounds';

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

  it('uses dedicated night scene images where night assets exist', () => {
    expect(LOCATION_SCENE_NIGHT_BACKGROUNDS['宫门']).toBe('/assets/routes/backgrounds/gongmen_night.png');
    expect(LOCATION_SCENE_NIGHT_BACKGROUNDS['建章宫']).toBe('/assets/routes/backgrounds/jianzhanggong_night.png');
    expect(LOCATION_SCENE_NIGHT_BACKGROUNDS['妙音堂']).toBe('/assets/routes/backgrounds/miaoyintang_night.png');
    expect(LOCATION_SCENE_NIGHT_BACKGROUNDS['掖庭院']).toBe('/assets/routes/backgrounds/yeting_night.png');
    expect(LOCATION_SCENE_NIGHT_BACKGROUNDS['御膳房']).toBe('/assets/routes/backgrounds/yushanfang_night.png');
    expect(LOCATION_SCENE_NIGHT_BACKGROUNDS['御花园']).toBe('/assets/routes/backgrounds/yuhuayuan_night.png');
    expect(LOCATION_SCENE_NIGHT_BACKGROUNDS['养心殿']).toBe('/assets/routes/backgrounds/yangxindian_outside_night.png');
  });

  it('resolves night slots to night images and falls back to daytime when missing', () => {
    expect(resolveLocationSceneBackground('宫门', '夜晚')).toBe('/assets/routes/backgrounds/gongmen_night.png');
    expect(resolveLocationSceneBackground('妙音堂', '深夜')).toBe('/assets/routes/backgrounds/miaoyintang_night.png');
    expect(resolveLocationSceneBackground('御膳房', '夜晚')).toBe('/assets/routes/backgrounds/yushanfang_night.png');
    expect(resolveLocationSceneBackground('太医院', '深夜')).toBe('/assets/routes/backgrounds/taiyiyuan_daytime.png');
    expect(resolveLocationSceneBackground('宫门', '上午')).toBe('/assets/routes/backgrounds/gongmen_daytime.png');
  });

  it('resolves harem outside day and night images', () => {
    expect(resolveHaremOutsideBackground('上午')).toBe(HAREM_OUTSIDE_BACKGROUND);
    expect(resolveHaremOutsideBackground('夜晚')).toBe(HAREM_OUTSIDE_NIGHT_BACKGROUND);
    expect(resolveHaremOutsideBackground('深夜')).toBe(HAREM_OUTSIDE_NIGHT_BACKGROUND);
  });

  it('resolves yangxin interior day and night images', () => {
    expect(resolveYangxinInsideBackground('上午')).toBe('/assets/routes/backgrounds/yangxindian_inside_daytime.png');
    expect(resolveYangxinInsideBackground('夜晚')).toBe('/assets/routes/backgrounds/yangxindian_inside_night.png');
    expect(resolveYangxinInsideBackground('深夜')).toBe('/assets/routes/backgrounds/yangxindian_inside_night.png');
  });
});
