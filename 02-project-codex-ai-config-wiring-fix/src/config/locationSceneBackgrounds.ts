import type { MapAreaId, TimeSlot } from '../game/types';

export const HAREM_OVERVIEW_BACKGROUND = '/assets/routes/backgrounds/hougong_daytime.png';
export const HAREM_OUTSIDE_BACKGROUND = '/assets/routes/backgrounds/hougong_outside_daytime.png';
export const CONSORT_AUDIENCE_BACKGROUND = '/assets/routes/backgrounds/zhudian_daytime.png';
export const PLAYER_STATS_BACKGROUND = '/assets/ui/stats-ui.jpg';
export const CHRONICLE_UI_BACKGROUND = '/assets/ui/chronicle-ui.jpg';
export const MISC_INFO_UI_BACKGROUND = '/assets/ui/misc-ui.jpg';
export const BOND_UI_BACKGROUND = '/assets/ui/bond-ui.jpg';
export const AFFAIRS_UI_BACKGROUND = '/assets/ui/affairs-ui.jpg';
export const INVENTORY_UI_BACKGROUND = '/assets/ui/inventory-ui.jpg';
export const PLAYER_HOME_DAY_BACKGROUND = '/assets/routes/home/home_yeting_dawn%20till%20dask.png';
export const PLAYER_HOME_NIGHT_BACKGROUND = '/assets/routes/home/home_yeting_night%20till%20latenight.png';
export const PLAYER_HOME_BACKGROUND = PLAYER_HOME_DAY_BACKGROUND;

export const resolvePlayerHomeBackground = (slot: TimeSlot): string =>
  slot === '夜晚' || slot === '深夜' ? PLAYER_HOME_NIGHT_BACKGROUND : PLAYER_HOME_DAY_BACKGROUND;

const residenceBackground = PLAYER_HOME_BACKGROUND;
const locationBackground = '/assets/ui/map-bg.jpg';
const haremBackground = HAREM_OVERVIEW_BACKGROUND;
const affairsBackground = '/assets/ui/affairs-ui.jpg';
const coldPalaceBackground = '/assets/routes/backgrounds/lenggong_daytime.png';
const yetingBackground = '/assets/routes/backgrounds/yeting_daytime.png';
const jianzhangBackground = '/assets/routes/backgrounds/jianzhanggong_daytime.png';
const miaoyinBackground = '/assets/routes/backgrounds/miaoyintang_daytime.png';
const imperialGardenBackground = '/assets/routes/backgrounds/yuhuayuan_daytime.png';
const huaqingchiBackground = '/assets/routes/backgrounds/huaqingchi_daytime.png';
const gongmenBackground = '/assets/routes/backgrounds/gongmen_daytime.png';
const taiHospitalBackground = '/assets/routes/backgrounds/taiyiyuan_daytime.png';
const yangxinOutsideBackground = '/assets/routes/backgrounds/yangxindian_outside_daytime.png';
export const YANGXIN_VERDICT_BACKGROUND = '/assets/routes/backgrounds/yangxin_verdict_daytime.png';
const imperialKitchenBackground = '/assets/routes/backgrounds/yushanfang_daytime.png';
const zhengyangGateBackground = '/assets/routes/backgrounds/zhengyangmen_daytime.png';

export const LOCATION_SCENE_BACKGROUNDS: Partial<Record<MapAreaId, string>> = {
  宝华殿: locationBackground,
  储秀宫: residenceBackground,
  建章宫: jianzhangBackground,
  宫门: gongmenBackground,
  椒房殿: residenceBackground,
  掖庭院: yetingBackground,
  临华殿: residenceBackground,
  太医院: taiHospitalBackground,
  妙音堂: miaoyinBackground,
  冷宫: coldPalaceBackground,
  御膳房: imperialKitchenBackground,
  御花园: imperialGardenBackground,
  启祥宫: residenceBackground,
  正阳门: zhengyangGateBackground,
  重华宫: haremBackground,
  养心殿: yangxinOutsideBackground,
  华清池: huaqingchiBackground,
  永宁宫: residenceBackground,
  永和宫: residenceBackground,
  延禧宫: residenceBackground,
  玉清宫: residenceBackground,
  长春宫: residenceBackground,
  披香殿: residenceBackground,
  昭华殿: residenceBackground,
  昭阳宫: residenceBackground,
  钟粹宫: residenceBackground,
};
