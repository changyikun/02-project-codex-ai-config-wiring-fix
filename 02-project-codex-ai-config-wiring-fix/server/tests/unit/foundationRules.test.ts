import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { FoundationConfigRegistry } from '../../src/modules/foundation/configRegistry';
import { FoundationRepository } from '../../src/modules/foundation/repository';
import { FoundationService } from '../../src/modules/foundation/service';

describe('foundation config rules', () => {
  it('覆盖13档家世初始值并保持升序', async () => {
    const registry = new FoundationConfigRegistry();
    const config = await registry.getFamilyBackgrounds();
    expect(config).toHaveLength(13);
    for (let index = 1; index < config.length; index += 1) {
      expect(config[index].order).toBeGreaterThan(config[index - 1].order);
    }
    expect(config[0].name).toBe('商贾之女');
  });

  it('异国贡女与五品家世等价', async () => {
    const registry = new FoundationConfigRegistry();
    const config = await registry.getFamilyBackgrounds();
    const five = config.find((item) => item.id === 'official_5');
    const tribute = config.find((item) => item.id === 'foreign_tribute');
    expect(five).toBeDefined();
    expect(tribute).toBeDefined();
    expect(tribute?.effectiveOrder).toBe(five?.effectiveOrder);
  });

  it('罪臣之后通关后自动重写到四品', async () => {
    const service = new FoundationService(new FoundationConfigRegistry(), new FoundationRepository(), pino({ enabled: false }));
    const init = await service.initializeCharacter({
      characterId: 'u-rule-1',
      routeId: 'yingluoyeting',
      familyBackgroundId: 'traitor_descendant',
    });
    expect(init.familyBackgroundId).toBe('traitor_descendant');
    const rewritten = await service.markLineClearRewrite('u-rule-1');
    expect(rewritten.familyBackgroundId).toBe('official_4');
  });
});
