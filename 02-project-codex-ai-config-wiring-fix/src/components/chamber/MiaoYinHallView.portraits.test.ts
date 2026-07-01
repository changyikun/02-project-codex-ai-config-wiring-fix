import { describe, expect, it } from 'vitest';
import {
  MIAOYIN_DANCER_PORTRAIT_SRC,
  MIAOYIN_MUSICIAN_PORTRAIT_SRC,
} from './MiaoYinHallView';

describe('MiaoYinHallView portraits', () => {
  it('uses the twin sibling portraits for the musician brother and dancer sister', () => {
    expect(MIAOYIN_MUSICIAN_PORTRAIT_SRC).toBe('/assets/characters/men/yueshi.png');
    expect(MIAOYIN_DANCER_PORTRAIT_SRC).toBe('/assets/characters/women/wuzhe.png');
  });
});
