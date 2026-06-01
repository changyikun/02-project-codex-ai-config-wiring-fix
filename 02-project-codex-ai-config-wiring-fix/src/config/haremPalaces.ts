import type { MapAreaId } from '../game/types';
import { HAREM_OVERVIEW_BACKGROUND, LOCATION_SCENE_BACKGROUNDS } from './locationSceneBackgrounds';

const HAREM_PALACE_IDS = [
  '储秀宫',
  '长春宫',
  '启祥宫',
  '钟粹宫',
  '昭阳宫',
  '玉清宫',
  '永宁宫',
  '永和宫',
  '延禧宫',
  '临华殿',
  '昭华殿',
  '披香殿',
] as const satisfies readonly MapAreaId[];

export type HaremPalaceId = (typeof HAREM_PALACE_IDS)[number];

export interface HaremHallConfig {
  id: 'main' | 'east-side' | 'west-side' | 'east-wing' | 'center-wing' | 'west-wing';
  prefix: string;
  suffix: string;
}

export interface HaremPalaceConfig {
  id: HaremPalaceId;
  label: string;
  background: string;
  halls: readonly HaremHallConfig[];
}

const createHallSet = (label: string): readonly HaremHallConfig[] => {
  const prefix = label;
  return [
    { id: 'main', prefix, suffix: '主殿' },
    { id: 'east-side', prefix, suffix: '东侧殿' },
    { id: 'west-side', prefix, suffix: '西侧殿' },
    { id: 'east-wing', prefix, suffix: '东偏殿' },
    { id: 'center-wing', prefix, suffix: '中偏殿' },
    { id: 'west-wing', prefix, suffix: '西偏殿' },
  ] as const;
};

export const HAREM_PALACES: readonly HaremPalaceConfig[] = HAREM_PALACE_IDS.map((id) => ({
  id,
  label: id,
  background: LOCATION_SCENE_BACKGROUNDS[id] ?? HAREM_OVERVIEW_BACKGROUND,
  halls: createHallSet(id),
}));
