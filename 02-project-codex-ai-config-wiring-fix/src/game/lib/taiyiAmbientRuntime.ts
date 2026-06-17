import type { TaiyiAmbientRequestPayload } from '../../ai/taiyiAmbientAgent';
import { renderNarrativeText } from '../narrative/narrativeCatalog';

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 29), 0);

const variantCountByAction: Record<TaiyiAmbientRequestPayload['action'], number> = {
  'stroll-idle': 4,
  consult: 3,
};

const pickVariant = (payload: TaiyiAmbientRequestPayload): number => {
  const count = variantCountByAction[payload.action];
  const seed = `${payload.routeId}:${payload.timeContext.year}-${payload.timeContext.month}-${payload.timeContext.xun}:${payload.timeContext.slotIndex}:${payload.action}:${payload.stateHint ?? ''}`;
  return hashSeed(seed) % count;
};

export const requestTaiyiAmbientLocal = async (
  payload: TaiyiAmbientRequestPayload,
): Promise<string> => {
  return renderNarrativeText(`location.ambient.tai-hospital.${payload.action}.${pickVariant(payload)}`);
};
