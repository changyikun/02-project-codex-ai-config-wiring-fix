import { CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN } from './consortVisitRuntime';
import { requireNonConsortNpcProfile } from '../npcs/npcCatalog';
import type { PermanentNpcInteractionActionId, PermanentNpcRelationshipState } from '../types';

export const PERMANENT_NPC_INTERACTION_ACTION_LIMIT_PER_XUN = CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN;

const duNiangProfile = requireNonConsortNpcProfile('du-niang');
const liGonggongProfile = requireNonConsortNpcProfile('li-gonggong');
const miaoYinMusicianProfile = requireNonConsortNpcProfile('miaoyin-musician');
const miaoYinDancerProfile = requireNonConsortNpcProfile('miaoyin-dancer');

export const DU_NIANG_NPC_ID = duNiangProfile.npcId;
export const DU_NIANG_NPC_NAME = duNiangProfile.displayName;
export const DU_NIANG_FRIENDSHIP_PRICE_AFFINITY = 60;
export const DU_NIANG_FRIENDSHIP_BUY_RATE = 0.85;
export const DU_NIANG_FRIENDSHIP_SELL_RATE = 1.1;
export const LI_GONGGONG_NPC_ID = liGonggongProfile.npcId;
export const LI_GONGGONG_NPC_NAME = liGonggongProfile.displayName;
export const MIAOYIN_MUSICIAN_NPC_ID = miaoYinMusicianProfile.npcId;
export const MIAOYIN_MUSICIAN_NPC_NAME = miaoYinMusicianProfile.displayName;
export const MIAOYIN_DANCER_NPC_ID = miaoYinDancerProfile.npcId;
export const MIAOYIN_DANCER_NPC_NAME = miaoYinDancerProfile.displayName;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.floor(value)));

export const createPermanentNpcRelationship = (
  npcId: string,
  npcName: string,
  xunKey: string,
): PermanentNpcRelationshipState => ({
  npcId,
  npcName,
  met: false,
  affinity: 0,
  xunKey,
  actionCountThisXun: 0,
});

export const normalizePermanentNpcRelationshipForXun = (
  relationship: PermanentNpcRelationshipState | undefined,
  npcId: string,
  npcName: string,
  xunKey: string,
): PermanentNpcRelationshipState => {
  const current = relationship ?? createPermanentNpcRelationship(npcId, npcName, xunKey);
  if (current.xunKey === xunKey) {
    return current;
  }
  return {
    ...current,
    xunKey,
    actionCountThisXun: 0,
    lastActionId: undefined,
  };
};

export const markPermanentNpcMet = (relationship: PermanentNpcRelationshipState): PermanentNpcRelationshipState => ({
  ...relationship,
  met: true,
});

export const applyPermanentNpcAffinityDelta = (
  relationship: PermanentNpcRelationshipState,
  delta: number,
): PermanentNpcRelationshipState => ({
  ...relationship,
  affinity: clamp(relationship.affinity + delta, 0, 100),
});

export const recordPermanentNpcInteractionAction = (
  relationship: PermanentNpcRelationshipState,
  actionId: PermanentNpcInteractionActionId,
  limit = PERMANENT_NPC_INTERACTION_ACTION_LIMIT_PER_XUN,
): { relationship: PermanentNpcRelationshipState; success: boolean; actionCountThisXun: number; actionLimitHit: boolean } => {
  if (relationship.actionCountThisXun >= limit) {
    return {
      relationship,
      success: false,
      actionCountThisXun: relationship.actionCountThisXun,
      actionLimitHit: true,
    };
  }
  const nextCount = relationship.actionCountThisXun + 1;
  return {
    relationship: {
      ...relationship,
      actionCountThisXun: nextCount,
      lastActionId: actionId,
    },
    success: true,
    actionCountThisXun: nextCount,
    actionLimitHit: false,
  };
};

export const hasDuNiangFriendshipPrice = (relationship: PermanentNpcRelationshipState): boolean =>
  relationship.affinity >= DU_NIANG_FRIENDSHIP_PRICE_AFFINITY;

export const resolveDuNiangBuyPrice = (basePrice: number, relationship: PermanentNpcRelationshipState): number =>
  Math.max(1, Math.floor(basePrice * (hasDuNiangFriendshipPrice(relationship) ? DU_NIANG_FRIENDSHIP_BUY_RATE : 1)));

export const resolveDuNiangSellPrice = (basePrice: number, relationship: PermanentNpcRelationshipState): number =>
  Math.max(0, Math.floor(basePrice * (hasDuNiangFriendshipPrice(relationship) ? DU_NIANG_FRIENDSHIP_SELL_RATE : 1)));
