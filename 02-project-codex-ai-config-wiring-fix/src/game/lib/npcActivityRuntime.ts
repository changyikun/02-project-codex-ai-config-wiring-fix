import type {
  ConcubineProfile,
  MapAreaId,
  NpcActivityEntry,
  NpcActivityIntent,
  NpcActivityPurpose,
  NpcActivityState,
  NpcRelationMatrix,
  RouteId,
} from '../types';
import { MAP_HOTSPOTS } from '../../config/palaceUi';
import { getNpcPairRelation } from './npcRelationRuntime';

const isNpcPublicActivityLocation = (locationId: MapAreaId | '后宫'): locationId is MapAreaId =>
  locationId !== '后宫' && locationId !== '椒房殿';

export const NPC_PUBLIC_ACTIVITY_LOCATIONS: MapAreaId[] = MAP_HOTSPOTS.map((hotspot) => hotspot.id).filter(
  isNpcPublicActivityLocation,
);

interface NpcActivityGenerationInput {
  routeId: RouteId;
  xunKey: string;
  concubines: ConcubineProfile[];
  customConsorts: ConcubineProfile[];
  relationMatrix: NpcRelationMatrix;
}

const PUBLIC_VISIT_RATE = 18;
const VISIT_PLAYER_RATE = 3;
const VISIT_CONSORT_RATE = 20;
const SOCIAL_PLOT_RATE = 15;
const HOSTILE_PLOT_GLOBAL_RATE = 10;

const purposeLabels: Record<NpcActivityPurpose, string> = {
  gift: '送礼',
  probe: '试探',
  'win-over': '拉拢',
  gossip: '传话',
  pressure: '施压',
  rest: '留宫',
  stroll: '外出',
  plot: '筹谋',
};

const hashSeed = (seed: string): number => {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value >>> 0);
};

const pickBySeed = <T>(items: T[], seed: string): T | undefined => {
  if (items.length === 0) {
    return undefined;
  }
  return items[hashSeed(seed) % items.length];
};

const isActiveNpcConsort = (consort: ConcubineProfile): boolean =>
  consort.status === 'live' && !String(consort.residence ?? '').includes('冷宫');

const formatConsort = (consort: ConcubineProfile): string => `${consort.rankLabel} ${consort.name}`;

const buildEntryId = (xunKey: string, actorId: string): string => `npc-activity-${xunKey}-${actorId}`;

const pickRelationTarget = (
  actor: ConcubineProfile,
  candidates: ConcubineProfile[],
  relationMatrix: NpcRelationMatrix,
  seed: string,
  preferTension: boolean,
): ConcubineProfile | undefined => {
  const others = candidates.filter((candidate) => candidate.id !== actor.id);
  if (others.length === 0) {
    return undefined;
  }

  const preferredIds = preferTension ? actor.rivals : actor.allies;
  const preferred = others.find(
    (candidate) =>
      preferredIds.includes(candidate.id) ||
      preferredIds.includes(candidate.name) ||
      preferredIds.includes(`${candidate.rankLabel} ${candidate.name}`),
  );
  if (preferred) {
    return preferred;
  }

  const sortedByMatrix = others
    .slice()
    .sort((left, right) => {
      const leftRelation = getNpcPairRelation(relationMatrix, actor.id, left.id);
      const rightRelation = getNpcPairRelation(relationMatrix, actor.id, right.id);
      return preferTension ? rightRelation.tension - leftRelation.tension : rightRelation.favor - leftRelation.favor;
    });
  const best = sortedByMatrix[0];
  if (best) {
    const relation = getNpcPairRelation(relationMatrix, actor.id, best.id);
    if ((preferTension && relation.tension > 0) || (!preferTension && relation.favor > 0)) {
      return best;
    }
  }

  return pickBySeed(others, seed);
};

const pickPurpose = (seed: string): NpcActivityPurpose => {
  const roll = hashSeed(seed) % 100;
  if (roll < 22) {
    return 'gift';
  }
  if (roll < 45) {
    return 'probe';
  }
  if (roll < 63) {
    return 'win-over';
  }
  if (roll < 83) {
    return 'gossip';
  }
  return 'pressure';
};

const buildSummary = (
  intent: NpcActivityIntent,
  purpose: NpcActivityPurpose,
  actor: ConcubineProfile,
  target?: ConcubineProfile,
  location?: MapAreaId | 'home' | 'player-residence',
): string => {
  const actorName = formatConsort(actor);
  const targetName = target ? formatConsort(target) : '';
  const purposeLabel = purposeLabels[purpose];

  if (intent === 'public-visit') {
    return `${actorName}本旬去了${location}，名为散心，实际也在留意宫中风向。`;
  }
  if (intent === 'visit-player') {
    return `${actorName}带着${purposeLabel}的目的来你殿中递话。`;
  }
  if (intent === 'visit-consort' && target) {
    return `${actorName}本旬到${targetName}殿中${purposeLabel}，${targetName}原本的外出安排被压下。`;
  }
  if (intent === 'social-plot' && target) {
    return `${actorName}与${targetName}私下${purposeLabel}，关系走向会在旬末收束。`;
  }
  if (intent === 'hostile-plot' && target) {
    return `${actorName}对${targetName}起了${purposeLabel}之心，可能演化为一桩宫斗案。`;
  }
  return `${actorName}本旬留在殿中。`;
};

const buildStayHomeEntry = (xunKey: string, actor: ConcubineProfile, summary?: string): NpcActivityEntry => ({
  id: buildEntryId(xunKey, actor.id),
  xunKey,
  actorConsortId: actor.id,
  location: 'home',
  intent: 'stay-home',
  purpose: 'rest',
  summary: summary ?? buildSummary('stay-home', 'rest', actor),
  resolved: false,
});

const buildHostilePlotEntry = (
  routeId: RouteId,
  xunKey: string,
  actor: ConcubineProfile,
  candidates: ConcubineProfile[],
  relationMatrix: NpcRelationMatrix,
): NpcActivityEntry | undefined => {
  const target = pickRelationTarget(actor, candidates, relationMatrix, `${routeId}:${xunKey}:${actor.id}:hostile-target`, true);
  if (!target) {
    return undefined;
  }
  return {
    id: buildEntryId(xunKey, actor.id),
    xunKey,
    actorConsortId: actor.id,
    targetConsortId: target.id,
    location: 'home',
    intent: 'hostile-plot',
    purpose: 'plot',
    summary: buildSummary('hostile-plot', 'plot', actor, target),
    resolved: false,
  };
};

const chooseHostileActor = (
  routeId: RouteId,
  xunKey: string,
  candidates: ConcubineProfile[],
  relationMatrix: NpcRelationMatrix,
): ConcubineProfile | undefined => {
  const globalRoll = hashSeed(`${routeId}:${xunKey}:npc-strife-global`) % 100;
  if (globalRoll >= HOSTILE_PLOT_GLOBAL_RATE) {
    return undefined;
  }

  return candidates
    .slice()
    .sort((left, right) => {
      const leftRelationPressure = candidates
        .filter((candidate) => candidate.id !== left.id)
        .reduce((total, candidate) => total + getNpcPairRelation(relationMatrix, left.id, candidate.id).tension, 0);
      const rightRelationPressure = candidates
        .filter((candidate) => candidate.id !== right.id)
        .reduce((total, candidate) => total + getNpcPairRelation(relationMatrix, right.id, candidate.id).tension, 0);
      const leftMotive = Number(left.stats.ambition ?? 0) + Number(left.stats.stress ?? 0) + leftRelationPressure;
      const rightMotive = Number(right.stats.ambition ?? 0) + Number(right.stats.stress ?? 0) + rightRelationPressure;
      return rightMotive - leftMotive;
    })[0];
};

export const buildInitialNpcActivityState = (): NpcActivityState => ({
  entries: {},
  triggeredVisitIds: [],
});

export const generateNpcActivities = (input: NpcActivityGenerationInput): NpcActivityState => {
  const candidates = [...input.concubines, ...input.customConsorts].filter(isActiveNpcConsort);
  const entries: Record<string, NpcActivityEntry> = {};
  const hostileActor = chooseHostileActor(input.routeId, input.xunKey, candidates, input.relationMatrix);
  let playerVisitAssigned = false;

  candidates.forEach((actor) => {
    if (hostileActor?.id === actor.id) {
      const hostileEntry = buildHostilePlotEntry(input.routeId, input.xunKey, actor, candidates, input.relationMatrix);
      entries[buildEntryId(input.xunKey, actor.id)] = hostileEntry ?? buildStayHomeEntry(input.xunKey, actor);
      return;
    }

    const seed = `${input.routeId}:${input.xunKey}:${actor.id}`;
    const roll = hashSeed(seed) % 100;
    const location = pickBySeed(NPC_PUBLIC_ACTIVITY_LOCATIONS, `${seed}:location`) ?? '妙音堂';

    if (roll < PUBLIC_VISIT_RATE) {
      entries[buildEntryId(input.xunKey, actor.id)] = {
        id: buildEntryId(input.xunKey, actor.id),
        xunKey: input.xunKey,
        actorConsortId: actor.id,
        location,
        intent: 'public-visit',
        purpose: 'stroll',
        summary: buildSummary('public-visit', 'stroll', actor, undefined, location),
        resolved: false,
      };
      return;
    }

    if (roll < PUBLIC_VISIT_RATE + VISIT_PLAYER_RATE && !playerVisitAssigned) {
      const purpose = pickPurpose(`${seed}:player-purpose`);
      playerVisitAssigned = true;
      entries[buildEntryId(input.xunKey, actor.id)] = {
        id: buildEntryId(input.xunKey, actor.id),
        xunKey: input.xunKey,
        actorConsortId: actor.id,
        location: 'player-residence',
        intent: 'visit-player',
        purpose,
        summary: buildSummary('visit-player', purpose, actor),
        resolved: false,
      };
      return;
    }

    if (roll < PUBLIC_VISIT_RATE + VISIT_PLAYER_RATE + VISIT_CONSORT_RATE) {
      const purpose = pickPurpose(`${seed}:visit-purpose`);
      const target = pickRelationTarget(actor, candidates, input.relationMatrix, `${seed}:visit-target`, purpose === 'probe' || purpose === 'pressure');
      entries[buildEntryId(input.xunKey, actor.id)] = target
        ? {
            id: buildEntryId(input.xunKey, actor.id),
            xunKey: input.xunKey,
            actorConsortId: actor.id,
            targetConsortId: target.id,
            location: 'home',
            intent: 'visit-consort',
            purpose,
            summary: buildSummary('visit-consort', purpose, actor, target),
            resolved: false,
          }
        : buildStayHomeEntry(input.xunKey, actor);
      return;
    }

    if (roll < PUBLIC_VISIT_RATE + VISIT_PLAYER_RATE + VISIT_CONSORT_RATE + SOCIAL_PLOT_RATE) {
      const purpose = pickPurpose(`${seed}:social-purpose`);
      const target = pickRelationTarget(actor, candidates, input.relationMatrix, `${seed}:social-target`, purpose === 'gossip' || purpose === 'pressure');
      entries[buildEntryId(input.xunKey, actor.id)] = target
        ? {
            id: buildEntryId(input.xunKey, actor.id),
            xunKey: input.xunKey,
            actorConsortId: actor.id,
            targetConsortId: target.id,
            location: 'home',
            intent: 'social-plot',
            purpose,
            summary: buildSummary('social-plot', purpose, actor, target),
            resolved: false,
          }
        : buildStayHomeEntry(input.xunKey, actor);
      return;
    }

    entries[buildEntryId(input.xunKey, actor.id)] = buildStayHomeEntry(input.xunKey, actor);
  });

  const acceptedResidenceVisitIds = new Set<string>();
  const hostedTargetIds = new Set<string>();
  Object.values(entries)
    .filter((entry) => entry.intent === 'visit-consort' && entry.targetConsortId)
    .sort((left, right) => left.id.localeCompare(right.id))
    .forEach((entry) => {
      if (!entry.targetConsortId || hostedTargetIds.has(entry.actorConsortId) || hostedTargetIds.has(entry.targetConsortId)) {
        const actor = candidates.find((candidate) => candidate.id === entry.actorConsortId);
        if (actor) {
          entries[entry.id] = buildStayHomeEntry(input.xunKey, actor);
        }
        return;
      }

      acceptedResidenceVisitIds.add(entry.id);
      hostedTargetIds.add(entry.targetConsortId);
    });

  Object.values(entries).forEach((entry) => {
    if (entry.intent !== 'visit-consort' || !entry.targetConsortId) {
      return;
    }
    if (!acceptedResidenceVisitIds.has(entry.id)) {
      return;
    }
    const targetEntry = entries[buildEntryId(input.xunKey, entry.targetConsortId)];
    if (!targetEntry || targetEntry.actorConsortId === entry.actorConsortId) {
      return;
    }
    const actor = candidates.find((candidate) => candidate.id === entry.actorConsortId);
    const target = candidates.find((candidate) => candidate.id === entry.targetConsortId);
    if (!actor || !target) {
      return;
    }
    entries[targetEntry.id] = {
      ...targetEntry,
      location: 'home',
      intent: 'stay-home',
      purpose: 'rest',
      summary: `${formatConsort(target)}本旬留在殿中接待${formatConsort(actor)}。`,
    };
  });

  if (!Object.values(entries).some((entry) => entry.intent === 'public-visit') && candidates.length >= 2) {
    const fallbackActor = pickBySeed(
      candidates.filter(
        (candidate) => entries[buildEntryId(input.xunKey, candidate.id)]?.intent === 'stay-home' && !hostedTargetIds.has(candidate.id),
      ),
      `${input.routeId}:${input.xunKey}:fallback-public-visit`,
    );
    const fallbackLocation = pickBySeed(NPC_PUBLIC_ACTIVITY_LOCATIONS, `${input.routeId}:${input.xunKey}:fallback-public-location`) ?? '妙音堂';
    if (fallbackActor) {
      entries[buildEntryId(input.xunKey, fallbackActor.id)] = {
        id: buildEntryId(input.xunKey, fallbackActor.id),
        xunKey: input.xunKey,
        actorConsortId: fallbackActor.id,
        location: fallbackLocation,
        intent: 'public-visit',
        purpose: 'stroll',
        summary: buildSummary('public-visit', 'stroll', fallbackActor, undefined, fallbackLocation),
        resolved: false,
      };
    }
  }

  return {
    xunKey: input.xunKey,
    entries,
    triggeredVisitIds: [],
    lastNpcStrifeXunKey: hostileActor ? input.xunKey : undefined,
  };
};

export const getNpcActivitiesAtLocation = (
  activity: NpcActivityState | undefined,
  location: MapAreaId,
  options: { includeResolved?: boolean } = {},
): NpcActivityEntry[] => {
  const entries = Object.values(activity?.entries ?? {});
  const hostedTargetIds = new Set(
    entries
      .filter((entry) => entry.intent === 'visit-consort' && entry.targetConsortId)
      .map((entry) => entry.targetConsortId as string),
  );

  return entries.filter(
    (entry) =>
      entry.intent === 'public-visit' &&
      entry.location === location &&
      !hostedTargetIds.has(entry.actorConsortId) &&
      (options.includeResolved || !entry.resolved),
  );
};

export const getNpcVisitAtResidence = (
  activity: NpcActivityState | undefined,
  residenceOwnerId: string,
  options: { includeResolved?: boolean } = {},
): NpcActivityEntry | undefined =>
  Object.values(activity?.entries ?? {}).find(
    (entry) =>
      entry.intent === 'visit-consort' &&
      entry.targetConsortId === residenceOwnerId &&
      (options.includeResolved || !entry.resolved),
  );

export const getNpcActivityForConsort = (
  activity: NpcActivityState | undefined,
  consortId: string,
): NpcActivityEntry | undefined =>
  Object.values(activity?.entries ?? {}).find((entry) => entry.actorConsortId === consortId);

export const isNpcAtOwnResidence = (activity: NpcActivityState | undefined, consortId: string): boolean => {
  if (getNpcVisitAtResidence(activity, consortId)) {
    return true;
  }

  const ownActivity = getNpcActivityForConsort(activity, consortId);
  if (!ownActivity) {
    return true;
  }
  if (ownActivity.intent === 'visit-consort' && ownActivity.resolved) {
    return true;
  }
  if (ownActivity.intent === 'public-visit' || ownActivity.intent === 'visit-player' || ownActivity.intent === 'visit-consort') {
    return false;
  }
  return true;
};

export const getPendingNpcPlayerVisit = (activity: NpcActivityState | undefined): NpcActivityEntry | undefined =>
  Object.values(activity?.entries ?? {}).find(
    (entry) =>
      entry.intent === 'visit-player' &&
      !entry.resolved &&
      !(activity?.triggeredVisitIds ?? []).includes(entry.id),
  );

export const getHostilePlotActivity = (activity: NpcActivityState | undefined): NpcActivityEntry | undefined =>
  Object.values(activity?.entries ?? {}).find((entry) => entry.intent === 'hostile-plot' && !entry.resolved);
