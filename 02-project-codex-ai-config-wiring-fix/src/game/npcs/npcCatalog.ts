import type { MapAreaId, RouteId } from '../types';
import { parseBoolean, parseNumericCsv, parseOptionalNumber } from '../numerics/csvNumericLoader';
import nonConsortNpcProfilesCsv from './csv/non_consort_npc_profiles.csv?raw';

export type NonConsortNpcKind =
  | 'emperor'
  | 'dowager'
  | 'merchant'
  | 'eunuch'
  | 'musician'
  | 'dancer'
  | 'cook'
  | 'physician'
  | 'temple-attendant'
  | 'poison-merchant'
  | 'attendant'
  | 'court-official'
  | 'route-npc'
  | 'maid';

export type NonConsortNpcGender = 'male' | 'female' | 'unknown';
export type NonConsortNpcRouteScope = RouteId | 'all';

export interface NonConsortNpcProfile {
  npcId: string;
  displayName: string;
  identityLabel: string;
  npcKind: NonConsortNpcKind;
  gender: NonConsortNpcGender;
  routeScope: NonConsortNpcRouteScope;
  defaultLocationId?: MapAreaId;
  portraitKey: string;
  portraitSrc?: string;
  isRomanceable: boolean;
  bondTitle?: string;
  bondSceneType?: string;
  initialAffinity: number;
  personality: string;
  summary: string;
  notes?: string;
}

const requiredColumns = [
  'npcId',
  'displayName',
  'identityLabel',
  'npcKind',
  'gender',
  'routeScope',
  'defaultLocationId',
  'portraitKey',
  'portraitSrc',
  'isRomanceable',
  'bondTitle',
  'bondSceneType',
  'initialAffinity',
  'personality',
  'summary',
  'notes',
] as const;

const npcKinds = new Set<NonConsortNpcKind>([
  'emperor',
  'dowager',
  'merchant',
  'eunuch',
  'musician',
  'dancer',
  'cook',
  'physician',
  'temple-attendant',
  'poison-merchant',
  'attendant',
  'court-official',
  'route-npc',
  'maid',
]);
const genders = new Set<NonConsortNpcGender>(['male', 'female', 'unknown']);
const routeScopes = new Set<NonConsortNpcRouteScope>(['all', 'lanyinxuguo', 'fushengrumeng', 'yingluoyeting', 'chenyuansucuo']);
const mapAreas = new Set<string>([
  '后宫',
  '御膳房',
  '建章宫',
  '御花园',
  '正阳门',
  '宫门',
  '冷宫',
  '养心殿',
  '太医院',
  '妙音堂',
  '宝华殿',
  '华清池',
  '重华宫',
  '椒房殿',
  '储秀宫',
  '掖庭院',
  '长春宫',
  '启祥宫',
  '延禧宫',
  '景仁宫',
  '翊坤宫',
  '永和宫',
  '承乾宫',
  '钟粹宫',
]);

const parseNpcKind = (value: string, npcId: string): NonConsortNpcKind => {
  if (npcKinds.has(value as NonConsortNpcKind)) {
    return value as NonConsortNpcKind;
  }
  throw new Error(`non_consort_npc_profiles.csv npc "${npcId}" has invalid npcKind "${value}".`);
};

const parseGender = (value: string, npcId: string): NonConsortNpcGender => {
  if (genders.has(value as NonConsortNpcGender)) {
    return value as NonConsortNpcGender;
  }
  throw new Error(`non_consort_npc_profiles.csv npc "${npcId}" has invalid gender "${value}".`);
};

const parseRouteScope = (value: string, npcId: string): NonConsortNpcRouteScope => {
  if (routeScopes.has(value as NonConsortNpcRouteScope)) {
    return value as NonConsortNpcRouteScope;
  }
  throw new Error(`non_consort_npc_profiles.csv npc "${npcId}" has invalid routeScope "${value}".`);
};

const parseLocation = (value: string, npcId: string): MapAreaId | undefined => {
  if (!value) {
    return undefined;
  }
  if (mapAreas.has(value as MapAreaId)) {
    return value as MapAreaId;
  }
  throw new Error(`non_consort_npc_profiles.csv npc "${npcId}" has invalid defaultLocationId "${value}".`);
};

const parseProfiles = (): NonConsortNpcProfile[] => {
  const rows = parseNumericCsv(nonConsortNpcProfilesCsv, 'non_consort_npc_profiles.csv', requiredColumns);
  const ids = new Set<string>();
  return rows.map((row) => {
    const npcId = row.npcId;
    if (!npcId) {
      throw new Error('non_consort_npc_profiles.csv contains an empty npcId.');
    }
    if (npcId.startsWith('npc-')) {
      throw new Error(`non_consort_npc_profiles.csv npc "${npcId}" uses a legacy npc-* id.`);
    }
    if (ids.has(npcId)) {
      throw new Error(`non_consort_npc_profiles.csv contains duplicate npcId "${npcId}".`);
    }
    ids.add(npcId);
    if (row.displayName === '连翘') {
      throw new Error('non_consort_npc_profiles.csv must not keep old 连翘 as a standalone NPC.');
    }
    const isRomanceable = parseBoolean(row.isRomanceable, `${npcId}.isRomanceable`);
    if (isRomanceable && (!row.bondTitle || !row.bondSceneType || !row.summary)) {
      throw new Error(`Romanceable NPC "${npcId}" must include bondTitle, bondSceneType and summary.`);
    }
    if (!row.displayName || !row.identityLabel || !row.portraitKey || !row.personality || !row.summary) {
      throw new Error(`non_consort_npc_profiles.csv npc "${npcId}" is missing required profile text.`);
    }

    return {
      npcId,
      displayName: row.displayName,
      identityLabel: row.identityLabel,
      npcKind: parseNpcKind(row.npcKind, npcId),
      gender: parseGender(row.gender, npcId),
      routeScope: parseRouteScope(row.routeScope, npcId),
      defaultLocationId: parseLocation(row.defaultLocationId, npcId),
      portraitKey: row.portraitKey,
      portraitSrc: row.portraitSrc || undefined,
      isRomanceable,
      bondTitle: row.bondTitle || undefined,
      bondSceneType: row.bondSceneType || undefined,
      initialAffinity: parseOptionalNumber(row.initialAffinity, `${npcId}.initialAffinity`) ?? 0,
      personality: row.personality,
      summary: row.summary,
      notes: row.notes || undefined,
    };
  });
};

export const nonConsortNpcProfiles: readonly NonConsortNpcProfile[] = parseProfiles();
export const nonConsortNpcById: Readonly<Record<string, NonConsortNpcProfile>> = Object.fromEntries(
  nonConsortNpcProfiles.map((profile) => [profile.npcId, profile]),
);

export const getNonConsortNpcProfile = (npcId: string): NonConsortNpcProfile | undefined => nonConsortNpcById[npcId];

export const requireNonConsortNpcProfile = (npcId: string): NonConsortNpcProfile => {
  const profile = getNonConsortNpcProfile(npcId);
  if (!profile) {
    throw new Error(`Unknown non-consort NPC "${npcId}".`);
  }
  return profile;
};

export const getRomanceableNonConsortNpcProfiles = (routeId?: RouteId): NonConsortNpcProfile[] =>
  nonConsortNpcProfiles.filter(
    (profile) => profile.isRomanceable && (!routeId || profile.routeScope === 'all' || profile.routeScope === routeId),
  );

export const getBondUnlockFlagForNpc = (npcId: string): string => `bondNpcUnlocked:${npcId}`;
