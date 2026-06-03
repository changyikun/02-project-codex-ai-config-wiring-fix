import type { MapAreaId } from '../game/types';

export const HAREM_OVERVIEW_BACKGROUND = '/assets/ui/consorts-ui.jpg';
export const PLAYER_STATS_BACKGROUND = '/assets/ui/stats-ui.jpg';
export const CHRONICLE_UI_BACKGROUND = '/assets/ui/chronicle-ui.jpg';
export const MISC_INFO_UI_BACKGROUND = '/assets/ui/misc-ui.jpg';
export const BOND_UI_BACKGROUND = '/assets/ui/bond-ui.jpg';
export const AFFAIRS_UI_BACKGROUND = '/assets/ui/affairs-ui.jpg';
export const INVENTORY_UI_BACKGROUND = '/assets/ui/inventory-ui.jpg';
export const PLAYER_HOME_BACKGROUND = '/assets/routes/home/home_yeting_dawn%20till%20dask.png';

const residenceBackground = PLAYER_HOME_BACKGROUND;
const locationBackground = '/assets/ui/map-bg.jpg';
const haremBackground = '/assets/ui/consorts-ui.jpg';
const affairsBackground = '/assets/ui/affairs-ui.jpg';

export const LOCATION_SCENE_BACKGROUNDS: Partial<Record<MapAreaId, string>> = {
  宝华殿: locationBackground,
  储秀宫: residenceBackground,
  建章宫: locationBackground,
  宫门: locationBackground,
  椒房殿: residenceBackground,
  临华殿: residenceBackground,
  太医院: locationBackground,
  妙音堂: locationBackground,
  冷宫: affairsBackground,
  御膳房: locationBackground,
  御花园: locationBackground,
  启祥宫: residenceBackground,
  正阳门: locationBackground,
  重华宫: haremBackground,
  御书房: locationBackground,
  养心殿: locationBackground,
  华清池: locationBackground,
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
