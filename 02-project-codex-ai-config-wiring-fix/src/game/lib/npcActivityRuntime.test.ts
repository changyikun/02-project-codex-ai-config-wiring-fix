import { describe, expect, it } from 'vitest';

import { MAP_HOTSPOTS } from '../../config/palaceUi';
import { buildInitialConcubineRoster } from '../data/concubineRoster';
import type { NpcActivityState } from '../types';
import {
  generateNpcActivities,
  getNpcActivitiesAtLocation,
  getHostilePlotActivity,
  isNpcAtOwnResidence,
  getNpcVisitAtResidence,
  NPC_PUBLIC_ACTIVITY_LOCATIONS,
} from './npcActivityRuntime';

describe('npcActivityRuntime', () => {
  it('uses all public map hotspots as possible public activity locations', () => {
    const expectedLocations = MAP_HOTSPOTS.map((hotspot) => hotspot.id)
      .filter((locationId) => locationId !== '后宫' && locationId !== '椒房殿')
      .sort();

    expect([...NPC_PUBLIC_ACTIVITY_LOCATIONS].sort()).toEqual(expectedLocations);
    expect(NPC_PUBLIC_ACTIVITY_LOCATIONS).toContain('正阳门');
    expect(NPC_PUBLIC_ACTIVITY_LOCATIONS).toContain('重华宫');
    expect(NPC_PUBLIC_ACTIVITY_LOCATIONS).toContain('宫门');
    expect(NPC_PUBLIC_ACTIVITY_LOCATIONS).toContain('养心殿');
  });

  it('generates stable xun activities for the same route and xun', () => {
    const concubines = buildInitialConcubineRoster('lanyinxuguo');
    const first = generateNpcActivities({
      routeId: 'lanyinxuguo',
      xunKey: '1-2-1',
      concubines,
      customConsorts: [],
      relationMatrix: {},
    });
    const second = generateNpcActivities({
      routeId: 'lanyinxuguo',
      xunKey: '1-2-1',
      concubines,
      customConsorts: [],
      relationMatrix: {},
    });

    expect(second).toEqual(first);
  });

  it('skips cold palace and deceased consorts', () => {
    const [first, second, ...rest] = buildInitialConcubineRoster('lanyinxuguo');
    const activity = generateNpcActivities({
      routeId: 'lanyinxuguo',
      xunKey: '1-2-1',
      concubines: [
        { ...first, residence: '冷宫' },
        { ...second, status: 'deceased' },
        ...rest,
      ],
      customConsorts: [],
      relationMatrix: {},
    });

    expect(Object.values(activity.entries).some((entry) => entry.actorConsortId === first.id)).toBe(false);
    expect(Object.values(activity.entries).some((entry) => entry.actorConsortId === second.id)).toBe(false);
  });

  it('cancels the target public visit when another consort visits her residence', () => {
    const [actor, target] = buildInitialConcubineRoster('lanyinxuguo');
    let activity = generateNpcActivities({
      routeId: 'lanyinxuguo',
      xunKey: '1-2-1',
      concubines: [],
      customConsorts: [],
      relationMatrix: {},
    });
    let visit = Object.values(activity.entries).find((entry) => entry.intent === 'visit-consort');

    for (let index = 1; index <= 60 && !visit; index += 1) {
      activity = generateNpcActivities({
        routeId: 'lanyinxuguo',
        xunKey: `1-2-${index}`,
        concubines: [
          { ...actor, rivals: [target.id], stats: { ...actor.stats, ambition: 100, stress: 95 } },
          { ...target, stats: { ...target.stats, ambition: 0, stress: 0 } },
        ],
        customConsorts: [],
        relationMatrix: {},
      });
      visit = Object.values(activity.entries).find((entry) => entry.intent === 'visit-consort');
    }

    expect(visit?.targetConsortId).toBeTruthy();
    expect(getNpcVisitAtResidence(activity, visit!.targetConsortId!)?.id).toBe(visit!.id);
    expect(activity.entries[`npc-activity-${activity.xunKey}-${visit!.targetConsortId}`]).toMatchObject({
      intent: 'stay-home',
      location: 'home',
    });
  });

  it('allows at most one player visit and one visitor per residence in a xun', () => {
    const concubines = buildInitialConcubineRoster('lanyinxuguo').map((consort) => ({
      ...consort,
      stats: {
        ...consort.stats,
        ambition: 80,
        stress: 50,
      },
    }));

    for (let index = 1; index <= 80; index += 1) {
      const activity = generateNpcActivities({
        routeId: 'lanyinxuguo',
        xunKey: `1-3-${index}`,
        concubines,
        customConsorts: [],
        relationMatrix: {},
      });
      const playerVisits = Object.values(activity.entries).filter((entry) => entry.intent === 'visit-player');
      const residenceVisitTargets = Object.values(activity.entries)
        .filter((entry) => entry.intent === 'visit-consort')
        .map((entry) => entry.targetConsortId);
      expect(playerVisits.length).toBeLessThanOrEqual(1);
      expect(new Set(residenceVisitTargets).size).toBe(residenceVisitTargets.length);
    }
  });

  it('marks public visitors and residence visitors as away from their own residence', () => {
    const concubines = buildInitialConcubineRoster('lanyinxuguo');
    let activity = generateNpcActivities({
      routeId: 'lanyinxuguo',
      xunKey: '1-4-1',
      concubines,
      customConsorts: [],
      relationMatrix: {},
    });
    let awayEntry = Object.values(activity.entries).find((entry) => entry.intent === 'public-visit' || entry.intent === 'visit-consort');

    for (let index = 2; index <= 40 && !awayEntry; index += 1) {
      activity = generateNpcActivities({
        routeId: 'lanyinxuguo',
        xunKey: `1-4-${index}`,
        concubines,
        customConsorts: [],
        relationMatrix: {},
      });
      awayEntry = Object.values(activity.entries).find((entry) => entry.intent === 'public-visit' || entry.intent === 'visit-consort');
    }

    expect(awayEntry).toBeTruthy();
    expect(isNpcAtOwnResidence(activity, awayEntry!.actorConsortId)).toBe(false);
    if (awayEntry!.intent === 'visit-consort') {
      expect(isNpcAtOwnResidence(activity, awayEntry!.targetConsortId!)).toBe(true);
    }
  });

  it('treats a residence visit target as hosting even if stale activity says public visit', () => {
    const [visitor, target] = buildInitialConcubineRoster('lanyinxuguo');
    const visitEntryId = `npc-activity-1-5-1-${visitor.id}`;
    const activity: NpcActivityState = {
      xunKey: '1-5-1',
      triggeredVisitIds: [],
      entries: {
        [visitEntryId]: {
          id: visitEntryId,
          xunKey: '1-5-1',
          actorConsortId: visitor.id,
          targetConsortId: target.id,
          location: 'home',
          intent: 'visit-consort',
          purpose: 'probe',
          summary: `${visitor.name}拜访${target.name}。`,
          resolved: false,
        },
        [`npc-activity-1-5-1-${target.id}`]: {
          id: `npc-activity-1-5-1-${target.id}`,
          xunKey: '1-5-1',
          actorConsortId: target.id,
          location: '妙音堂',
          intent: 'public-visit',
          purpose: 'stroll',
          summary: `${target.name}原本要去妙音堂。`,
          resolved: false,
        },
      },
    };

    expect(isNpcAtOwnResidence(activity, target.id)).toBe(true);
    expect(isNpcAtOwnResidence(activity, visitor.id)).toBe(false);
    expect(getNpcActivitiesAtLocation(activity, '妙音堂', { includeResolved: true }).map((entry) => entry.actorConsortId)).not.toContain(
      target.id,
    );

    activity.entries[visitEntryId] = {
      ...activity.entries[visitEntryId],
      resolved: true,
    };
    expect(isNpcAtOwnResidence(activity, visitor.id)).toBe(true);
  });

  it('creates at most one hostile plot for a xun', () => {
    const concubines = buildInitialConcubineRoster('lanyinxuguo').map((consort) => ({
      ...consort,
      stats: {
        ...consort.stats,
        ambition: 100,
        stress: 100,
      },
    }));
    const activities = Array.from({ length: 60 }, (_, index) =>
      generateNpcActivities({
        routeId: 'lanyinxuguo',
        xunKey: `1-2-${index + 1}`,
        concubines,
        customConsorts: [],
        relationMatrix: {},
      }),
    );
    const activity = activities.find((candidate) => getHostilePlotActivity(candidate)) ?? activities[0];

    expect(Object.values(activity.entries).filter((entry) => entry.intent === 'hostile-plot').length).toBeLessThanOrEqual(1);
    expect(getHostilePlotActivity(activity)?.intent).toBe('hostile-plot');
  });
});
