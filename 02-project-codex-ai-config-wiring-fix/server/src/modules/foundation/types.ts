export type RouteId = 'lanyinxuguo' | 'fushengrumeng' | 'yingluoyeting' | 'chenyuansucuo';

export type Bloodline = 'han' | 'foreign';
export type RoleNode = 'entry' | 'promotion' | 'birth' | 'miscarriage' | 'ending';
export type RankCap = '贵妃' | '皇贵妃' | '皇后';

export interface FamilyBackgroundConfig {
  id: string;
  name: string;
  order: number;
  effectiveOrder: number;
  bloodline: Bloodline;
  lineRestriction: RouteId | 'all';
  initialPrestige: number;
  initialResource: number;
  startingRank: string;
  eventWeight: number;
  equivalentTo?: string;
  clearRewardRewriteTo?: string;
}

export interface RouteStressConfig {
  routeId: RouteId;
  routeName: string;
  baseStressIncreasePerMonth: number;
  reliefThreshold: number;
}

export interface CharacterState {
  characterId: string;
  routeId: RouteId;
  familyBackgroundId: string;
  bloodline: Bloodline;
  fortune: number;
  stress: number;
  pregnant: boolean;
  monthsPregnant: number;
  inCrownPrincePool: boolean;
  prestige: number;
  resources: number;
  currentRank: string;
  routeFlags: {
    chenyuansucuoCompleted: boolean;
  };
  verifiedBloodlineReplacement: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SnapshotRecord {
  snapshotId: string;
  characterId: string;
  node: RoleNode;
  createdAt: string;
  payload: CharacterState;
}

export interface AuditLogRecord {
  auditId: string;
  characterId: string;
  action: 'fortune.adjust.single' | 'fortune.adjust.batch' | 'rollback' | 'line.reload';
  operator: string;
  delta?: number;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface CharacterInitPayload {
  characterId: string;
  routeId: RouteId;
  familyBackgroundId: string;
  routeFlags?: {
    chenyuansucuoCompleted?: boolean;
  };
}

export interface FortuneAdjustPayload {
  characterId: string;
  delta: number;
  operator: string;
}

export interface FortuneBatchAdjustPayload {
  operator: string;
  items: Array<{
    characterId: string;
    delta: number;
  }>;
}

export interface MonthlyTickPayload {
  characterId: string;
  reliefApplied?: number;
}

export interface PromotionContext {
  character: CharacterState;
  queenVacant: boolean;
  queenIllOrOutOfFavor: boolean;
  targetRank: RankCap;
}
