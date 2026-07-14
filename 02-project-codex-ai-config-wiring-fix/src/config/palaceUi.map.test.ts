import { describe, expect, it } from 'vitest';
import { buildMapHotspots, CHAMBER_SIDEBAR_BUTTONS, MAP_SIDEBAR_BUTTONS, resolveMapBackgroundImage } from './palaceUi';

describe('palace map UI configuration', () => {
  it.each([
    ['清晨', '/assets/map/map_spring_dawn.png'],
    ['上午', '/assets/map/map_spring_latemorning.png'],
    ['中午', '/assets/map/map_spring_noon.png'],
    ['下午', '/assets/map/map_spring_afternoon.png'],
    ['傍晚', '/assets/map/map_spring_dusk.png'],
    ['夜晚', '/assets/map/map_spring_night.png'],
    ['深夜', '/assets/map/map_spring_latenight.png'],
  ] as const)('maps %s to the matching spring map background', (slot, expected) => {
    expect(resolveMapBackgroundImage(slot)).toBe(expected);
  });

  it('keeps Yeting as a normal map location instead of the player residence hotspot', () => {
    const hotspots = buildMapHotspots('储秀宫西偏殿');
    const yeting = hotspots.find((hotspot) => hotspot.id === '掖庭院');

    expect(yeting).toMatchObject({
      label: '掖庭',
      top: '64.5%',
      left: '81.7%',
    });
    expect(hotspots.some((hotspot) => hotspot.id === '椒房殿' || hotspot.label === '椒房殿')).toBe(false);
  });

  it('does not expose Changchun Palace on the main map', () => {
    expect(buildMapHotspots('储秀宫西偏殿').some((hotspot) => hotspot.id === '长春宫' || hotspot.label === '长春宫')).toBe(
      false,
    );
  });

  it('labels the left sidebar stats entry as attributes', () => {
    expect(MAP_SIDEBAR_BUTTONS.find((button) => button.id === 'stats')?.label).toBe('属性');
    expect(CHAMBER_SIDEBAR_BUTTONS.find((button) => button.id === 'stats')?.label).toBe('属性');
  });
});
