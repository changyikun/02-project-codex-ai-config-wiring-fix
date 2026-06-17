import type { TempleAmbientRequestPayload } from '../../ai/templeAmbientAgent';
import { renderNarrativeText } from '../narrative/narrativeCatalog';

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 23), 0);

const variantCountByAction: Record<TempleAmbientRequestPayload['action'], number> = {
  worship: 3,
  pray: 3,
  'stroll-idle': 4,
};

const pickVariant = (payload: TempleAmbientRequestPayload): number => {
  const count = variantCountByAction[payload.action];
  const seed = `${payload.routeId}:${payload.timeContext.year}-${payload.timeContext.month}-${payload.timeContext.xun}:${payload.timeContext.slotIndex}:${payload.action}:${payload.stateHint ?? ''}`;
  return hashSeed(seed) % count;
};

export const requestTempleAmbientLocal = async (
  payload: TempleAmbientRequestPayload,
): Promise<string> => {
  return renderNarrativeText(`location.ambient.baohua-hall.${payload.action}.${pickVariant(payload)}`);
};
