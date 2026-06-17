import type { MiaoYinAmbientRequestPayload } from '../../ai/miaoyinAmbientAgent';
import { renderNarrativeText } from '../narrative/narrativeCatalog';

const hashSeed = (seed: string): number =>
  seed.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 33), 0);

const variantCountByAction: Record<MiaoYinAmbientRequestPayload['action'], number> = {
  listen: 3,
  'stroll-idle': 4,
  'sign-up': 3,
};

const pickVariant = (payload: MiaoYinAmbientRequestPayload): number => {
  const count = variantCountByAction[payload.action];
  const seed = `${payload.routeId}:${payload.timeContext.year}-${payload.timeContext.month}-${payload.timeContext.xun}:${payload.timeContext.slotIndex}:${payload.action}:${payload.stateHint ?? ''}`;
  return hashSeed(seed) % count;
};

export const requestMiaoYinAmbientLocal = async (
  payload: MiaoYinAmbientRequestPayload,
): Promise<string> => {
  return renderNarrativeText(`location.ambient.miaoyin-hall.${payload.action}.${pickVariant(payload)}`);
};
