import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { FoundationConfigRegistry } from '../../src/modules/foundation/configRegistry';
import { FoundationRepository } from '../../src/modules/foundation/repository';
import { FoundationService } from '../../src/modules/foundation/service';

describe('fortune negative pregnancy integration', () => {
  it('福德<0时受孕判定100%失败，已孕次月必流产', async () => {
    const service = new FoundationService(new FoundationConfigRegistry(), new FoundationRepository(), pino({ enabled: false }));

    await service.initializeCharacter({
      characterId: 'u-int-1',
      routeId: 'lanyinxuguo',
      familyBackgroundId: 'merchant',
    });

    const minus = await service.adjustFortune({
      characterId: 'u-int-1',
      delta: -1,
      operator: 'test',
    });
    expect(minus.fortune).toBeLessThan(0);
    expect(service.canConceive(minus).allowed).toBe(false);

    // 模拟“已怀孕后次月触发必流产”
    minus.pregnant = true;
    minus.monthsPregnant = 1;

    const afterTick = await service.monthlyTick({ characterId: 'u-int-1' });
    expect(afterTick.pregnant).toBe(false);
    expect(afterTick.monthsPregnant).toBe(0);
  });
});
