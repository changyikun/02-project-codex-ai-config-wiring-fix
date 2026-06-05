import { describe, expect, it } from 'vitest';
import { buildInitialConcubineRoster } from './concubineRoster';
import type { RouteId } from '../types';

const routeIds: RouteId[] = ['lanyinxuguo', 'fushengrumeng', 'yingluoyeting', 'chenyuansucuo'];

describe('buildInitialConcubineRoster', () => {
  it.each(routeIds)('为 %s 生成 12 名存活妃嫔', (routeId) => {
    const roster = buildInitialConcubineRoster(routeId);
    const liveConsorts = roster.filter((consort) => consort.status === 'live');
    const names = new Set(liveConsorts.map((consort) => consort.name));

    expect(liveConsorts).toHaveLength(12);
    expect(names.size).toBe(12);
    expect(names.has('连翘')).toBe(false);
  });
});
