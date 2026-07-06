import { describe, expect, it } from 'vitest';

import { buildNpcPairKey, resolveNpcRelationMatrixForActivities, upsertNpcPairRelation } from './npcRelationRuntime';

describe('npcRelationRuntime', () => {
  it('uses one bidirectional pair key for two consorts', () => {
    expect(buildNpcPairKey('consort-b', 'consort-a')).toBe('consort-a|consort-b');
  });

  it('raises pair favor when an npc sends a gift', () => {
    const result = upsertNpcPairRelation({}, 'consort-a', 'consort-b', 'gift', '1-2-1');
    expect(result.relation).toMatchObject({
      pairKey: 'consort-a|consort-b',
      favor: 4,
      tension: 0,
      lastInteractionPurpose: 'gift',
    });
  });

  it('settles pressure into tension and target stress', () => {
    const result = resolveNpcRelationMatrixForActivities({}, [
      {
        id: 'activity-1',
        xunKey: '1-2-1',
        actorConsortId: 'consort-a',
        targetConsortId: 'consort-b',
        location: 'home',
        intent: 'visit-consort',
        purpose: 'pressure',
        summary: '施压',
        resolved: false,
      },
    ]);

    expect(result.matrix['consort-a|consort-b'].tension).toBe(6);
    expect(result.deltasByConsortId['consort-b']).toBe(3);
    expect(result.chronicleLines).toEqual(['施压 情分转薄，嫌隙加深。']);
  });
});
