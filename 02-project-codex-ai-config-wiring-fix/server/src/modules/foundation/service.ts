import { FoundationConfigRegistry } from './configRegistry';
import { FoundationRepository } from './repository';
import type {
  CharacterInitPayload,
  CharacterState,
  FortuneAdjustPayload,
  FortuneBatchAdjustPayload,
  MonthlyTickPayload,
  PromotionContext,
  RankCap,
  RouteStressConfig,
} from './types';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const isForeignBloodline = (character: CharacterState): boolean => character.bloodline === 'foreign';

export class FoundationService {
  constructor(
    private readonly registry: FoundationConfigRegistry,
    private readonly repository: FoundationRepository,
    private readonly logger: {
      info: (...args: unknown[]) => void;
      warn: (...args: unknown[]) => void;
      error: (...args: unknown[]) => void;
    },
  ) {}

  async getConfigSnapshot() {
    return this.registry.load();
  }

  async reloadConfig(operator = 'system') {
    const state = await this.registry.reload();
    await this.repository.appendAudit({
      characterId: 'global',
      action: 'line.reload',
      operator,
      details: { loadedAt: state.loadedAt },
    });
    return state;
  }

  async upsertRouteStressConfig(config: RouteStressConfig, operator = 'gm') {
    await this.registry.upsertRouteStress(config);
    await this.repository.appendAudit({
      characterId: 'global',
      action: 'line.reload',
      operator,
      details: { routeId: config.routeId, mode: 'upsert' },
    });
    return this.registry.load();
  }

  async initializeCharacter(payload: CharacterInitPayload): Promise<CharacterState> {
    const family = await this.registry.getFamilyBackgrounds();
    const matched = family.find((item) => item.id === payload.familyBackgroundId);
    if (!matched) {
      throw new Error('FAMILY_BACKGROUND_NOT_FOUND');
    }
    if (matched.lineRestriction !== 'all' && matched.lineRestriction !== payload.routeId) {
      throw new Error('FAMILY_BACKGROUND_ROUTE_RESTRICTED');
    }

    const now = new Date().toISOString();
    const character: CharacterState = {
      characterId: payload.characterId,
      routeId: payload.routeId,
      familyBackgroundId: payload.familyBackgroundId,
      bloodline: matched.bloodline,
      fortune: 0,
      stress: 0,
      pregnant: false,
      monthsPregnant: 0,
      inCrownPrincePool: false,
      prestige: matched.initialPrestige,
      resources: matched.initialResource,
      currentRank: matched.startingRank,
      routeFlags: {
        chenyuansucuoCompleted: payload.routeFlags?.chenyuansucuoCompleted ?? false,
      },
      verifiedBloodlineReplacement: false,
      createdAt: now,
      updatedAt: now,
    };

    await this.repository.transaction(async (tx) => {
      await tx.upsertCharacter(character);
      await tx.appendSnapshot({
        characterId: character.characterId,
        node: 'entry',
        createdAt: now,
        payload: character,
      });
    });
    return character;
  }

  async getCharacter(characterId: string): Promise<CharacterState> {
    const character = await this.repository.getCharacter(characterId);
    if (!character) {
      throw new Error('CHARACTER_NOT_FOUND');
    }
    return character;
  }

  async adjustFortune(payload: FortuneAdjustPayload): Promise<CharacterState> {
    if (payload.delta !== 1 && payload.delta !== -1) {
      throw new Error('FORTUNE_SINGLE_DELTA_INVALID');
    }
    return this.adjustFortuneInternal(payload.characterId, payload.delta, payload.operator, 'fortune.adjust.single');
  }

  async batchAdjustFortune(payload: FortuneBatchAdjustPayload): Promise<CharacterState[]> {
    const adjusted: CharacterState[] = [];
    await this.repository.transaction(async () => {
      for (const item of payload.items) {
        if (![-20, -1, 1, 20].includes(item.delta) && Math.abs(item.delta) > 20) {
          throw new Error('FORTUNE_BATCH_DELTA_INVALID');
        }
        adjusted.push(
          await this.adjustFortuneInternal(item.characterId, item.delta, payload.operator, 'fortune.adjust.batch', false),
        );
      }
    });
    return adjusted;
  }

  async monthlyTick(payload: MonthlyTickPayload): Promise<CharacterState> {
    const character = await this.getCharacter(payload.characterId);
    const routeStressConfig = await this.registry.getRouteStressConfig(character.routeId);
    if (!routeStressConfig) {
      throw new Error('ROUTE_STRESS_CONFIG_NOT_FOUND');
    }

    const next = this.applyStress(character, routeStressConfig, payload.reliefApplied ?? 0);
    if (next.fortune < 0) {
      next.pregnant = false;
      next.monthsPregnant = 0;
    } else if (next.pregnant) {
      next.monthsPregnant += 1;
    }
    if (next.stress >= 100) {
      await this.repository.appendSnapshot({
        characterId: next.characterId,
        node: 'ending',
        createdAt: new Date().toISOString(),
        payload: next,
      });
    }
    await this.repository.upsertCharacter(next);
    return next;
  }

  canConceive(character: CharacterState): { allowed: boolean; reason?: string } {
    if (character.fortune < 0) {
      return { allowed: false, reason: 'FORTUNE_NEGATIVE_CONCEPTION_BLOCKED' };
    }
    return { allowed: true };
  }

  validatePromotion(context: PromotionContext): { allowed: boolean; maxRank: RankCap; reason?: string } {
    const character = context.character;
    const foreign = isForeignBloodline(character);

    if (context.targetRank === '皇后') {
      if (!foreign) {
        return { allowed: true, maxRank: '皇后' };
      }
      if (character.familyBackgroundId === 'heqin_princess' && character.routeFlags.chenyuansucuoCompleted) {
        return { allowed: true, maxRank: '皇后' };
      }
      return { allowed: false, maxRank: '皇贵妃', reason: 'FOREIGN_BLOODLINE_EMPRESS_RESTRICTED' };
    }

    if (!foreign) {
      return { allowed: true, maxRank: '皇后' };
    }
    if (context.queenVacant || context.queenIllOrOutOfFavor) {
      return { allowed: true, maxRank: '皇贵妃' };
    }
    if (context.targetRank === '皇贵妃') {
      return { allowed: false, maxRank: '贵妃', reason: 'FOREIGN_BLOODLINE_CAP_GUIFEI' };
    }
    return { allowed: true, maxRank: '贵妃' };
  }

  validateCrownPrinceCandidate(character: CharacterState): { allowed: boolean; reason?: string } {
    if (!isForeignBloodline(character)) {
      return { allowed: true };
    }
    if (!character.verifiedBloodlineReplacement) {
      return { allowed: false, reason: 'FOREIGN_BLOODLINE_HEIR_FORBIDDEN' };
    }
    return { allowed: true };
  }

  async markLineClearRewrite(characterId: string): Promise<CharacterState> {
    const character = await this.getCharacter(characterId);
    if (character.familyBackgroundId !== 'traitor_descendant') {
      return character;
    }
    character.familyBackgroundId = 'official_4';
    character.updatedAt = new Date().toISOString();
    await this.repository.upsertCharacter(character);
    await this.repository.appendSnapshot({
      characterId: character.characterId,
      node: 'promotion',
      createdAt: character.updatedAt,
      payload: character,
    });
    return character;
  }

  async rollback(snapshotId: string, operator: string): Promise<CharacterState> {
    const snapshot = await this.repository.getSnapshot(snapshotId);
    if (!snapshot) {
      throw new Error('SNAPSHOT_NOT_FOUND');
    }
    if (Date.now() - new Date(snapshot.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000) {
      throw new Error('SNAPSHOT_EXPIRED');
    }
    await this.repository.upsertCharacter(snapshot.payload);
    await this.repository.appendAudit({
      characterId: snapshot.characterId,
      action: 'rollback',
      operator,
      details: { snapshotId },
    });
    return snapshot.payload;
  }

  private applyStress(character: CharacterState, routeStressConfig: RouteStressConfig, reliefApplied: number): CharacterState {
    const delta = routeStressConfig.baseStressIncreasePerMonth - clamp(reliefApplied, 0, routeStressConfig.reliefThreshold);
    const stress = clamp(character.stress + delta, 0, 100);
    return {
      ...character,
      stress,
      updatedAt: new Date().toISOString(),
    };
  }

  private async adjustFortuneInternal(
    characterId: string,
    delta: number,
    operator: string,
    action: 'fortune.adjust.single' | 'fortune.adjust.batch',
    wrapInTransaction = true,
  ): Promise<CharacterState> {
    const work = async (): Promise<CharacterState> => {
      const character = await this.getCharacter(characterId);
      character.fortune = clamp(character.fortune + delta, -20, 20);
      character.updatedAt = new Date().toISOString();

      if (character.fortune < 0 && character.pregnant) {
        character.pregnant = false;
        character.monthsPregnant = 0;
        await this.repository.appendSnapshot({
          characterId: character.characterId,
          node: 'miscarriage',
          createdAt: character.updatedAt,
          payload: character,
        });
      }
      await this.repository.upsertCharacter(character);
      await this.repository.appendAudit({
        characterId,
        action,
        operator,
        delta,
      });
      return character;
    };

    if (!wrapInTransaction) {
      return work();
    }
    return this.repository.transaction(work);
  }
}
