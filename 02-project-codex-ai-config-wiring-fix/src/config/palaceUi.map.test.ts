import { describe, expect, it } from 'vitest';
import { buildMapHotspots, resolveMapBackgroundImage } from './palaceUi';

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
      label: '掖庭院',
      top: '78.5%',
      left: '13.2%',
    });
    expect(hotspots.find((hotspot) => hotspot.id === '椒房殿')?.label).toBe('椒房殿');
  });

  it('does not expose Changchun Palace on the main map', () => {
    expect(buildMapHotspots('储秀宫西偏殿').some((hotspot) => hotspot.id === '长春宫' || hotspot.label === '长春宫')).toBe(
      false,
    );
  });
});
